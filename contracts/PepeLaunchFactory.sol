// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPancakeFactory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IPancakeRouter02 {
    function factory() external view returns (address);

    function WETH() external view returns (address);

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity);
}

contract OwnableLite {
    address public owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor(address initialOwner) {
        require(initialOwner != address(0), "owner is zero");
        owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "!owner");
        _;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "new owner is zero");
        _transferOwnership(newOwner);
    }

    function renounceOwnership() external onlyOwner {
        _renounceOwnership();
    }

    function _transferOwnership(address newOwner) internal {
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function _renounceOwnership() internal {
        emit OwnershipTransferred(owner, address(0));
        owner = address(0);
    }
}

contract PepeMemeToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory name_, string memory symbol_, uint256 totalSupply_, address receiver_) {
        require(bytes(name_).length > 0, "name empty");
        require(bytes(symbol_).length > 0, "symbol empty");
        require(totalSupply_ > 0, "supply zero");
        require(receiver_ != address(0), "receiver zero");
        name = name_;
        symbol = symbol_;
        _mint(receiver_, totalSupply_);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            require(allowed >= value, "allowance");
            allowance[from][msg.sender] = allowed - value;
            emit Approval(from, msg.sender, allowance[from][msg.sender]);
        }
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(to != address(0), "to zero");
        require(balanceOf[from] >= value, "balance");
        unchecked {
            balanceOf[from] -= value;
            balanceOf[to] += value;
        }
        emit Transfer(from, to, value);
    }

    function _mint(address to, uint256 value) internal {
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }
}

contract FairMintPool is OwnableLite {
    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    PepeMemeToken public immutable token;
    IPancakeRouter02 public immutable pancakeRouter;

    bool public start;
    bool public startWhitelist;
    bool public liquidityCreated;

    uint256 public price;
    uint256 public amountPerMint;
    uint256 public mintLimit;
    uint256 public minted;
    uint256 public whiteLimit;
    uint256 public accMintLimit;
    uint256 public accEachLimit;
    uint256 public liquidityTokenAmount;

    bool private locked;

    mapping(address => bool) public whitelist;
    mapping(address => uint256) public accMint;

    event Minted(address indexed account, uint256 units, uint256 tokenAmount, uint256 paid);
    event Refunded(address indexed account, uint256 value);
    event WhitelistUpdated(address indexed account, bool enabled);
    event Started(bool whitelistMode, bool publicMode);
    event DeadLiquidityCreated(address indexed pair, uint256 tokenAmount, uint256 bnbAmount, uint256 liquidity);
    event UnsoldSentToDead(uint256 amount);
    event DustBnbSentToDead(uint256 amount);

    struct MintParams {
        uint256 price;
        uint256 amountPerMint;
        uint256 mintLimit;
        uint256 whiteLimit;
        uint256 accMintLimit;
        uint256 accEachLimit;
        uint256 liquidityTokenAmount;
        bool startWhitelist;
        bool startPublic;
        bool renounceOwnerAfterCreate;
    }

    modifier nonReentrant() {
        require(!locked, "locked");
        locked = true;
        _;
        locked = false;
    }

    constructor(
        address owner_,
        address token_,
        address router_,
        MintParams memory params,
        address[] memory initialWhitelist
    ) OwnableLite(owner_) {
        require(token_ != address(0), "token zero");
        require(router_ != address(0), "router zero");
        require(params.price > 0, "price zero");
        require(params.amountPerMint > 0, "amount zero");
        require(params.mintLimit > 0, "limit zero");
        token = PepeMemeToken(token_);
        pancakeRouter = IPancakeRouter02(router_);
        price = params.price;
        amountPerMint = params.amountPerMint;
        mintLimit = params.mintLimit;
        whiteLimit = params.whiteLimit;
        accMintLimit = params.accMintLimit;
        accEachLimit = params.accEachLimit == 0 ? 1 : params.accEachLimit;
        liquidityTokenAmount = params.liquidityTokenAmount;
        startWhitelist = params.startWhitelist;
        start = params.startPublic;

        for (uint256 i = 0; i < initialWhitelist.length; i++) {
            whitelist[initialWhitelist[i]] = true;
            emit WhitelistUpdated(initialWhitelist[i], true);
        }

        emit Started(startWhitelist, start);

        if (params.renounceOwnerAfterCreate) {
            _renounceOwnership();
        }
    }

    receive() external payable {
        mint();
    }

    function mint() public payable nonReentrant {
        bool whitelistMint = startWhitelist && whitelist[msg.sender];
        require(start || whitelistMint, "not started");
        require(msg.sender == tx.origin, "no contract");
        require(msg.value >= price, "value low");

        uint256 units = msg.value / price;
        if (units > accEachLimit) units = accEachLimit;
        require(units > 0, "units zero");

        uint256 paid = units * price;
        uint256 refund = msg.value - paid;
        uint256 nextAccountMint = accMint[msg.sender] + units;

        require(minted + units <= mintLimit, "sold out");
        if (!start && whiteLimit > 0) {
            require(minted + units <= whiteLimit, "whitelist sold out");
        }
        if (accMintLimit > 0) {
            require(nextAccountMint <= accMintLimit, "wallet limit");
        }

        minted += units;
        accMint[msg.sender] = nextAccountMint;

        uint256 tokenAmount = units * amountPerMint;
        require(token.transfer(msg.sender, tokenAmount), "token transfer");

        emit Minted(msg.sender, units, tokenAmount, paid);

        if (refund > 0) {
            _sendValue(payable(msg.sender), refund, "refund send");
            emit Refunded(msg.sender, refund);
        }

        if (minted == mintLimit && !liquidityCreated && liquidityTokenAmount > 0 && address(this).balance > 0) {
            _createDeadLiquidity(0, 0, block.timestamp);
        }
    }

    function setWhitelist(address[] calldata accounts, bool enabled) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            whitelist[accounts[i]] = enabled;
            emit WhitelistUpdated(accounts[i], enabled);
        }
    }

    function startWhitelistMint() external onlyOwner {
        require(!startWhitelist, "whitelist started");
        startWhitelist = true;
        emit Started(startWhitelist, start);
    }

    function startPublicMint() external onlyOwner {
        require(!start, "public started");
        start = true;
        emit Started(startWhitelist, start);
    }

    function setMintParams(
        uint256 price_,
        uint256 amountPerMint_,
        uint256 mintLimit_,
        uint256 whiteLimit_,
        uint256 accMintLimit_,
        uint256 accEachLimit_
    ) external onlyOwner {
        require(!start, "started");
        require(price_ > 0, "price zero");
        require(amountPerMint_ > 0, "amount zero");
        require(mintLimit_ >= minted, "below minted");
        price = price_;
        amountPerMint = amountPerMint_;
        mintLimit = mintLimit_;
        whiteLimit = whiteLimit_;
        accMintLimit = accMintLimit_;
        accEachLimit = accEachLimit_ == 0 ? 1 : accEachLimit_;
    }

    function graduateToDeadLiquidity(uint256 amountTokenMin, uint256 amountBnbMin, uint256 deadline) external onlyOwner nonReentrant {
        _createDeadLiquidity(amountTokenMin, amountBnbMin, deadline);
    }

    function sendUnsoldToDead(uint256 amount) external onlyOwner {
        require(amount > 0, "amount zero");
        require(token.transfer(DEAD_ADDRESS, amount), "dead transfer");
        emit UnsoldSentToDead(amount);
    }

    function _createDeadLiquidity(uint256 amountTokenMin, uint256 amountBnbMin, uint256 deadline) internal {
        require(!liquidityCreated, "liquidity created");
        uint256 tokenAmount = liquidityTokenAmount;
        uint256 bnbAmount = address(this).balance;
        require(tokenAmount > 0, "token zero");
        require(bnbAmount > 0, "bnb zero");
        require(token.balanceOf(address(this)) >= tokenAmount, "token balance");

        liquidityCreated = true;
        require(token.approve(address(pancakeRouter), tokenAmount), "approve router");
        (uint256 usedToken, uint256 usedBnb, uint256 liquidity) = pancakeRouter.addLiquidityETH{value: bnbAmount}(
            address(token),
            tokenAmount,
            amountTokenMin,
            amountBnbMin,
            DEAD_ADDRESS,
            deadline == 0 ? block.timestamp : deadline
        );
        address pair = IPancakeFactory(pancakeRouter.factory()).getPair(address(token), pancakeRouter.WETH());
        emit DeadLiquidityCreated(pair, usedToken, usedBnb, liquidity);

        uint256 remainingToken = token.balanceOf(address(this));
        if (remainingToken > 0) {
            require(token.transfer(DEAD_ADDRESS, remainingToken), "dead token");
            emit UnsoldSentToDead(remainingToken);
        }

        uint256 remainingBnb = address(this).balance;
        if (remainingBnb > 0) {
            _sendValue(payable(DEAD_ADDRESS), remainingBnb, "dead bnb");
            emit DustBnbSentToDead(remainingBnb);
        }
    }

    function _sendValue(address payable to, uint256 value, string memory errorMessage) internal {
        (bool sent, ) = to.call{value: value}("");
        require(sent, errorMessage);
    }
}

contract PepeLaunchFactory is OwnableLite {
    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    IPancakeRouter02 public immutable pancakeRouter;
    address payable public feeReceiver;
    uint256 public creationFee;

    struct TokenParams {
        string name;
        string symbol;
        uint256 totalSupply;
        address receiver;
    }

    struct LiquidityParams {
        uint256 tokenAmount;
        uint256 bnbAmount;
        uint256 minTokenAmount;
        uint256 minBnbAmount;
        uint256 deadline;
        bool enabled;
    }

    event FeeReceiverUpdated(address indexed feeReceiver);
    event CreationFeeUpdated(uint256 creationFee);
    event TokenCreated(
        address indexed creator,
        address indexed token,
        address indexed pair,
        uint256 deadLiquidity,
        string metadataURI
    );
    event FairMintLaunchCreated(
        address indexed creator,
        address indexed token,
        address indexed pool,
        string metadataURI
    );
    event DeadLiquidityCreated(address indexed token, address indexed pair, uint256 tokenAmount, uint256 bnbAmount, uint256 liquidity);

    constructor(address payable feeReceiver_, uint256 creationFee_, address router_) OwnableLite(msg.sender) {
        require(feeReceiver_ != address(0), "fee receiver zero");
        require(router_ != address(0), "router zero");
        feeReceiver = feeReceiver_;
        creationFee = creationFee_;
        pancakeRouter = IPancakeRouter02(router_);
    }

    receive() external payable {}

    function createFixedSupplyToken(
        TokenParams calldata tokenParams,
        LiquidityParams calldata liquidityParams,
        string calldata metadataURI
    ) external payable returns (address token, address pair, uint256 liquidity) {
        uint256 liquidityBnb = liquidityParams.enabled ? liquidityParams.bnbAmount : 0;
        uint256 usableValue = _collectFee(liquidityBnb);
        address receiver = tokenParams.receiver == address(0) ? msg.sender : tokenParams.receiver;
        address tokenReceiver = liquidityParams.enabled ? address(this) : receiver;
        token = address(new PepeMemeToken(tokenParams.name, tokenParams.symbol, tokenParams.totalSupply, tokenReceiver));

        if (liquidityParams.enabled) {
            require(liquidityParams.tokenAmount > 0, "lp token zero");
            require(liquidityParams.bnbAmount > 0, "lp bnb zero");
            require(PepeMemeToken(token).balanceOf(address(this)) >= liquidityParams.tokenAmount, "lp token balance");

            uint256 usedBnb;
            (pair, liquidity, usedBnb) = _addDeadLiquidity(token, liquidityParams);

            uint256 remainingValue = usableValue - usedBnb;
            if (remainingValue > 0) {
                _sendValue(payable(msg.sender), remainingValue, "refund send");
            }

            uint256 remainingToken = PepeMemeToken(token).balanceOf(address(this));
            if (remainingToken > 0) {
                require(PepeMemeToken(token).transfer(receiver, remainingToken), "receiver transfer");
            }
        } else if (usableValue > 0) {
            _sendValue(payable(msg.sender), usableValue, "refund send");
        }

        emit TokenCreated(msg.sender, token, pair, liquidity, metadataURI);
    }

    function createFairMintLaunch(
        TokenParams calldata tokenParams,
        FairMintPool.MintParams calldata mintParams,
        address[] calldata initialWhitelist,
        string calldata metadataURI
    ) external payable returns (address token, address pool) {
        uint256 usableValue = _collectFee(0);
        if (usableValue > 0) {
            _sendValue(payable(msg.sender), usableValue, "refund send");
        }

        require(mintParams.mintLimit > 0, "limit zero");
        uint256 saleSupply = mintParams.amountPerMint * mintParams.mintLimit;
        uint256 requiredSupply = saleSupply + mintParams.liquidityTokenAmount;
        require(tokenParams.totalSupply >= requiredSupply, "supply below launch");

        token = address(new PepeMemeToken(tokenParams.name, tokenParams.symbol, tokenParams.totalSupply, address(this)));
        pool = address(new FairMintPool(msg.sender, token, address(pancakeRouter), mintParams, initialWhitelist));

        require(PepeMemeToken(token).transfer(pool, requiredSupply), "pool transfer");
        uint256 remaining = PepeMemeToken(token).balanceOf(address(this));
        if (remaining > 0) {
            address receiver = tokenParams.receiver == address(0) ? msg.sender : tokenParams.receiver;
            require(PepeMemeToken(token).transfer(receiver, remaining), "remainder transfer");
        }

        emit FairMintLaunchCreated(msg.sender, token, pool, metadataURI);
    }

    function setFeeReceiver(address payable feeReceiver_) external onlyOwner {
        require(feeReceiver_ != address(0), "fee receiver zero");
        feeReceiver = feeReceiver_;
        emit FeeReceiverUpdated(feeReceiver_);
    }

    function setCreationFee(uint256 creationFee_) external onlyOwner {
        creationFee = creationFee_;
        emit CreationFeeUpdated(creationFee_);
    }

    function _addDeadLiquidity(address token, LiquidityParams calldata liquidityParams)
        internal
        returns (address pair, uint256 liquidity, uint256 usedBnb)
    {
        require(PepeMemeToken(token).approve(address(pancakeRouter), liquidityParams.tokenAmount), "approve router");
        (uint256 usedToken, uint256 amountBnb, uint256 lpAmount) = pancakeRouter.addLiquidityETH{value: liquidityParams.bnbAmount}(
            token,
            liquidityParams.tokenAmount,
            liquidityParams.minTokenAmount,
            liquidityParams.minBnbAmount,
            DEAD_ADDRESS,
            liquidityParams.deadline == 0 ? block.timestamp + 1800 : liquidityParams.deadline
        );
        pair = IPancakeFactory(pancakeRouter.factory()).getPair(token, pancakeRouter.WETH());
        emit DeadLiquidityCreated(token, pair, usedToken, amountBnb, lpAmount);
        return (pair, lpAmount, amountBnb);
    }

    function _collectFee(uint256 requiredExtraValue) internal returns (uint256 usableValue) {
        require(msg.value >= creationFee + requiredExtraValue, "fee low");
        if (creationFee > 0) {
            _sendValue(feeReceiver, creationFee, "fee send");
        }
        return msg.value - creationFee;
    }

    function _sendValue(address payable to, uint256 value, string memory errorMessage) internal {
        (bool sent, ) = to.call{value: value}("");
        require(sent, errorMessage);
    }
}
