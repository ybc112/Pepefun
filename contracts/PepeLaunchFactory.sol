// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPancakeFactory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IERC20Lite {
    function balanceOf(address account) external view returns (uint256);

    function transfer(address to, uint256 value) external returns (bool);

    function transferFrom(address from, address to, uint256 value) external returns (bool);
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

    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;
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

contract DividendMemeToken is OwnableLite {
    uint256 private constant MAGNITUDE = 2 ** 128;
    uint16 public constant MAX_FEE_BPS = 1000;
    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;

    IPancakeRouter02 public immutable pancakeRouter;
    IERC20Lite public immutable rewardToken;
    address public feeReceiver;
    address public pair;

    uint16 public buyFeeBps;
    uint16 public sellFeeBps;
    bool private swapping;

    uint256 public magnifiedDividendPerShare;
    uint256 public totalDividendShares;
    uint256 public totalRewardsDistributed;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => bool) public excludedFromFees;
    mapping(address => bool) public excludedFromDividends;
    mapping(address => uint256) public dividendShares;
    mapping(address => int256) public magnifiedDividendCorrections;
    mapping(address => uint256) public withdrawnDividends;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event FeesUpdated(uint16 buyFeeBps, uint16 sellFeeBps);
    event PairUpdated(address indexed pair);
    event FeeReceiverUpdated(address indexed feeReceiver);
    event ExcludedFromFees(address indexed account, bool excluded);
    event ExcludedFromDividends(address indexed account, bool excluded);
    event RewardsDeposited(address indexed from, uint256 amount);
    event RewardsClaimed(address indexed account, uint256 amount);
    event FeesSwappedToRewards(uint256 tokenAmount, uint256 rewardAmount);

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_,
        address receiver_,
        address owner_,
        address router_,
        address rewardToken_,
        address feeReceiver_,
        uint16 buyFeeBps_,
        uint16 sellFeeBps_
    ) OwnableLite(owner_) {
        require(bytes(name_).length > 0, "name empty");
        require(bytes(symbol_).length > 0, "symbol empty");
        require(totalSupply_ > 0, "supply zero");
        require(receiver_ != address(0), "receiver zero");
        require(router_ != address(0), "router zero");
        require(rewardToken_ != address(0), "reward zero");
        require(feeReceiver_ != address(0), "fee receiver zero");
        require(buyFeeBps_ <= MAX_FEE_BPS && sellFeeBps_ <= MAX_FEE_BPS, "fee high");

        name = name_;
        symbol = symbol_;
        pancakeRouter = IPancakeRouter02(router_);
        rewardToken = IERC20Lite(rewardToken_);
        feeReceiver = feeReceiver_;
        buyFeeBps = buyFeeBps_;
        sellFeeBps = sellFeeBps_;

        excludedFromFees[owner_] = true;
        excludedFromFees[address(this)] = true;
        excludedFromFees[feeReceiver_] = true;

        _setExcludedFromDividends(address(this), true);
        _setExcludedFromDividends(owner_, true);
        _setExcludedFromDividends(DEAD_ADDRESS, true);
        _setExcludedFromDividends(feeReceiver_, true);

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

    function setPair(address pair_) external onlyOwner {
        require(pair_ != address(0), "pair zero");
        pair = pair_;
        _setExcludedFromDividends(pair_, true);
        emit PairUpdated(pair_);
    }

    function setFees(uint16 buyFeeBps_, uint16 sellFeeBps_) external onlyOwner {
        require(buyFeeBps_ <= MAX_FEE_BPS && sellFeeBps_ <= MAX_FEE_BPS, "fee high");
        buyFeeBps = buyFeeBps_;
        sellFeeBps = sellFeeBps_;
        emit FeesUpdated(buyFeeBps_, sellFeeBps_);
    }

    function setFeeReceiver(address feeReceiver_) external onlyOwner {
        require(feeReceiver_ != address(0), "fee receiver zero");
        feeReceiver = feeReceiver_;
        excludedFromFees[feeReceiver_] = true;
        _setExcludedFromDividends(feeReceiver_, true);
        emit FeeReceiverUpdated(feeReceiver_);
    }

    function setExcludedFromFees(address account, bool excluded) external onlyOwner {
        excludedFromFees[account] = excluded;
        emit ExcludedFromFees(account, excluded);
    }

    function setExcludedFromDividends(address account, bool excluded) external onlyOwner {
        _setExcludedFromDividends(account, excluded);
        emit ExcludedFromDividends(account, excluded);
    }

    function depositRewards(uint256 amount) external {
        require(amount > 0, "amount zero");
        uint256 beforeBalance = rewardToken.balanceOf(address(this));
        require(rewardToken.transferFrom(msg.sender, address(this), amount), "reward transfer");
        uint256 received = rewardToken.balanceOf(address(this)) - beforeBalance;
        _distributeRewards(received);
        emit RewardsDeposited(msg.sender, received);
    }

    function swapFeesToRewards(uint256 tokenAmount, uint256 amountOutMin, uint256 deadline) external {
        require(tokenAmount > 0, "amount zero");
        require(balanceOf[address(this)] >= tokenAmount, "fee balance");
        address reward = address(rewardToken);
        require(reward != address(this), "same token");

        address[] memory path = new address[](3);
        path[0] = address(this);
        path[1] = pancakeRouter.WETH();
        path[2] = reward;

        swapping = true;
        allowance[address(this)][address(pancakeRouter)] = tokenAmount;
        emit Approval(address(this), address(pancakeRouter), tokenAmount);
        uint256 beforeBalance = rewardToken.balanceOf(address(this));
        pancakeRouter.swapExactTokensForTokensSupportingFeeOnTransferTokens(
            tokenAmount,
            amountOutMin,
            path,
            address(this),
            deadline == 0 ? block.timestamp + 1800 : deadline
        );
        swapping = false;

        uint256 rewardAmount = rewardToken.balanceOf(address(this)) - beforeBalance;
        _distributeRewards(rewardAmount);
        emit FeesSwappedToRewards(tokenAmount, rewardAmount);
    }

    function claimRewards() external {
        uint256 withdrawable = withdrawableDividendOf(msg.sender);
        require(withdrawable > 0, "no rewards");
        withdrawnDividends[msg.sender] += withdrawable;
        require(rewardToken.transfer(msg.sender, withdrawable), "reward send");
        emit RewardsClaimed(msg.sender, withdrawable);
    }

    function withdrawableDividendOf(address account) public view returns (uint256) {
        return accumulativeDividendOf(account) - withdrawnDividends[account];
    }

    function accumulativeDividendOf(address account) public view returns (uint256) {
        int256 corrected = int256(magnifiedDividendPerShare * dividendShares[account]) + magnifiedDividendCorrections[account];
        if (corrected <= 0) return 0;
        return uint256(corrected) / MAGNITUDE;
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(to != address(0), "to zero");
        require(balanceOf[from] >= value, "balance");

        uint256 fee;
        if (!swapping && !excludedFromFees[from] && !excludedFromFees[to] && pair != address(0)) {
            if (from == pair && buyFeeBps > 0) {
                fee = (value * buyFeeBps) / 10000;
            } else if (to == pair && sellFeeBps > 0) {
                fee = (value * sellFeeBps) / 10000;
            }
        }

        uint256 receiveAmount = value - fee;
        unchecked {
            balanceOf[from] -= value;
            balanceOf[to] += receiveAmount;
        }
        emit Transfer(from, to, receiveAmount);

        if (fee > 0) {
            balanceOf[address(this)] += fee;
            emit Transfer(from, address(this), fee);
        }

        _syncDividendShare(from);
        _syncDividendShare(to);
        if (fee > 0) _syncDividendShare(address(this));
    }

    function _mint(address to, uint256 value) internal {
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
        _syncDividendShare(to);
    }

    function _distributeRewards(uint256 amount) internal {
        require(amount > 0, "reward zero");
        require(totalDividendShares > 0, "no holders");
        magnifiedDividendPerShare += (amount * MAGNITUDE) / totalDividendShares;
        totalRewardsDistributed += amount;
    }

    function _setExcludedFromDividends(address account, bool excluded) internal {
        excludedFromDividends[account] = excluded;
        _syncDividendShare(account);
    }

    function _syncDividendShare(address account) internal {
        uint256 nextShare = excludedFromDividends[account] ? 0 : balanceOf[account];
        uint256 currentShare = dividendShares[account];
        if (nextShare == currentShare) return;

        if (nextShare > currentShare) {
            uint256 increase = nextShare - currentShare;
            totalDividendShares += increase;
            magnifiedDividendCorrections[account] -= int256(magnifiedDividendPerShare * increase);
        } else {
            uint256 decrease = currentShare - nextShare;
            totalDividendShares -= decrease;
            magnifiedDividendCorrections[account] += int256(magnifiedDividendPerShare * decrease);
        }
        dividendShares[account] = nextShare;
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
    address public defaultRewardToken;
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

    struct DividendParams {
        address rewardToken;
        address feeReceiver;
        uint16 buyFeeBps;
        uint16 sellFeeBps;
        bool renounceOwnerAfterCreate;
    }

    event FeeReceiverUpdated(address indexed feeReceiver);
    event DefaultRewardTokenUpdated(address indexed defaultRewardToken);
    event CreationFeeUpdated(uint256 creationFee);
    event TokenCreated(
        address indexed creator,
        address indexed token,
        address indexed pair,
        uint256 deadLiquidity,
        string metadataURI
    );
    event DividendTokenCreated(
        address indexed creator,
        address indexed token,
        address indexed pair,
        address rewardToken,
        uint256 deadLiquidity,
        string metadataURI
    );
    event DeadLiquidityCreated(address indexed token, address indexed pair, uint256 tokenAmount, uint256 bnbAmount, uint256 liquidity);

    constructor(address payable feeReceiver_, uint256 creationFee_, address router_, address defaultRewardToken_) OwnableLite(msg.sender) {
        require(feeReceiver_ != address(0), "fee receiver zero");
        require(router_ != address(0), "router zero");
        require(defaultRewardToken_ != address(0), "reward zero");
        feeReceiver = feeReceiver_;
        creationFee = creationFee_;
        pancakeRouter = IPancakeRouter02(router_);
        defaultRewardToken = defaultRewardToken_;
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

    function createDividendToken(
        TokenParams calldata tokenParams,
        LiquidityParams calldata liquidityParams,
        DividendParams calldata dividendParams,
        string calldata metadataURI
    ) external payable returns (address token, address pair, uint256 liquidity) {
        require(liquidityParams.enabled, "lp required");
        uint256 liquidityBnb = liquidityParams.bnbAmount;
        uint256 usableValue = _collectFee(liquidityBnb);
        address receiver = tokenParams.receiver == address(0) ? msg.sender : tokenParams.receiver;
        address rewardToken = dividendParams.rewardToken == address(0) ? defaultRewardToken : dividendParams.rewardToken;
        address dividendFeeReceiver = dividendParams.feeReceiver == address(0) ? feeReceiver : dividendParams.feeReceiver;

        token = address(
            new DividendMemeToken(
                tokenParams.name,
                tokenParams.symbol,
                tokenParams.totalSupply,
                address(this),
                address(this),
                address(pancakeRouter),
                rewardToken,
                dividendFeeReceiver,
                dividendParams.buyFeeBps,
                dividendParams.sellFeeBps
            )
        );

        require(liquidityParams.tokenAmount > 0, "lp token zero");
        require(liquidityParams.bnbAmount > 0, "lp bnb zero");
        require(DividendMemeToken(token).balanceOf(address(this)) >= liquidityParams.tokenAmount, "lp token balance");

        uint256 usedBnb;
        (pair, liquidity, usedBnb) = _addDeadLiquidity(token, liquidityParams);
        DividendMemeToken(token).setPair(pair);

        uint256 remainingValue = usableValue - usedBnb;
        if (remainingValue > 0) {
            _sendValue(payable(msg.sender), remainingValue, "refund send");
        }

        uint256 remainingToken = DividendMemeToken(token).balanceOf(address(this));
        if (remainingToken > 0) {
            require(DividendMemeToken(token).transfer(receiver, remainingToken), "receiver transfer");
        }

        if (dividendParams.renounceOwnerAfterCreate) {
            DividendMemeToken(token).renounceOwnership();
        } else {
            DividendMemeToken(token).transferOwnership(msg.sender);
        }

        emit DividendTokenCreated(msg.sender, token, pair, rewardToken, liquidity, metadataURI);
    }

    function setFeeReceiver(address payable feeReceiver_) external onlyOwner {
        require(feeReceiver_ != address(0), "fee receiver zero");
        feeReceiver = feeReceiver_;
        emit FeeReceiverUpdated(feeReceiver_);
    }

    function setDefaultRewardToken(address defaultRewardToken_) external onlyOwner {
        require(defaultRewardToken_ != address(0), "reward zero");
        defaultRewardToken = defaultRewardToken_;
        emit DefaultRewardTokenUpdated(defaultRewardToken_);
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
