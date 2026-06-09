// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPancakeFactory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IERC20Lite {
    function balanceOf(address account) external view returns (uint256);

    function approve(address spender, uint256 value) external returns (bool);

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
        require(initialOwner != address(0));
        owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0));
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
        require(bytes(name_).length > 0);
        require(bytes(symbol_).length > 0);
        require(totalSupply_ > 0);
        require(receiver_ != address(0));
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
            require(allowed >= value);
            allowance[from][msg.sender] = allowed - value;
            emit Approval(from, msg.sender, allowance[from][msg.sender]);
        }
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(to != address(0));
        require(balanceOf[from] >= value);
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
        require(bytes(name_).length > 0);
        require(bytes(symbol_).length > 0);
        require(totalSupply_ > 0);
        require(receiver_ != address(0));
        require(router_ != address(0));
        require(rewardToken_ != address(0));
        require(feeReceiver_ != address(0));
        require(buyFeeBps_ <= MAX_FEE_BPS && sellFeeBps_ <= MAX_FEE_BPS);

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
            require(allowed >= value);
            allowance[from][msg.sender] = allowed - value;
            emit Approval(from, msg.sender, allowance[from][msg.sender]);
        }
        _transfer(from, to, value);
        return true;
    }

    function setPair(address pair_) external onlyOwner {
        require(pair_ != address(0));
        pair = pair_;
        _setExcludedFromDividends(pair_, true);
        emit PairUpdated(pair_);
    }

    function setFees(uint16 buyFeeBps_, uint16 sellFeeBps_) external onlyOwner {
        require(buyFeeBps_ <= MAX_FEE_BPS && sellFeeBps_ <= MAX_FEE_BPS);
        buyFeeBps = buyFeeBps_;
        sellFeeBps = sellFeeBps_;
        emit FeesUpdated(buyFeeBps_, sellFeeBps_);
    }

    function setFeeReceiver(address feeReceiver_) external onlyOwner {
        require(feeReceiver_ != address(0));
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
        require(amount > 0);
        uint256 beforeBalance = rewardToken.balanceOf(address(this));
        require(rewardToken.transferFrom(msg.sender, address(this), amount));
        uint256 received = rewardToken.balanceOf(address(this)) - beforeBalance;
        _distributeRewards(received);
        emit RewardsDeposited(msg.sender, received);
    }

    function swapFeesToRewards(uint256 tokenAmount, uint256 amountOutMin, uint256 deadline) external {
        require(tokenAmount > 0);
        require(balanceOf[address(this)] >= tokenAmount);
        address reward = address(rewardToken);
        require(reward != address(this));

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
        require(withdrawable > 0);
        withdrawnDividends[msg.sender] += withdrawable;
        require(rewardToken.transfer(msg.sender, withdrawable));
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
        require(to != address(0));
        require(balanceOf[from] >= value);

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
        require(amount > 0);
        require(totalDividendShares > 0);
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
        require(!locked);
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
        require(token_ != address(0));
        require(router_ != address(0));
        require(params.price > 0);
        require(params.amountPerMint > 0);
        require(params.mintLimit > 0);
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
        require(start || whitelistMint);
        require(msg.sender == tx.origin);
        require(msg.value >= price);

        uint256 units = msg.value / price;
        if (units > accEachLimit) units = accEachLimit;
        require(units > 0);

        uint256 paid = units * price;
        uint256 refund = msg.value - paid;
        uint256 nextAccountMint = accMint[msg.sender] + units;

        require(minted + units <= mintLimit);
        if (!start && whiteLimit > 0) {
            require(minted + units <= whiteLimit);
        }
        if (accMintLimit > 0) {
            require(nextAccountMint <= accMintLimit);
        }

        minted += units;
        accMint[msg.sender] = nextAccountMint;

        uint256 tokenAmount = units * amountPerMint;
        require(token.transfer(msg.sender, tokenAmount));

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
        require(!startWhitelist);
        startWhitelist = true;
        emit Started(startWhitelist, start);
    }

    function startPublicMint() external onlyOwner {
        require(!start);
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
        require(!start);
        require(price_ > 0);
        require(amountPerMint_ > 0);
        require(mintLimit_ >= minted);
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
        require(amount > 0);
        require(token.transfer(DEAD_ADDRESS, amount));
        emit UnsoldSentToDead(amount);
    }

    function _createDeadLiquidity(uint256 amountTokenMin, uint256 amountBnbMin, uint256 deadline) internal {
        require(!liquidityCreated);
        uint256 tokenAmount = liquidityTokenAmount;
        uint256 bnbAmount = address(this).balance;
        require(tokenAmount > 0);
        require(bnbAmount > 0);
        require(token.balanceOf(address(this)) >= tokenAmount);

        liquidityCreated = true;
        require(token.approve(address(pancakeRouter), tokenAmount));
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
            require(token.transfer(DEAD_ADDRESS, remainingToken));
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
    uint8 public constant TEMPLATE_KIND_FIXED = 1;
    uint8 public constant TEMPLATE_KIND_DIVIDEND = 2;

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

    struct DeployOptions {
        uint8 templateId;
        bytes32 salt;
        uint160 requiredSuffix;
        uint8 suffixLength;
        bool enforceSuffix;
    }

    struct GenericDeployOptions {
        uint8 templateId;
        address receiver;
        uint160 requiredSuffix;
        uint8 suffixLength;
        bool enforceSuffix;
    }

    struct TemplateInfo {
        uint8 templateId;
        uint8 kind;
        bool enabled;
        bool requiresLiquidity;
        bool supportsDividends;
        bytes32 label;
    }

    struct DeploymentInfo {
        address creator;
        address token;
        address pair;
        uint8 templateId;
        bytes32 salt;
        uint256 valuePaid;
        uint256 liquidity;
        uint64 blockNumber;
        uint64 createdAt;
        bytes32 metadataHash;
    }

    mapping(uint8 => TemplateInfo) private templateById;
    uint8[] private templateIds;
    mapping(bytes32 => bool) public approvedTokenCodeHash;
    DeploymentInfo[] private deployments;
    address[] private launchedTokens;
    mapping(address => address[]) private creatorTokens;
    mapping(address => DeploymentInfo) private deploymentByToken;

    event FeeReceiverUpdated(address indexed feeReceiver);
    event DefaultRewardTokenUpdated(address indexed defaultRewardToken);
    event CreationFeeUpdated(uint256 creationFee);
    event TemplateUpdated(uint8 indexed templateId, uint8 kind, bool enabled, bool requiresLiquidity, bool supportsDividends, bytes32 label);
    event TokenCodeHashApprovalUpdated(bytes32 indexed codeHash, bool approved);
    event TokenDeployed(
        address indexed creator,
        address indexed token,
        address indexed pair,
        uint8 templateId,
        bytes32 salt,
        uint256 valuePaid,
        uint256 liquidity,
        bytes32 metadataHash
    );
    event DeadLiquidityCreated(address indexed token, address indexed pair, uint256 tokenAmount, uint256 bnbAmount, uint256 liquidity);

    constructor(address payable feeReceiver_, uint256 creationFee_, address router_, address defaultRewardToken_) OwnableLite(msg.sender) {
        require(feeReceiver_ != address(0));
        require(router_ != address(0));
        require(defaultRewardToken_ != address(0));
        feeReceiver = feeReceiver_;
        creationFee = creationFee_;
        pancakeRouter = IPancakeRouter02(router_);
        defaultRewardToken = defaultRewardToken_;

        _setTemplate(1, TEMPLATE_KIND_FIXED, true, false, false, bytes32("Standard BEP20"));
        _setTemplate(2, TEMPLATE_KIND_FIXED, true, false, false, bytes32("Zero Tax"));
        _setTemplate(3, TEMPLATE_KIND_FIXED, true, true, false, bytes32("Blackhole LP"));
        _setTemplate(4, TEMPLATE_KIND_FIXED, true, false, false, bytes32("No Owner"));
        _setTemplate(10, TEMPLATE_KIND_DIVIDEND, true, true, true, bytes32("Platform Dividend"));
    }

    receive() external payable {}

    function deployFromTemplate(
        TokenParams calldata tokenParams,
        LiquidityParams calldata liquidityParams,
        DividendParams calldata dividendParams,
        DeployOptions calldata options,
        bytes32 metadataHash
    ) external payable returns (address token, address pair, uint256 liquidity) {
        TemplateInfo storage template = templateById[options.templateId];
        require(template.enabled);
        if (template.requiresLiquidity) require(liquidityParams.enabled);

        if (template.kind == TEMPLATE_KIND_FIXED) {
            (token, pair, liquidity) = _deployFixedTemplate(tokenParams, liquidityParams, options, metadataHash);
        } else if (template.kind == TEMPLATE_KIND_DIVIDEND) {
            (token, pair, liquidity) = _deployDividendTemplate(tokenParams, liquidityParams, dividendParams, options, metadataHash);
        } else {
            revert();
        }
    }

    function deployToken(
        bytes32 salt,
        bytes calldata tokenCreationCode,
        LiquidityParams calldata liquidityParams,
        GenericDeployOptions calldata options,
        bytes32 metadataHash
    ) external payable returns (address token, address pair, uint256 liquidity) {
        TemplateInfo storage template = templateById[options.templateId];
        require(template.enabled);
        require(approvedTokenCodeHash[keccak256(tokenCreationCode)]);
        if (template.requiresLiquidity) require(liquidityParams.enabled);

        uint256 requiredBnb = liquidityParams.enabled ? liquidityParams.bnbAmount : 0;
        uint256 usableValue = _collectFee(requiredBnb);
        bytes32 create2Salt = _saltFor(msg.sender, salt);
        address predicted = _predictCreate2(create2Salt, keccak256(tokenCreationCode));
        _checkSuffix(predicted, options.requiredSuffix, options.suffixLength, options.enforceSuffix);

        token = _deployCreate2(create2Salt, tokenCreationCode);
        if (liquidityParams.enabled) {
            require(liquidityParams.tokenAmount > 0);
            require(liquidityParams.bnbAmount > 0);
            require(IERC20Lite(token).balanceOf(address(this)) >= liquidityParams.tokenAmount);
            uint256 usedBnb;
            (pair, liquidity, usedBnb) = _addDeadLiquidity(token, liquidityParams);
            usableValue -= usedBnb;
        }

        address receiver = options.receiver == address(0) ? msg.sender : options.receiver;
        uint256 remainingToken = IERC20Lite(token).balanceOf(address(this));
        if (remainingToken > 0) require(IERC20Lite(token).transfer(receiver, remainingToken));
        if (usableValue > 0) _sendValue(payable(msg.sender), usableValue);

        _recordDeployment(msg.sender, token, pair, options.templateId, salt, msg.value, liquidity, metadataHash);
    }

    function predictTokenAddress(bytes32 salt, bytes32 tokenCreationCodeHash, address creator) public view returns (address) {
        return _predictCreate2(_saltFor(creator, salt), tokenCreationCodeHash);
    }

    function predictTemplateTokenAddress(
        uint8 templateId,
        bytes32 salt,
        TokenParams calldata tokenParams,
        LiquidityParams calldata liquidityParams,
        DividendParams calldata dividendParams,
        address creator
    ) external view returns (address) {
        return _predictCreate2(_saltFor(creator, salt), _templateInitCodeHash(templateId, tokenParams, liquidityParams, dividendParams));
    }

    function templateInitCodeHash(
        uint8 templateId,
        TokenParams calldata tokenParams,
        LiquidityParams calldata liquidityParams,
        DividendParams calldata dividendParams
    ) external view returns (bytes32) {
        return _templateInitCodeHash(templateId, tokenParams, liquidityParams, dividendParams);
    }

    function getDeployments(uint256 offset, uint256 limit) external view returns (DeploymentInfo[] memory items) {
        uint256 end = _pageEnd(deployments.length, offset, limit);
        if (end <= offset) return new DeploymentInfo[](0);
        items = new DeploymentInfo[](end - offset);
        for (uint256 i = offset; i < end; i++) items[i - offset] = deployments[i];
    }

    function getCreatorTokens(address creator, uint256 offset, uint256 limit) external view returns (address[] memory items) {
        address[] storage source = creatorTokens[creator];
        uint256 end = _pageEnd(source.length, offset, limit);
        if (end <= offset) return new address[](0);
        items = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) items[i - offset] = source[i];
    }

    function getLaunchedTokens(uint256 offset, uint256 limit) external view returns (address[] memory items) {
        uint256 end = _pageEnd(launchedTokens.length, offset, limit);
        if (end <= offset) return new address[](0);
        items = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) items[i - offset] = launchedTokens[i];
    }

    function getTemplates(uint256 offset, uint256 limit) external view returns (TemplateInfo[] memory items) {
        uint256 end = _pageEnd(templateIds.length, offset, limit);
        if (end <= offset) return new TemplateInfo[](0);
        items = new TemplateInfo[](end - offset);
        for (uint256 i = offset; i < end; i++) items[i - offset] = templateById[templateIds[i]];
    }

    function getDeployment(address token) external view returns (DeploymentInfo memory) {
        return deploymentByToken[token];
    }

    function getDeploymentsCount() external view returns (uint256) {
        return deployments.length;
    }

    function getCreatorTokensCount(address creator) external view returns (uint256) {
        return creatorTokens[creator].length;
    }

    function getLaunchedTokensCount() external view returns (uint256) {
        return launchedTokens.length;
    }

    function getTemplatesCount() external view returns (uint256) {
        return templateIds.length;
    }

    function getTemplate(uint8 templateId) external view returns (TemplateInfo memory) {
        return templateById[templateId];
    }

    function setTemplate(
        uint8 templateId,
        uint8 kind,
        bool enabled,
        bool requiresLiquidity,
        bool supportsDividends,
        bytes32 label
    ) external onlyOwner {
        require(kind == TEMPLATE_KIND_FIXED || kind == TEMPLATE_KIND_DIVIDEND);
        _setTemplate(templateId, kind, enabled, requiresLiquidity, supportsDividends, label);
    }

    function setApprovedTokenCodeHash(bytes32 codeHash, bool approved) external onlyOwner {
        approvedTokenCodeHash[codeHash] = approved;
        emit TokenCodeHashApprovalUpdated(codeHash, approved);
    }

    function setFeeReceiver(address payable feeReceiver_) external onlyOwner {
        require(feeReceiver_ != address(0));
        feeReceiver = feeReceiver_;
        emit FeeReceiverUpdated(feeReceiver_);
    }

    function setDefaultRewardToken(address defaultRewardToken_) external onlyOwner {
        require(defaultRewardToken_ != address(0));
        defaultRewardToken = defaultRewardToken_;
        emit DefaultRewardTokenUpdated(defaultRewardToken_);
    }

    function setCreationFee(uint256 creationFee_) external onlyOwner {
        creationFee = creationFee_;
        emit CreationFeeUpdated(creationFee_);
    }

    function _deployFixedTemplate(
        TokenParams calldata tokenParams,
        LiquidityParams calldata liquidityParams,
        DeployOptions memory options,
        bytes32 metadataHash
    ) internal returns (address token, address pair, uint256 liquidity) {
        uint256 requiredBnb = liquidityParams.enabled ? liquidityParams.bnbAmount : 0;
        uint256 usableValue = _collectFee(requiredBnb);
        address receiver = tokenParams.receiver == address(0) ? msg.sender : tokenParams.receiver;
        bytes32 create2Salt = _saltFor(msg.sender, options.salt);
        bytes memory initCode = _fixedInitCode(tokenParams, liquidityParams, receiver);
        address predicted = _predictCreate2(create2Salt, keccak256(initCode));
        _checkSuffix(predicted, options.requiredSuffix, options.suffixLength, options.enforceSuffix);

        token = _deployCreate2(create2Salt, initCode);
        if (liquidityParams.enabled) {
            require(liquidityParams.tokenAmount > 0);
            require(liquidityParams.bnbAmount > 0);
            require(IERC20Lite(token).balanceOf(address(this)) >= liquidityParams.tokenAmount);
            uint256 usedBnb;
            (pair, liquidity, usedBnb) = _addDeadLiquidity(token, liquidityParams);
            usableValue -= usedBnb;

            uint256 remainingToken = IERC20Lite(token).balanceOf(address(this));
            if (remainingToken > 0) require(IERC20Lite(token).transfer(receiver, remainingToken));
        }

        if (usableValue > 0) _sendValue(payable(msg.sender), usableValue);
        _recordDeployment(msg.sender, token, pair, options.templateId, options.salt, msg.value, liquidity, metadataHash);
    }

    function _deployDividendTemplate(
        TokenParams calldata tokenParams,
        LiquidityParams calldata liquidityParams,
        DividendParams calldata dividendParams,
        DeployOptions memory options,
        bytes32 metadataHash
    ) internal returns (address token, address pair, uint256 liquidity) {
        require(liquidityParams.enabled);
        uint256 usableValue = _collectFee(liquidityParams.bnbAmount);
        address receiver = tokenParams.receiver == address(0) ? msg.sender : tokenParams.receiver;
        address rewardToken = dividendParams.rewardToken == address(0) ? defaultRewardToken : dividendParams.rewardToken;
        address dividendFeeReceiver = dividendParams.feeReceiver == address(0) ? feeReceiver : dividendParams.feeReceiver;
        bytes32 create2Salt = _saltFor(msg.sender, options.salt);
        bytes memory initCode = _dividendInitCode(tokenParams, rewardToken, dividendFeeReceiver, dividendParams.buyFeeBps, dividendParams.sellFeeBps);
        address predicted = _predictCreate2(create2Salt, keccak256(initCode));
        _checkSuffix(predicted, options.requiredSuffix, options.suffixLength, options.enforceSuffix);

        token = _deployCreate2(create2Salt, initCode);
        require(liquidityParams.tokenAmount > 0);
        require(liquidityParams.bnbAmount > 0);
        require(IERC20Lite(token).balanceOf(address(this)) >= liquidityParams.tokenAmount);

        uint256 usedBnb;
        (pair, liquidity, usedBnb) = _addDeadLiquidity(token, liquidityParams);
        usableValue -= usedBnb;
        DividendMemeToken(token).setPair(pair);

        uint256 remainingToken = IERC20Lite(token).balanceOf(address(this));
        if (remainingToken > 0) require(IERC20Lite(token).transfer(receiver, remainingToken));
        if (usableValue > 0) _sendValue(payable(msg.sender), usableValue);

        if (dividendParams.renounceOwnerAfterCreate) {
            DividendMemeToken(token).renounceOwnership();
        } else {
            DividendMemeToken(token).transferOwnership(msg.sender);
        }

        _recordDeployment(msg.sender, token, pair, options.templateId, options.salt, msg.value, liquidity, metadataHash);
    }

    function _fixedInitCode(TokenParams calldata tokenParams, LiquidityParams calldata liquidityParams, address receiver) internal view returns (bytes memory) {
        address tokenReceiver = liquidityParams.enabled ? address(this) : receiver;
        return abi.encodePacked(type(PepeMemeToken).creationCode, abi.encode(tokenParams.name, tokenParams.symbol, tokenParams.totalSupply, tokenReceiver));
    }

    function _dividendInitCode(
        TokenParams calldata tokenParams,
        address rewardToken,
        address dividendFeeReceiver,
        uint16 buyFeeBps,
        uint16 sellFeeBps
    ) internal view returns (bytes memory) {
        return abi.encodePacked(
            type(DividendMemeToken).creationCode,
            abi.encode(
                tokenParams.name,
                tokenParams.symbol,
                tokenParams.totalSupply,
                address(this),
                address(this),
                address(pancakeRouter),
                rewardToken,
                dividendFeeReceiver,
                buyFeeBps,
                sellFeeBps
            )
        );
    }

    function _templateInitCodeHash(
        uint8 templateId,
        TokenParams calldata tokenParams,
        LiquidityParams calldata liquidityParams,
        DividendParams calldata dividendParams
    ) internal view returns (bytes32) {
        TemplateInfo storage template = templateById[templateId];
        require(template.enabled);
        address receiver = tokenParams.receiver == address(0) ? msg.sender : tokenParams.receiver;
        if (template.kind == TEMPLATE_KIND_FIXED) {
            return keccak256(_fixedInitCode(tokenParams, liquidityParams, receiver));
        }
        if (template.kind == TEMPLATE_KIND_DIVIDEND) {
            address rewardToken = dividendParams.rewardToken == address(0) ? defaultRewardToken : dividendParams.rewardToken;
            address dividendFeeReceiver = dividendParams.feeReceiver == address(0) ? feeReceiver : dividendParams.feeReceiver;
            return keccak256(_dividendInitCode(tokenParams, rewardToken, dividendFeeReceiver, dividendParams.buyFeeBps, dividendParams.sellFeeBps));
        }
        revert();
    }

    function _addDeadLiquidity(address token, LiquidityParams calldata liquidityParams)
        internal
        returns (address pair, uint256 liquidity, uint256 usedBnb)
    {
        require(IERC20Lite(token).approve(address(pancakeRouter), liquidityParams.tokenAmount));
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

    function _recordDeployment(
        address creator,
        address token,
        address pair,
        uint8 templateId,
        bytes32 salt,
        uint256 valuePaid,
        uint256 liquidity,
        bytes32 metadataHash
    ) internal {
        DeploymentInfo memory info = DeploymentInfo({
            creator: creator,
            token: token,
            pair: pair,
            templateId: templateId,
            salt: salt,
            valuePaid: valuePaid,
            liquidity: liquidity,
            blockNumber: uint64(block.number),
            createdAt: uint64(block.timestamp),
            metadataHash: metadataHash
        });
        deployments.push(info);
        launchedTokens.push(token);
        creatorTokens[creator].push(token);
        deploymentByToken[token] = info;
        emit TokenDeployed(creator, token, pair, templateId, salt, valuePaid, liquidity, metadataHash);
    }

    function _setTemplate(
        uint8 templateId,
        uint8 kind,
        bool enabled,
        bool requiresLiquidity,
        bool supportsDividends,
        bytes32 label
    ) internal {
        require(templateId > 0);
        if (templateById[templateId].label == bytes32(0)) templateIds.push(templateId);
        templateById[templateId] = TemplateInfo(templateId, kind, enabled, requiresLiquidity, supportsDividends, label);
        emit TemplateUpdated(templateId, kind, enabled, requiresLiquidity, supportsDividends, label);
    }

    function _collectFee(uint256 requiredExtraValue) internal returns (uint256 usableValue) {
        require(msg.value >= creationFee + requiredExtraValue);
        if (creationFee > 0) _sendValue(feeReceiver, creationFee);
        return msg.value - creationFee;
    }

    function _deployCreate2(bytes32 salt, bytes memory initCode) internal returns (address deployed) {
        require(initCode.length > 0);
        assembly {
            deployed := create2(0, add(initCode, 0x20), mload(initCode), salt)
        }
        require(deployed != address(0));
    }

    function _predictCreate2(bytes32 salt, bytes32 initCodeHash) internal view returns (address) {
        bytes32 digest = keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, initCodeHash));
        return address(uint160(uint256(digest)));
    }

    function _saltFor(address creator, bytes32 salt) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(creator, salt));
    }

    function _checkSuffix(address predicted, uint160 requiredSuffix, uint8 suffixLength, bool enforceSuffix) internal pure {
        require(suffixLength <= 10);
        if (!enforceSuffix || suffixLength == 0) return;
        uint160 mask = uint160((uint256(1) << (uint256(suffixLength) * 4)) - 1);
        require((uint160(predicted) & mask) == (requiredSuffix & mask));
    }

    function _pageEnd(uint256 total, uint256 offset, uint256 limit) internal pure returns (uint256) {
        if (offset >= total) return offset;
        if (limit == 0 || limit > total - offset) return total;
        return offset + limit;
    }

    function _sendValue(address payable to, uint256 value) internal {
        (bool sent, ) = to.call{value: value}("");
        require(sent);
    }
}
