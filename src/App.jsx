import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Coins,
  Copy,
  CreditCard,
  ExternalLink,
  FileCheck2,
  Gauge,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  Rocket,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Timer,
  Upload,
  Users,
  Wallet,
  XCircle,
  Zap,
} from 'lucide-react';
import { Contract, Interface, JsonRpcProvider, keccak256, toUtf8Bytes } from 'ethers';
import pepeArenaArt from './assets/pepe-arena.svg';

const STORAGE_KEY = 'pepe-launch-arena-draft-factory';
const LAUNCH_FEE_BNB = '0.005';
const WHITELIST_LAUNCH_FEE_BNB = LAUNCH_FEE_BNB;
const PAYMENT_RECEIVER = import.meta.env.VITE_PAYMENT_RECEIVER || '';
const DEFAULT_FACTORY_CONTRACT = '0xEd168e31FD49E09794E8d21c2DE92b7188Ed3eE9';
const FACTORY_CONTRACT = import.meta.env.VITE_FACTORY_CONTRACT || DEFAULT_FACTORY_CONTRACT;
const MINT_CONTRACT = import.meta.env.VITE_MINT_CONTRACT || '';
const TOKEN_CONTRACT = import.meta.env.VITE_TOKEN_CONTRACT || '';
const DEFAULT_REWARD_TOKEN = import.meta.env.VITE_REWARD_TOKEN_CONTRACT || '0x55d398326f99059fF775485246999027B3197955';
const CONTRACT_SOURCE_URL = 'https://github.com/ybc112/Pepefun/tree/main/contracts';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD';
const BSC_PUBLIC_RPCS = ['https://bsc-mainnet.public.blastapi.io', 'https://bsc-rpc.publicnode.com', 'https://bsc.drpc.org'];
const ERC20_SELECTORS = {
  name: '0x06fdde03',
  symbol: '0x95d89b41',
  decimals: '0x313ce567',
  totalSupply: '0x18160ddd',
  balanceOf: '0x70a08231',
  approve: '0x095ea7b3',
};
const FACTORY_VIEW_ABI = [
  'function allTokensLength() view returns (uint256)',
  'function creationFee() view returns (uint256)',
  'function getProjects(uint256 offset,uint256 limit) view returns (tuple(address creator,address token,address vault,address paymentToken,address receiver,address platformFeeReceiver,bytes32 templateId,uint256 totalSupply,uint256 mintCount,uint256 whitelistMintCount,uint256 publicMintCount,uint256 mintPrice,uint256 maxMintPerWallet,bool whitelistEnabled,string metadataUri,uint64 createdAt,address rewardToken,uint256 rewardThreshold,uint16 buyTaxBps,uint16 sellTaxBps,uint16 transferTaxBps,uint16 addLiquidityTaxBps,uint16 removeLiquidityTaxBps,uint16 launchProtectionTaxBps,uint16 launchProtectionBlocks,uint32 claimWait,uint16 fundFeeBps,uint16 lpFeeBps,uint16 dividendFeeBps,uint16 burnFeeBps)[])',
];
const FACTORY_WRITE_INTERFACE = new Interface([
  'function createLaunch((string name,string symbol,string metadataUri,uint256 totalSupply,uint256 mintCount,uint256 mintPrice,uint256 maxMintPerWallet,address paymentToken,address rewardToken,uint256 rewardThreshold,address receiver,bytes32 templateId,uint16 buyTaxBps,uint16 sellTaxBps,uint16 transferTaxBps,uint16 addLiquidityTaxBps,uint16 removeLiquidityTaxBps,uint16 launchProtectionTaxBps,uint16 launchProtectionBlocks,uint32 claimWait,uint16 fundFeeBps,uint16 lpFeeBps,uint16 dividendFeeBps,uint16 burnFeeBps,uint256 whitelistMintCount,bool whitelistEnabled) params,bytes32 salt) payable returns (address token,address vault)',
  'event LaunchCreated(address indexed creator,address indexed token,address indexed vault,bytes32 templateId,string name,string symbol,uint256 totalSupply,uint256 mintCount,uint256 mintPrice,address paymentToken,bool whitelistEnabled,string metadataUri)',
]);
const VAULT_VIEW_INTERFACE = new Interface([
  'function owner() view returns (address)',
  'function token() view returns (address)',
  'function mintPrice() view returns (uint256)',
  'function tokensPerMint() view returns (uint256)',
  'function totalMints() view returns (uint256)',
  'function mintedCount() view returns (uint256)',
  'function whitelistMintedCount() view returns (uint256)',
  'function maxMintPerWallet() view returns (uint256)',
  'function whitelistMintLimit() view returns (uint256)',
  'function whitelistEnabled() view returns (bool)',
  'function finalized() view returns (bool)',
  'function refundDeadline() view returns (uint256)',
  'function liquidityPair() view returns (address)',
  'function receiver() view returns (address)',
  'function mintedByWallet(address account) view returns (uint256)',
  'function whitelistList(address account) view returns (bool)',
  'function paidByWallet(address account) view returns (uint256)',
]);
const VAULT_WRITE_INTERFACE = new Interface([
  'function mint(uint256 quantity) payable',
  'function claimRefund()',
  'function setWhitelistAccounts(address[] accounts,bool listed)',
  'function setWhitelistEnabled(bool enabled)',
]);
const TEMPLATE_IDS = {
  standard: keccak256(toUtf8Bytes('standard')),
  'zero-tax': keccak256(toUtf8Bytes('zero-tax')),
  'blackhole-lp': keccak256(toUtf8Bytes('blackhole-lp')),
  'no-owner': keccak256(toUtf8Bytes('no-owner')),
  reflection: keccak256(toUtf8Bytes('reflection')),
  'dividend-token': keccak256(toUtf8Bytes('dividend-token')),
  'fair-mint': keccak256(toUtf8Bytes('fair-mint')),
};
const DEFAULT_CHAIN_INFO = {
  loading: true,
  error: '',
  owner: '',
  tokenAddress: TOKEN_CONTRACT,
  tokenName: '',
  tokenSymbol: '',
  tokenDecimals: 18,
  totalSupply: '',
  priceWei: 0n,
  amountPerUnits: 0n,
  mintLimit: 0,
  minted: 0,
  accMintLimit: 0,
  accEachLimit: 0,
  whiteLimit: 0,
  startWhitelist: false,
  start: false,
  failed: false,
  refundDeadline: 0,
  liquidityBnbBps: 0,
  liquidityTokenBps: 0,
  refundableBnbWei: 0n,
  pairAddress: '',
  fundAddress: '',
  walletMinted: null,
  walletWhitelisted: null,
  walletBalance: '',
  updatedAt: '',
};
const BSC_CHAIN = {
  chainId: '0x38',
  chainName: 'BNB Smart Chain',
  nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  rpcUrls: ['https://bsc-dataseed.binance.org'],
  blockExplorerUrls: ['https://bscscan.com'],
};

const navItems = [
  { id: 'arena', label: '首页', icon: LayoutDashboard },
  { id: 'rules', label: '公平规则', icon: ShieldCheck },
  { id: 'templates', label: '模板协议', icon: FileCheck2 },
  { id: 'modes', label: '发射姿势', icon: Rocket },
  { id: 'launch', label: '发新币', icon: Upload },
  { id: 'deployments', label: '部署列表', icon: ListChecks },
  { id: 'manifesto', label: '擂主宣言', icon: BadgeCheck },
];

const launchModes = [
  {
    id: 'direct',
    title: '标准发射',
    kicker: '适合常规项目',
    text: '设定总量、税率、Mint 份数和白名单，支付创建费后生成 AppleToken + AppleMintVault。',
    icon: Rocket,
  },
  {
    id: 'mint',
    title: '自由 Mint',
    kicker: '擂台王牌模式',
    text: '无需预分配，任何人按价格曲线 Mint，累计 BNB 自动组成底池并打入 dead。',
    icon: Coins,
  },
];

const templates = [
  {
    id: 'standard',
    name: '标准BEP20模板',
    tag: '经典稳定',
    text: '固定总量、标准转账、BscScan 公开验证，社区最熟悉。',
    deployable: true,
  },
  {
    id: 'burn',
    name: '通缩燃烧模板',
    tag: '越炒越少',
    text: '每笔交易自动烧一部分，流通量随交易减少。',
  },
  {
    id: 'reflection',
    name: '反射分红模板',
    tag: '持币生平台币',
    text: '交易税累积分红池，换成平台币后持币地址可按比例领取。',
    deployable: true,
  },
  {
    id: 'fair-mint',
    name: '公平启动模板',
    tag: '无预挖',
    text: '无团队预留、无老鼠仓，发射权交给 Mint 速度和共识。',
    deployable: true,
  },
  {
    id: 'no-owner',
    name: '无Owner模板',
    tag: '部署即放弃',
    text: '参数写入合约，Mint 打满后 LP 进入黑洞，关键规则不能被随意撤回。',
    deployable: true,
  },
  {
    id: 'anti-whale',
    name: '防巨鲸模板',
    tag: '限仓限买',
    text: '设置单笔和单钱包限制，首发阶段降低大户碾压。',
  },
  {
    id: 'cooldown',
    name: '冷却防扫模板',
    tag: '防机器人',
    text: '交易冷却与首区块限制，压低抢跑和批量机器人。',
  },
  {
    id: 'auto-lp',
    name: '自动回流模板',
    tag: '自动加池',
    text: '税费按比例回流 PancakeSwap，增强交易深度。',
  },
  {
    id: 'blackhole-lp',
    name: '黑洞底池模板',
    tag: 'LP转dead',
    text: '初始或 Mint 累积 LP 自动转入 0x...dead。',
    deployable: true,
  },
  {
    id: 'zero-tax',
    name: '零税公平模板',
    tag: '纯净交易',
    text: '买卖税为 0，适合强调简单、透明、公平的 meme。',
    deployable: true,
  },
  {
    id: 'dividend-token',
    name: '指定币分红模板',
    tag: '多币分红',
    text: '支持 BNB 或指定代币分红，适合社区运营玩法。',
    deployable: true,
  },
  {
    id: 'community',
    name: '社区金库模板',
    tag: '公开金库',
    text: '营销、回购、分红比例写入参数，所有规则链上可查。',
  },
];

const mintPlaybooks = [
  {
    id: 'whitelist',
    name: '白名单Mint',
    tag: '主玩法',
    text: '创建时写入白名单，白名单窗口结束后项目方可开公开 Mint。',
    whitelist: true,
    priceCurve: '固定价格',
  },
  {
    id: 'public',
    name: '公开Mint',
    tag: '全员同入口',
    text: '任何钱包按单价 Mint，卖完后募集 BNB 自动进池。',
    whitelist: false,
    priceCurve: '固定价格',
  },
];

const fairClaims = [
  ['没有开发跑路', '部署规则公开，Owner 可选直接抛弃。'],
  ['没有底池被撤', 'LP 自动打入 dead 黑洞地址。'],
  ['没有合约留后门', '模板开源、参数上链、BscScan 可验证。'],
  ['没有内幕预留', '自由 Mint 模式无预挖，全凭手速和共识。'],
];

const benefits = [
  '发币成本低，零代码也能完成参数配置',
  '底池强制转 dead 黑洞，永不可撤',
  '合约模板公开验证，关键参数无法悄悄改',
  '支持公平 Mint，杜绝预挖和老鼠仓',
  'BSC 主网钱包直连，MetaMask / OKX / TokenPocket / TrustWallet 可用',
  '合约地址、交易哈希、PancakeSwap 入口按发射结果输出',
];

const flowSteps = [
  ['01', '连接钱包', '连接真实 BSC 钱包，自动切换到 BNB Smart Chain。', Wallet],
  ['02', '选择模式', '标准发射或自由 Mint，选择合约模板和税控参数。', SlidersHorizontal],
  ['03', '上传Logo', '上传 Pepe 风格 Logo，预览代币名、符号和擂台视觉。', Upload],
  ['04', '登上擂台', '确认支付并拉起钱包，等待链上交易回执。', Rocket],
];

const factoryFlow = [
  ['01', '选择模板', '按开放模板发币，暂未开放的模板不会伪装成可部署。'],
  ['02', '预测地址', 'CREATE2 salt 可预测 Token 地址，也可强制校验尾号。'],
  ['03', '每笔加池', 'Mint 支付按比例自动加 PancakeSwap，LP 接收地址写死为 dead。'],
  ['04', '失败退款', '未打满且超过退款窗口后，用户可手动退回可退余额。'],
];

const launchWizardSteps = [
  { id: 'mode', label: '模式', title: '发射模式' },
  { id: 'basic', label: '基础', title: '基础信息' },
  { id: 'params', label: '参数', title: '发射参数' },
  { id: 'rules', label: '白名单', title: '白名单与规则' },
  { id: 'preview', label: '预览', title: '确认发射' },
];

const defaultForm = {
  mode: 'mint',
  templateId: 'fair-mint',
  tokenName: '',
  symbol: '',
  totalSupply: '1000000000',
  owner: '',
  buyTax: '0',
  sellTax: '0',
  burnRate: '1',
  initialLiquidity: '0.2',
  launchPrice: '0.000001',
  teamAllocation: '0',
  mintPrice: '0.01',
  tokensPerMint: '1000',
  mintSlots: '1000',
  whiteMintSlots: '100',
  maxPerWallet: '5',
  priceCurve: '固定价格',
  graduationTarget: '5',
  lpBnbPercent: '100',
  lpTokenPercent: '50',
  refundHours: '24',
  rewardSwapThreshold: '',
  autoClaimThreshold: '4',
  autoClaimBatchSize: '4',
  startTime: '',
  website: '',
  x: '',
  telegram: '',
  deadLiquidity: true,
  renounceOwner: true,
  whitelist: true,
  whitelistAddresses: '',
  mintQuantity: '1',
  vanitySuffix: '',
  vanitySalt: '',
  autoVerify: true,
  logoData: '',
  note: '',
};

function parseWhitelist(value) {
  const rawItems = String(value || '')
    .split(/[\s,;，；]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const seen = new Set();
  const valid = [];
  const invalid = [];

  rawItems.forEach((item) => {
    if (!isAddress(item)) {
      if (!invalid.includes(item)) invalid.push(item);
      return;
    }
    const normalized = item.toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      valid.push(item);
    }
  });

  return { valid, invalid, rawCount: rawItems.length };
}

function appendWhitelistAddress(current, address) {
  if (!isAddress(address)) return current || '';
  const parsed = parseWhitelist(current);
  if (parsed.valid.some((item) => item.toLowerCase() === address.toLowerCase())) {
    return current || '';
  }
  return [current, address].filter(Boolean).join('\n');
}

function loadDraft() {
  if (typeof window === 'undefined') return defaultForm;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved?.version === 5) {
      return {
        ...defaultForm,
        ...saved.form,
        mode: 'mint',
        templateId: saved.form?.templateId || defaultForm.templateId,
        deadLiquidity: true,
        renounceOwner: true,
      };
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  return defaultForm;
}

function getProvider() {
  if (typeof window === 'undefined') return null;
  const providers = window.ethereum?.providers;
  if (providers?.length) {
    return (
      providers.find((item) => item.isMetaMask) ||
      providers.find((item) => item.isOkxWallet || item.isOKExWallet) ||
      providers.find((item) => item.isTokenPocket) ||
      providers.find((item) => item.isTrust) ||
      providers[0]
    );
  }
  return window.ethereum || window.okxwallet || window.tokenpocket?.ethereum || window.trustwallet || null;
}

function detectProviderName(provider) {
  if (!provider) return '';
  if (provider.isTokenPocket) return 'TokenPocket';
  if (provider.isOkxWallet || provider.isOKExWallet) return 'OKX Wallet';
  if (provider.isTrust) return 'TrustWallet';
  if (provider.isMetaMask) return 'MetaMask';
  return 'Web3 Wallet';
}

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || '').trim());
}

function shortAddress(address) {
  if (!address) return '';
  if (!isAddress(address)) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function sameAddress(left, right) {
  return isAddress(left) && isAddress(right) && left.toLowerCase() === right.toLowerCase();
}

function toWeiHex(amountBnb) {
  const [whole = '0', fraction = ''] = String(amountBnb || '0').split('.');
  const wei =
    BigInt(whole || '0') * 10n ** 18n +
    BigInt((fraction || '').padEnd(18, '0').slice(0, 18) || '0');
  return `0x${wei.toString(16)}`;
}

function weiHex(amountWei) {
  const value = typeof amountWei === 'bigint' ? amountWei : BigInt(amountWei || 0);
  return `0x${value.toString(16)}`;
}

function decimalToUnits(value, decimals = 18) {
  const normalized = String(value || '0').replaceAll(',', '').trim();
  const [whole = '0', fraction = ''] = normalized.split('.');
  const unitDecimals = Number(decimals) || 18;
  const cleanWhole = whole.replace(/[^\d]/g, '') || '0';
  const cleanFraction = fraction.replace(/[^\d]/g, '').padEnd(unitDecimals, '0').slice(0, unitDecimals) || '0';
  return BigInt(cleanWhole) * 10n ** BigInt(unitDecimals) + BigInt(cleanFraction);
}

function txUrl(hash) {
  return hash ? `https://bscscan.com/tx/${hash}` : '#';
}

function addressUrl(address) {
  return isAddress(address) ? `https://bscscan.com/address/${address}` : '#';
}

function addressCodeUrl(address) {
  return isAddress(address) ? `${addressUrl(address)}#code` : '#';
}

function pancakeUrl(address) {
  return isAddress(address) ? `https://pancakeswap.finance/swap?chain=bsc&outputCurrency=${address}` : '#';
}

function numberValue(value) {
  const parsed = Number(String(value || '0').replaceAll(',', ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value, digits = 2) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
  }).format(numberValue(value));
}

function formatBnb(value) {
  const numeric = numberValue(value);
  if (!numeric) return '0';
  return numeric < 0.001 ? numeric.toFixed(6) : numeric.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}

function cleanSymbol(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12);
}

function stripHex(value) {
  return String(value || '').replace(/^0x/i, '');
}

function pad64(value) {
  return stripHex(value).padStart(64, '0');
}

function hexToBigInt(value) {
  const hex = stripHex(value);
  return hex ? BigInt(`0x${hex}`) : 0n;
}

function hexToNumber(value) {
  return Number(hexToBigInt(value));
}

function decodeAddress(value) {
  const hex = stripHex(value);
  if (hex.length < 40) return '';
  return `0x${hex.slice(-40)}`;
}

function decodeTopicAddress(value) {
  const address = decodeAddress(value);
  return isAddress(address) ? address : '';
}

function decodeBool(value) {
  return hexToBigInt(value) !== 0n;
}

function decodeString(value) {
  try {
    const hex = stripHex(value);
    if (!hex) return '';
    if (hex.length === 64) {
      const bytes32 = hex.match(/.{1,2}/g)?.map((item) => Number.parseInt(item, 16)) || [];
      return new TextDecoder().decode(new Uint8Array(bytes32)).replace(/\0+$/, '');
    }
    if (hex.length < 128) return '';
    const offset = Number(BigInt(`0x${hex.slice(0, 64)}`));
    const lengthStart = offset * 2;
    const length = Number(BigInt(`0x${hex.slice(lengthStart, lengthStart + 64)}`));
    const dataStart = lengthStart + 64;
    const bytes = hex.slice(dataStart, dataStart + length * 2);
    const chars = bytes.match(/.{1,2}/g)?.map((item) => Number.parseInt(item, 16)) || [];
    return new TextDecoder().decode(new Uint8Array(chars)).replace(/\0+$/, '');
  } catch {
    return '';
  }
}

function formatUnits(value, decimals = 18, precision = 4) {
  const amount = typeof value === 'bigint' ? value : hexToBigInt(value);
  const unitDecimals = Number(decimals) || 18;
  const base = 10n ** BigInt(unitDecimals);
  const whole = amount / base;
  const fraction = amount % base;
  if (fraction === 0n) return whole.toString();
  const fractionText = fraction.toString().padStart(unitDecimals, '0').slice(0, precision).replace(/0+$/, '');
  return fractionText ? `${whole}.${fractionText}` : whole.toString();
}

function formatBnbFromWei(value, precision = 6) {
  return formatUnits(value, 18, precision);
}

function selectorWithAddress(selector, address) {
  return `${selector}${pad64(address)}`;
}

function encodeWhitelistCall(addresses, enabled = true) {
  return VAULT_WRITE_INTERFACE.encodeFunctionData('setWhitelistAccounts', [addresses, enabled]);
}

function encodeUintCall(selector, value) {
  const amount = typeof value === 'bigint' ? value : BigInt(value || 0);
  return `${selector}${pad64(amount.toString(16))}`;
}

function encodeAddressCall(selector, address) {
  return `${selector}${pad64(address)}`;
}

function encodeApproveCall(spender, amount) {
  return `${ERC20_SELECTORS.approve}${pad64(spender)}${pad64(amount.toString(16))}`;
}

function getFixedLaunchLiquidity(form) {
  const bnbAmount = decimalToUnits(form.initialLiquidity, 18);
  const launchPriceWei = decimalToUnits(form.launchPrice, 18);
  if (bnbAmount <= 0n || launchPriceWei <= 0n) {
    return {
      enabled: false,
      bnbAmount: 0n,
      tokenAmount: 0n,
      minTokenAmount: 0n,
      minBnbAmount: 0n,
      deadline: 0n,
    };
  }

  return {
    enabled: true,
    bnbAmount,
    tokenAmount: (bnbAmount * 10n ** 18n) / launchPriceWei,
    minTokenAmount: 0n,
    minBnbAmount: 0n,
    deadline: BigInt(Math.floor(Date.now() / 1000) + 1800),
  };
}

function getDividendParams(form) {
  const enabled = isDividendTemplate(form.templateId);
  return {
    rewardToken: enabled && isAddress(TOKEN_CONTRACT) ? TOKEN_CONTRACT : DEFAULT_REWARD_TOKEN,
    feeReceiver: ZERO_ADDRESS,
    buyFeeBps: enabled ? percentToBps(form.buyTax) : 0,
    sellFeeBps: enabled ? percentToBps(form.sellTax) : 0,
    renounceOwnerAfterCreate: form.renounceOwner,
    rewardSwapThreshold: enabled && numberValue(form.rewardSwapThreshold) > 0 ? decimalToUnits(form.rewardSwapThreshold, 18) : 0n,
    autoClaimThreshold: enabled ? decimalToUnits(form.autoClaimThreshold || '4', 18) : 0n,
    autoClaimGasLimit: enabled ? Math.max(1, Math.floor(numberValue(form.autoClaimBatchSize) || 4)) : 0,
  };
}

function getFairMintParams(form) {
  const price = decimalToUnits(form.mintPrice, 18);
  const totalSupply = decimalToUnits(form.totalSupply, 18);
  const mintLimit = BigInt(Math.max(1, Math.floor(numberValue(form.mintSlots))));
  const requestedWhiteLimit = BigInt(Math.max(1, Math.floor(numberValue(form.whiteMintSlots) || numberValue(form.mintSlots))));
  const whiteLimit = form.whitelist ? (requestedWhiteLimit > mintLimit ? mintLimit : requestedWhiteLimit) : 0n;
  const accMintLimit = BigInt(Math.max(1, Math.floor(numberValue(form.maxPerWallet))));
  const accEachLimit = BigInt(Math.max(1, Math.floor(numberValue(form.mintQuantity))));
  const liquidityBnbBps = 10000n;
  const liquidityTokenBps = 5000n;
  const liquidityTokenAmount = (totalSupply * liquidityTokenBps) / 10000n;
  const saleSupply = totalSupply - liquidityTokenAmount;
  const amountPerMint = mintLimit > 0n ? saleSupply / mintLimit : 0n;
  const refundDeadline = BigInt(Math.floor(Date.now() / 1000 + 24 * 3600));

  return {
    price,
    amountPerMint,
    mintLimit,
    whiteLimit,
    accMintLimit,
    accEachLimit,
    liquidityTokenAmount,
    liquidityBnbBps,
    liquidityTokenBps,
    refundDeadline,
    startWhitelist: Boolean(form.whitelist),
    startPublic: !form.whitelist,
    renounceOwnerAfterCreate: false,
  };
}

function isWhitelistMintLaunch(form) {
  return form.mode === 'mint' && isFairMintTemplate(form.templateId) && Boolean(form.whitelist);
}

function getLaunchFeeBnb(form) {
  return isWhitelistMintLaunch(form) ? WHITELIST_LAUNCH_FEE_BNB : LAUNCH_FEE_BNB;
}

function isDividendTemplate(templateId) {
  return templateId === 'reflection' || templateId === 'dividend-token';
}

function isFairMintTemplate(templateId) {
  return templateId === 'fair-mint';
}

function getTemplateId(templateId) {
  return TEMPLATE_IDS[templateId] || TEMPLATE_IDS.standard;
}

function sameTemplateId(left, rightKey) {
  const right = TEMPLATE_IDS[rightKey];
  return Boolean(right && String(left || '').toLowerCase() === right.toLowerCase());
}

function templateLabelById(templateId) {
  const found = templates.find((item) => sameTemplateId(templateId, item.id));
  return found?.name || `模板 ${shortAddress(String(templateId || ''))}`;
}

function deploymentModeLabel(templateId, pool) {
  pool;
  if (sameTemplateId(templateId, 'reflection') || sameTemplateId(templateId, 'dividend-token')) return '持币分红币';
  return 'Mint池';
}

function deploymentTimeLabel(item) {
  if (item?.createdAt) return new Date(item.createdAt * 1000).toLocaleString('zh-CN', { hour12: false });
  return item?.blockNumber ? `Block ${item.blockNumber}` : '等待区块';
}

function isDeployableTemplate(templateId) {
  return Boolean(TEMPLATE_IDS[templateId]);
}

function percentToBps(value) {
  return Math.max(0, Math.round(numberValue(value) * 100));
}

function normalizeHexSuffix(value) {
  return String(value || '')
    .replace(/^0x/i, '')
    .replace(/[^0-9a-f]/gi, '')
    .toLowerCase()
    .slice(0, 10);
}

function suffixToUint160(value) {
  const suffix = normalizeHexSuffix(value);
  return suffix ? BigInt(`0x${suffix}`) : 0n;
}

function saltToBytes32(value, seed = '') {
  const clean = String(value || '').trim();
  if (/^0x[0-9a-fA-F]{64}$/.test(clean)) return clean;
  if (clean) return keccak256(toUtf8Bytes(clean));
  return keccak256(toUtf8Bytes(`${seed}-${Date.now()}-${Math.random()}`));
}

function getMetadataHash(form) {
  const metadata = JSON.stringify({
    website: String(form.website || '').trim(),
    x: String(form.x || '').trim(),
    telegram: String(form.telegram || '').trim(),
    note: String(form.note || '').trim(),
  });
  return keccak256(toUtf8Bytes(metadata));
}

function getFactoryProvider() {
  return new JsonRpcProvider(BSC_PUBLIC_RPCS[0]);
}

async function publicRpcBatch(calls) {
  const body = JSON.stringify(
    calls.map((call, index) => ({
      jsonrpc: '2.0',
      id: index + 1,
      method: 'eth_call',
      params: [{ to: call.to, data: call.data }, 'latest'],
    })),
  );
  let lastError;

  for (const rpcUrl of BSC_PUBLIC_RPCS) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        signal: controller.signal,
      });
      const payload = await response.json();
      if (!Array.isArray(payload) && payload.error) {
        throw new Error(payload.error.message || '链上参数读取失败');
      }
      const items = Array.isArray(payload) ? payload : [payload];
      const byId = new Map(items.map((item) => [item.id, item]));
      return calls.map((_, index) => {
        const call = calls[index];
        const item = byId.get(index + 1);
        if (item?.error) {
          if (call.optional) return call.fallback || '0x';
          throw new Error(item.error.message || '链上参数读取失败');
        }
        return item?.result || call.fallback || '0x';
      });
    } catch (error) {
      lastError = error;
    } finally {
      window.clearTimeout(timer);
    }
  }

  throw new Error(lastError?.message || '链上参数读取失败');
}

async function publicRpcRequest(method, params) {
  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method,
    params,
  });
  let lastError;

  for (const rpcUrl of BSC_PUBLIC_RPCS) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        signal: controller.signal,
      });
      const payload = await response.json();
      if (payload?.error) throw new Error(payload.error.message || '链上请求失败');
      return payload?.result || null;
    } catch (error) {
      lastError = error;
    } finally {
      window.clearTimeout(timer);
    }
  }

  throw new Error(lastError?.message || '链上请求失败');
}

async function waitForTransactionReceipt(txHash, attempts = 40) {
  for (let index = 0; index < attempts; index += 1) {
    const receipt = await publicRpcRequest('eth_getTransactionReceipt', [txHash]).catch(() => null);
    if (receipt) return receipt;
    await new Promise((resolve) => window.setTimeout(resolve, 3000));
  }
  return null;
}

function parseFactoryDeployment(receipt) {
  for (const log of receipt?.logs || []) {
    if (!sameAddress(log.address, FACTORY_CONTRACT)) continue;
    try {
      const parsed = FACTORY_WRITE_INTERFACE.parseLog(log);
      if (parsed?.name === 'LaunchCreated') {
        return {
          creator: parsed.args.creator,
          tokenAddress: parsed.args.token,
          poolAddress: parsed.args.vault,
          pairAddress: '',
          blockNumber: receipt.blockNumber ? Number(BigInt(receipt.blockNumber)) : null,
        };
      }
    } catch {
      // Other logs in the same transaction are ignored.
    }
  }
  return null;
}

async function publicRpcCall(to, data) {
  const [result] = await publicRpcBatch([{ to, data }]);
  return result;
}

async function ethCall(provider, to, data) {
  if (provider?.request) {
    try {
      return await provider.request({
        method: 'eth_call',
        params: [{ to, data }, 'latest'],
      });
    } catch {
      return publicRpcCall(to, data);
    }
  }
  return publicRpcCall(to, data);
}

async function getFactoryCreationFeeWei(formLike = null) {
  formLike;
  if (!isAddress(FACTORY_CONTRACT)) return 0n;
  const raw = await publicRpcCall(FACTORY_CONTRACT, new Interface(['function creationFee() view returns (uint256)']).encodeFunctionData('creationFee'));
  return hexToBigInt(raw);
}

function mintStatusLabel(info) {
  if (info.loading) return '读取中';
  if (info.error) return '等待配置';
  if (info.failed) return '可退款';
  if (info.start) return '已开启';
  if (info.startWhitelist) return '白名单窗口开启';
  return '尚未开始';
}

function getAvailableMintLimit(info, hasWallet) {
  if (info.failed) return 0;
  const limits = [];
  if (info.accEachLimit > 0) limits.push(info.accEachLimit);
  if (info.mintLimit > 0) limits.push(Math.max(0, info.mintLimit - info.minted));
  if (hasWallet && info.accMintLimit > 0 && info.walletMinted !== null) {
    limits.push(Math.max(0, info.accMintLimit - info.walletMinted));
  }
  return limits.length ? Math.min(...limits) : Number.POSITIVE_INFINITY;
}

function pageFromHash() {
  if (typeof window === 'undefined') return 'arena';
  const id = window.location.hash.replace('#', '');
  return navItems.some((item) => item.id === id) ? id : 'arena';
}

function pageIndex(page) {
  return Math.max(0, navItems.findIndex((item) => item.id === page));
}

function launchStepIndex(step) {
  return Math.max(0, launchWizardSteps.findIndex((item) => item.id === step));
}

function App() {
  const [activePage, setActivePage] = useState(pageFromHash);
  const [launchStep, setLaunchStep] = useState('basic');
  const [form, setForm] = useState(loadDraft);
  const [wallet, setWallet] = useState({ address: '', chainId: '', providerName: '' });
  const [checkout, setCheckout] = useState(null);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [factoryRecords, setFactoryRecords] = useState([]);
  const [factoryRecordsCount, setFactoryRecordsCount] = useState(0);
  const [selectedDeployment, setSelectedDeployment] = useState(null);
  const [vanityPreview, setVanityPreview] = useState('');
  const [chainInfo, setChainInfo] = useState(DEFAULT_CHAIN_INFO);
  const [chainRefresh, setChainRefresh] = useState(0);

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === form.templateId) || templates[0],
    [form.templateId],
  );
  const selectedMode = useMemo(
    () => launchModes.find((item) => item.id === form.mode) || launchModes[0],
    [form.mode],
  );

  const mintRaise = useMemo(
    () => numberValue(form.mintPrice) * numberValue(form.mintSlots),
    [form.mintPrice, form.mintSlots],
  );
  const launchAmount = useMemo(() => {
    const baseFee = numberValue(getLaunchFeeBnb(form));
    if (form.mode === 'direct') return baseFee + Math.max(0, numberValue(form.initialLiquidity));
    return baseFee;
  }, [form]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 5, form }));
  }, [form]);

  useEffect(() => {
    const nextHash = `#${activePage}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activePage]);

  useEffect(() => {
    function syncPageFromHash() {
      setActivePage(pageFromHash());
    }
    window.addEventListener('hashchange', syncPageFromHash);
    return () => window.removeEventListener('hashchange', syncPageFromHash);
  }, []);

  useEffect(() => {
    const provider = getProvider();
    provider
      ?.request?.({ method: 'eth_accounts' })
      .then(async (accounts) => {
        if (accounts?.[0]) {
          const chainId = await provider.request({ method: 'eth_chainId' }).catch(() => '');
          setWallet({ address: accounts[0], chainId, providerName: detectProviderName(provider) });
        }
      })
      .catch(() => {});

    function handleAccounts(accounts) {
      setWallet((current) => ({ ...current, address: accounts?.[0] || '' }));
    }
    function handleChain(chainId) {
      setWallet((current) => ({ ...current, chainId }));
    }
    provider?.on?.('accountsChanged', handleAccounts);
    provider?.on?.('chainChanged', handleChain);
    return () => {
      provider?.removeListener?.('accountsChanged', handleAccounts);
      provider?.removeListener?.('chainChanged', handleChain);
    };
  }, []);

  useEffect(() => {
    refreshFactoryRecords(true);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let cancelled = false;

    async function loadChainInfo() {
      setChainInfo((current) => ({ ...current, loading: true, error: '' }));
      try {
        if (!isAddress(MINT_CONTRACT)) {
          if (!cancelled) {
            setChainInfo({
              ...DEFAULT_CHAIN_INFO,
              loading: false,
              error: '',
              tokenAddress: TOKEN_CONTRACT,
              updatedAt: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
            });
          }
          return;
        }

        const [
          ownerRaw,
          tokenAddrRaw,
          priceRaw,
          amountPerUnitsRaw,
          mintLimitRaw,
          mintedRaw,
          whitelistMintedRaw,
          accMintLimitRaw,
          whiteLimitRaw,
          whitelistEnabledRaw,
          finalizedRaw,
          refundDeadlineRaw,
          pairRaw,
          fundAddressRaw,
        ] = await publicRpcBatch([
          { to: MINT_CONTRACT, data: VAULT_VIEW_INTERFACE.encodeFunctionData('owner') },
          { to: MINT_CONTRACT, data: VAULT_VIEW_INTERFACE.encodeFunctionData('token') },
          { to: MINT_CONTRACT, data: VAULT_VIEW_INTERFACE.encodeFunctionData('mintPrice') },
          { to: MINT_CONTRACT, data: VAULT_VIEW_INTERFACE.encodeFunctionData('tokensPerMint') },
          { to: MINT_CONTRACT, data: VAULT_VIEW_INTERFACE.encodeFunctionData('totalMints') },
          { to: MINT_CONTRACT, data: VAULT_VIEW_INTERFACE.encodeFunctionData('mintedCount') },
          { to: MINT_CONTRACT, data: VAULT_VIEW_INTERFACE.encodeFunctionData('whitelistMintedCount') },
          { to: MINT_CONTRACT, data: VAULT_VIEW_INTERFACE.encodeFunctionData('maxMintPerWallet') },
          { to: MINT_CONTRACT, data: VAULT_VIEW_INTERFACE.encodeFunctionData('whitelistMintLimit') },
          { to: MINT_CONTRACT, data: VAULT_VIEW_INTERFACE.encodeFunctionData('whitelistEnabled') },
          { to: MINT_CONTRACT, data: VAULT_VIEW_INTERFACE.encodeFunctionData('finalized') },
          { to: MINT_CONTRACT, data: VAULT_VIEW_INTERFACE.encodeFunctionData('refundDeadline'), optional: true, fallback: '0x0' },
          { to: MINT_CONTRACT, data: VAULT_VIEW_INTERFACE.encodeFunctionData('liquidityPair'), optional: true, fallback: `0x${pad64(ZERO_ADDRESS)}` },
          { to: MINT_CONTRACT, data: VAULT_VIEW_INTERFACE.encodeFunctionData('receiver') },
        ]);

        const tokenAddress = decodeAddress(tokenAddrRaw) || TOKEN_CONTRACT;
        const [nameRaw, symbolRaw, decimalsRaw, totalSupplyRaw] = await publicRpcBatch([
          { to: tokenAddress, data: ERC20_SELECTORS.name },
          { to: tokenAddress, data: ERC20_SELECTORS.symbol },
          { to: tokenAddress, data: ERC20_SELECTORS.decimals },
          { to: tokenAddress, data: ERC20_SELECTORS.totalSupply },
        ]);

        const tokenDecimals = hexToNumber(decimalsRaw) || 18;
        let walletMinted = null;
        let walletWhitelisted = null;
        let walletBalance = '';
        let refundableBnbWei = 0n;

        if (wallet.address) {
          try {
            const [walletMintedRaw, walletWhitelistedRaw, walletBalanceRaw, refundableBnbRaw] = await publicRpcBatch([
              { to: MINT_CONTRACT, data: VAULT_VIEW_INTERFACE.encodeFunctionData('mintedByWallet', [wallet.address]) },
              { to: MINT_CONTRACT, data: VAULT_VIEW_INTERFACE.encodeFunctionData('whitelistList', [wallet.address]) },
              { to: tokenAddress, data: selectorWithAddress(ERC20_SELECTORS.balanceOf, wallet.address) },
              { to: MINT_CONTRACT, data: VAULT_VIEW_INTERFACE.encodeFunctionData('paidByWallet', [wallet.address]), optional: true, fallback: '0x0' },
            ]);
            walletMinted = walletMintedRaw ? hexToNumber(walletMintedRaw) : null;
            walletWhitelisted = walletWhitelistedRaw ? decodeBool(walletWhitelistedRaw) : null;
            walletBalance = walletBalanceRaw ? formatUnits(walletBalanceRaw, tokenDecimals, 4) : '';
            refundableBnbWei = refundableBnbRaw ? hexToBigInt(refundableBnbRaw) : 0n;
          } catch {
            walletMinted = null;
            walletWhitelisted = null;
            walletBalance = '';
            refundableBnbWei = 0n;
          }
        }

        const nowSeconds = Math.floor(Date.now() / 1000);
        const finalized = decodeBool(finalizedRaw);
        const refundDeadline = hexToNumber(refundDeadlineRaw);
        const whitelistEnabled = decodeBool(whitelistEnabledRaw);
        const whitelistMinted = hexToNumber(whitelistMintedRaw);
        const whiteLimit = hexToNumber(whiteLimitRaw);
        const failed = !finalized && refundDeadline > 0 && nowSeconds >= refundDeadline;
        const whitelistPhaseActive = whitelistEnabled && !finalized && !failed && whitelistMinted < whiteLimit;

        const nextInfo = {
          loading: false,
          error: '',
          owner: decodeAddress(ownerRaw),
          tokenAddress,
          tokenName: decodeString(nameRaw) || 'PEPE',
          tokenSymbol: decodeString(symbolRaw) || 'PEPE',
          tokenDecimals,
          totalSupply: formatUnits(totalSupplyRaw, tokenDecimals, 0),
          priceWei: hexToBigInt(priceRaw),
          amountPerUnits: hexToBigInt(amountPerUnitsRaw),
          mintLimit: hexToNumber(mintLimitRaw),
          minted: hexToNumber(mintedRaw),
          accMintLimit: hexToNumber(accMintLimitRaw),
          accEachLimit: 0,
          whiteLimit,
          startWhitelist: whitelistPhaseActive,
          start: !finalized && !failed,
          failed,
          refundDeadline,
          liquidityBnbBps: 10000,
          liquidityTokenBps: 5000,
          pairAddress: decodeAddress(pairRaw),
          fundAddress: decodeAddress(fundAddressRaw),
          walletMinted,
          walletWhitelisted,
          walletBalance,
          refundableBnbWei,
          updatedAt: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        };

        if (cancelled) return;
        setChainInfo(nextInfo);
        setForm((current) => ({
          ...current,
          tokenName: current.tokenName.trim() ? current.tokenName : '',
          symbol: current.symbol.trim() ? current.symbol : '',
        }));
      } catch (error) {
        if (!cancelled) {
          setChainInfo((current) => ({
            ...current,
            loading: false,
            error: error.message || '链上参数读取失败',
          }));
        }
      }
    }

    loadChainInfo();
    return () => {
      cancelled = true;
    };
  }, [wallet.address, chainRefresh]);

  function update(field, value) {
    if (field === 'deadLiquidity' || field === 'renounceOwner') {
      setForm((current) => ({ ...current, [field]: true }));
      return;
    }
    if (field === 'mode') {
      setForm((current) => ({
        ...current,
        mode: value,
        templateId: value === 'mint' ? 'fair-mint' : current.templateId === 'fair-mint' ? 'standard' : current.templateId,
        whitelist: value === 'mint' ? true : false,
      }));
      return;
    }
    setForm((current) => ({ ...current, [field]: value }));
  }

  function notify(message) {
    setToast(message);
  }

  function refreshChainInfo() {
    setChainRefresh((current) => current + 1);
    notify('正在刷新链上参数');
  }

  async function refreshFactoryRecords(silent = false) {
    if (!isAddress(FACTORY_CONTRACT)) return;
    try {
      const factory = new Contract(FACTORY_CONTRACT, FACTORY_VIEW_ABI, getFactoryProvider());
      const count = Number(await factory.allTokensLength());
      setFactoryRecordsCount(count);
      const limit = 50;
      const offset = Math.max(0, count - limit);
      const rows = await factory.getProjects(offset, limit);
      setFactoryRecords(
        rows
          .map((item) => ({
            creator: item.creator,
            token: item.token,
            pair: '',
            pool: item.vault,
            templateId: item.templateId,
            salt: item.templateId,
            valuePaid: item.mintPrice,
            liquidity: 0n,
            blockNumber: 0,
            createdAt: Number(item.createdAt),
            metadataHash: keccak256(toUtf8Bytes(item.metadataUri || '')),
            mintCount: Number(item.mintCount),
            whitelistMintCount: Number(item.whitelistMintCount),
          }))
          .reverse(),
      );
      if (!silent) notify('已刷新链上发射记录');
    } catch (error) {
      if (!silent) notify(error.message || '发射记录读取失败');
    }
  }

  async function mineVanitySalt() {
    const suffix = normalizeHexSuffix(form.vanitySuffix);
    if (!suffix) {
      notify('请先填写想要的合约尾号，例如 8888');
      return;
    }
    if (suffix.length > 6) {
      notify('页面最多帮你生成 6 位尾号；更长尾号建议用脚本离线找 salt');
      return;
    }
    const { address } = await ensureWallet();
    const templateId = getTemplateId(form.templateId);
    if (!templateId) {
      notify('当前模板暂未开放链上发射');
      return;
    }

    setBusy(true);
    try {
      const rawSalt = keccak256(toUtf8Bytes(`${address}-${suffix || 'apple'}-${Date.now()}-${Math.random()}`));
      update('vanitySalt', rawSalt);
      setVanityPreview('');
      notify(suffix ? `已生成 Apple 发射 Salt；尾号 ...${suffix} 由链上工厂校验。` : '已生成 Apple 发射 Salt');
    } catch (error) {
      notify(error.message || '尾号 salt 生成失败');
    } finally {
      setBusy(false);
    }
  }

  function navigateToPage(page) {
    if (!navItems.some((item) => item.id === page)) return;
    setActivePage(page);
  }

  function navigateToMint() {
    setActivePage('launch');
    setLaunchStep('basic');
  }

  function startLaunch(next = {}) {
    setForm((current) => ({
      ...current,
      ...(next.mode ? { mode: next.mode } : {}),
      templateId:
        next.templateId ||
        (next.mode === 'mint' ? 'fair-mint' : next.mode === 'direct' && current.templateId === 'fair-mint' ? 'standard' : current.templateId),
    }));
    setActivePage('launch');
    setLaunchStep(next.step || 'basic');
  }

  async function ensureWallet() {
    const provider = getProvider();
    if (!provider?.request) {
      throw new Error('未检测到真实钱包。请在 TokenPocket / MetaMask / OKX Wallet 等钱包浏览器中打开，或安装浏览器钱包。');
    }
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    const address = accounts?.[0];
    if (!address) throw new Error('钱包未授权连接');
    let chainId = await provider.request({ method: 'eth_chainId' }).catch(() => '');
    if (chainId?.toLowerCase() !== BSC_CHAIN.chainId) {
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BSC_CHAIN.chainId }],
        });
      } catch (error) {
        if (error?.code === 4902) {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [BSC_CHAIN],
          });
        } else {
          throw error;
        }
      }
      chainId = BSC_CHAIN.chainId;
    }
    const nextWallet = { address, chainId, providerName: detectProviderName(provider) };
    setWallet(nextWallet);
    return { provider, address };
  }

  async function connectWallet() {
    try {
      await ensureWallet();
      notify('钱包已连接到 BSC 主网');
    } catch (error) {
      notify(error.message || '钱包连接失败');
    }
  }

  async function requestPayment(amountBnb, purpose) {
    const { provider, address } = await ensureWallet();
    const receiver = [FACTORY_CONTRACT, PAYMENT_RECEIVER].find((item) => isAddress(item));
    if (!receiver) {
      throw new Error('链上执行入口还未准备好，请稍后再发起交易。');
    }
    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: address,
          to: receiver,
          value: toWeiHex(amountBnb),
        },
      ],
    });
    return { txHash, from: address, receiver, purpose };
  }

  async function requestFactoryCreate(currentCheckout) {
    const { provider, address } = await ensureWallet();
    if (!isAddress(FACTORY_CONTRACT)) {
      throw new Error('发币工厂合约还未准备好，暂不能创建新币。');
    }

    const receiver = form.owner && isAddress(form.owner) ? form.owner : address;
    const totalSupply = decimalToUnits(form.totalSupply, 18);
    const mintParams = getFairMintParams(form);
    const dividendParams = getDividendParams(form);
    const templateId = getTemplateId(form.templateId);
    const salt = saltToBytes32(form.vanitySalt, `${address}-${form.symbol}-${form.tokenName}`);
    const whitelistInfo = parseWhitelist(form.whitelistAddresses);
    const zeroTaxMode = form.templateId === 'zero-tax';
    const buyTaxBps = zeroTaxMode ? 0 : percentToBps(form.buyTax);
    const sellTaxBps = zeroTaxMode ? 0 : percentToBps(form.sellTax);
    const burnFeeBps = Math.min(10000, percentToBps(form.burnRate));
    const params = {
      name: form.tokenName.trim(),
      symbol: cleanSymbol(form.symbol),
      metadataUri: JSON.stringify({
        website: String(form.website || '').trim(),
        x: String(form.x || '').trim(),
        telegram: String(form.telegram || '').trim(),
        note: String(form.note || '').trim(),
      }),
      totalSupply,
      mintCount: mintParams.mintLimit,
      mintPrice: mintParams.price,
      maxMintPerWallet: mintParams.accMintLimit,
      paymentToken: ZERO_ADDRESS,
      rewardToken: isAddress(dividendParams.rewardToken) ? dividendParams.rewardToken : ZERO_ADDRESS,
      rewardThreshold: dividendParams.autoClaimThreshold,
      receiver,
      templateId,
      buyTaxBps,
      sellTaxBps,
      transferTaxBps: 0,
      addLiquidityTaxBps: 0,
      removeLiquidityTaxBps: 0,
      launchProtectionTaxBps: 0,
      launchProtectionBlocks: 0,
      claimWait: 0,
      fundFeeBps: 4400,
      lpFeeBps: 1800,
      dividendFeeBps: isDividendTemplate(form.templateId) ? 1600 : 0,
      burnFeeBps,
      whitelistMintCount: form.whitelist ? mintParams.whiteLimit : 0n,
      whitelistEnabled: Boolean(form.whitelist),
    };
    const data = FACTORY_WRITE_INTERFACE.encodeFunctionData('createLaunch', [params, salt]);
    const expectedValue =
      currentCheckout.valueWei && currentCheckout.valueWei !== '0'
        ? BigInt(currentCheckout.valueWei)
        : await getFactoryCreationFeeWei(form);

    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: address,
          to: FACTORY_CONTRACT,
          value: weiHex(expectedValue),
          data,
        },
      ],
    });

    notify('发币交易已发出，正在等待链上确认并解析新币地址。');
    const receipt = await waitForTransactionReceipt(txHash);
    const deployment = parseFactoryDeployment(receipt);
    let whitelistTxHash = '';

    if (deployment?.poolAddress && form.whitelist && whitelistInfo.valid.length > 0) {
      notify('Mint Vault 已创建，正在写入白名单地址。');
      whitelistTxHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: address,
            to: deployment.poolAddress,
            data: encodeWhitelistCall(whitelistInfo.valid, true),
          },
        ],
      });
    }

    return {
      txHash,
      whitelistTxHash,
      from: address,
      receiver: FACTORY_CONTRACT,
      purpose: isDividendTemplate(form.templateId) ? 'factoryCreateDividend' : 'factoryCreate',
      tokenAddress: deployment?.tokenAddress || '',
      pairAddress: deployment?.pairAddress || '',
      poolAddress: deployment?.poolAddress || '',
      blockNumber: deployment?.blockNumber || null,
      confirmed: Boolean(receipt && receipt.status === '0x1'),
      salt,
      actionLabel: form.whitelist ? '创建白名单Mint池' : '创建公开Mint池',
    };
  }

  async function requestLiveMint(currentCheckout) {
    const { provider, address } = await ensureWallet();
    const quantity = Number(currentCheckout.quantity || 1);

    if (chainInfo.failed) {
      throw new Error('当前 Mint 池已进入失败状态，请使用退款入口。');
    }

    if (chainInfo.startWhitelist) {
      const whitelistRaw = await ethCall(provider, MINT_CONTRACT, VAULT_VIEW_INTERFACE.encodeFunctionData('whitelistList', [address])).catch(() => '');
      if (!whitelistRaw || !decodeBool(whitelistRaw)) {
        throw new Error('白名单窗口已开启，当前钱包还不在白名单。');
      }
    }

    if (chainInfo.accMintLimit > 0) {
      const mintedRaw = await ethCall(provider, MINT_CONTRACT, VAULT_VIEW_INTERFACE.encodeFunctionData('mintedByWallet', [address])).catch(() => '');
      const mintedByWallet = mintedRaw ? hexToNumber(mintedRaw) : 0;
      if (mintedByWallet + quantity > chainInfo.accMintLimit) {
        throw new Error('当前钱包已达到 Mint 上限。');
      }
    }

    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: address,
          to: MINT_CONTRACT,
          value: weiHex(currentCheckout.valueWei),
          data: VAULT_WRITE_INTERFACE.encodeFunctionData('mint', [BigInt(quantity)]),
        },
      ],
    });
    return {
      txHash,
      from: address,
      receiver: MINT_CONTRACT,
      tokenAddress: chainInfo.tokenAddress || TOKEN_CONTRACT,
      purpose: 'mint',
      quantity,
    };
  }

  async function requestWhitelistUpdate(currentCheckout) {
    const { provider, address } = await ensureWallet();
    const addresses = currentCheckout.addresses || [];

    if (!sameAddress(address, chainInfo.owner)) {
      throw new Error('当前钱包不是 Mint 合约 Owner，无法写入白名单。');
    }
    if (!addresses.length) {
      throw new Error('请先添加有效白名单地址。');
    }

    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: address,
          to: MINT_CONTRACT,
          data: encodeWhitelistCall(addresses, true),
        },
      ],
    });
    return {
      txHash,
      from: address,
      receiver: MINT_CONTRACT,
      tokenAddress: chainInfo.tokenAddress || TOKEN_CONTRACT,
      purpose: 'whitelist',
      whitelistCount: addresses.length,
    };
  }

  async function requestContractAction(currentCheckout) {
    const { provider, address } = await ensureWallet();

    if (currentCheckout.requiresOwner && !sameAddress(address, chainInfo.owner)) {
      throw new Error('当前钱包不是 Mint 合约 Owner，无法执行该管理操作。');
    }

    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: address,
          to: currentCheckout.receiver,
          data: currentCheckout.data,
          value: '0x0',
        },
      ],
    });

    return {
      txHash,
      from: address,
      receiver: currentCheckout.receiver,
      tokenAddress: currentCheckout.tokenAddress || chainInfo.tokenAddress || TOKEN_CONTRACT,
      purpose: currentCheckout.purpose || 'ownerAction',
      actionLabel: currentCheckout.actionLabel,
    };
  }

  function openPoolRefundCheckout(deployment) {
    if (!deployment || !isAddress(deployment.pool) || sameAddress(deployment.pool, ZERO_ADDRESS)) {
      notify('这条记录没有 Mint 池，不能发起退款。');
      return;
    }
    setCheckout({
      type: 'contractAction',
      title: '手动退款',
      description: '这次会调用该 Apple Mint Vault 的 claimRefund()。只有在未打满并超过退款窗口后，合约才会退回当前钱包的可退余额。',
      amountBnb: '0',
      valueWei: '0',
      receiver: deployment.pool,
      tokenAddress: deployment.token,
      data: VAULT_WRITE_INTERFACE.encodeFunctionData('claimRefund'),
      requiresOwner: false,
      purpose: 'refund',
      actionLabel: '确认退款',
      summary: [
        ['Mint池', shortAddress(deployment.pool)],
        ['Token', shortAddress(deployment.token)],
        ['退款规则', '未满且过期后退可退余额'],
        ['LP规则', '已进 dead LP 的部分不可退'],
      ],
    });
  }

  function handleLogoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      notify('Logo 图片请控制在 2MB 以内');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update('logoData', reader.result);
    reader.readAsDataURL(file);
  }

  function validateLaunch() {
    if (!form.tokenName.trim()) return '请填写代币名称';
    if (!form.symbol.trim()) return '请填写代币符号';
    if (numberValue(form.totalSupply) <= 0) return '代币总量必须大于 0';
    if (!isDeployableTemplate(form.templateId)) return '当前模板暂未开放链上发射，请选择已开放模板';
    if (form.mode === 'mint' && !isFairMintTemplate(form.templateId)) return '自由 Mint 模式请使用公平启动模板';
    if (normalizeHexSuffix(form.vanitySuffix).length !== String(form.vanitySuffix || '').replace(/^0x/i, '').replace(/\s+/g, '').length) {
      return '尾号只能填写 0-9 / a-f 的十六进制字符';
    }
    if (normalizeHexSuffix(form.vanitySuffix).length > 6) return '页面生成盐值建议尾号不超过 6 位，合约最高支持 10 位';
    if (form.owner.trim() && !isAddress(form.owner)) return '项目归属钱包地址格式不正确';
    if (numberValue(form.buyTax) < 0 || numberValue(form.sellTax) < 0) return '税率不能小于 0';
    if (isDividendTemplate(form.templateId)) {
      if (!isAddress(TOKEN_CONTRACT)) return '平台币地址未配置，暂不能创建分红模板';
      if (percentToBps(form.buyTax) + percentToBps(form.sellTax) <= 0) return '分红模板需要设置买税或卖税，用来累积分红池';
      if (percentToBps(form.buyTax) > 1000 || percentToBps(form.sellTax) > 1000) return '分红模板单边税率不能超过 10%';
      if (numberValue(form.autoClaimThreshold) <= 0) return '平台币自动到账门槛必须大于 0';
    }
    if (!form.deadLiquidity) return '平台规则要求底池 LP 全部打入 dead 黑洞';
    const whitelistInfo = parseWhitelist(form.whitelistAddresses);
    if (form.whitelist && whitelistInfo.valid.length === 0) return '已开启白名单，请至少添加 1 个有效钱包地址';
    if (form.whitelist && whitelistInfo.invalid.length > 0) return '白名单里有格式错误的钱包地址，请先修正';
    if (numberValue(form.mintPrice) <= 0) return 'Mint 单价必须大于 0';
    if (numberValue(form.mintSlots) <= 0) return 'Mint 总份数必须大于 0';
    if (form.whitelist && numberValue(form.whiteMintSlots) <= 0) return '白名单总份数必须大于 0';
    if (form.whitelist && numberValue(form.whiteMintSlots) > numberValue(form.mintSlots)) return '白名单总份数不能超过 Mint 总份数';
    if (numberValue(form.maxPerWallet) <= 0) return '每钱包 Mint 上限必须大于 0';
    if (numberValue(form.mintQuantity) <= 0) return '单次 Mint 数量必须大于 0';
    const totalSupply = decimalToUnits(form.totalSupply, 18);
    const mintParams = getFairMintParams(form);
    const requiredSupply = mintParams.amountPerMint * mintParams.mintLimit + mintParams.liquidityTokenAmount;
    if (mintParams.amountPerMint <= 0n) return '总量或 Mint 份数太小，无法计算每份可领代币';
    if (requiredSupply > totalSupply) return '总量不足：Mint 售卖份额 + 毕业进池代币已经超过代币总量';
    return '';
  }

  function openMintCheckout() {
    if (!isAddress(MINT_CONTRACT)) {
      notify('当前 Mint 合约地址无效。');
      return;
    }
    if (chainInfo.failed) {
      notify('当前 Mint 池已失败，请使用退款入口。');
      return;
    }

    const available = getAvailableMintLimit(chainInfo, Boolean(wallet.address));
    if (available === 0) {
      notify('当前 Mint 已达到合约限制。');
      return;
    }

    const requested = Math.max(1, Math.floor(numberValue(form.mintQuantity)));
    const quantity = available > 0 ? Math.min(requested, available) : requested;
    if (quantity !== requested) {
      update('mintQuantity', String(quantity));
      notify(`已按合约上限调整为 ${quantity} 份`);
    }

    const priceWei = chainInfo.priceWei > 0n ? chainInfo.priceWei : decimalToUnits('0.01', 18);
    const tokenSymbol = chainInfo.tokenSymbol || 'Babypepe';
    const amountPerUnits = chainInfo.amountPerUnits > 0n ? chainInfo.amountPerUnits : decimalToUnits('70000', chainInfo.tokenDecimals || 18);
    const amountWei = priceWei * BigInt(quantity);
    setCheckout({
      type: 'mintLive',
      title: `Mint：${tokenSymbol}`,
      description: '这次会直接向 Mint 合约发送 BNB，钱包弹窗里的接收地址应为当前 Mint 合约。',
      amountBnb: formatBnbFromWei(amountWei, 8),
      valueWei: amountWei.toString(),
      quantity,
      receiver: MINT_CONTRACT,
      actionLabel: '确认 Mint',
      summary: [
        ['Mint 合约', shortAddress(MINT_CONTRACT)],
        ['代币合约', shortAddress(chainInfo.tokenAddress || TOKEN_CONTRACT)],
        ['每份单价', `${formatBnbFromWei(priceWei, 8)} BNB`],
        ['每份获得', `${formatUnits(amountPerUnits, chainInfo.tokenDecimals || 18, 4)} ${tokenSymbol}`],
        ['本次数量', `${quantity} 份`],
        ['Mint 状态', mintStatusLabel(chainInfo)],
      ],
    });
  }

  function openWhitelistCheckout() {
    const whitelistInfo = parseWhitelist(form.whitelistAddresses);
    if (whitelistInfo.invalid.length > 0) {
      notify('白名单里有格式错误的钱包地址，请先修正。');
      return;
    }
    if (!whitelistInfo.valid.length) {
      notify('请至少添加 1 个有效白名单地址。');
      return;
    }
    if (wallet.address && chainInfo.owner && !sameAddress(wallet.address, chainInfo.owner)) {
      notify('当前钱包不是 Mint 合约 Owner，无法写入白名单。');
      return;
    }

    setCheckout({
      type: 'whitelist',
      title: `写入白名单：${whitelistInfo.valid.length} 个地址`,
      description: '这次会调用 Mint 合约的白名单批量写入方法，只有 Owner 钱包可以成功执行。',
      amountBnb: '0',
      valueWei: '0',
      addresses: whitelistInfo.valid,
      receiver: MINT_CONTRACT,
      actionLabel: '确认写入白名单',
      summary: [
        ['Mint 合约', shortAddress(MINT_CONTRACT)],
        ['Owner', shortAddress(chainInfo.owner)],
        ['白名单地址', `${whitelistInfo.valid.length} 个`],
        ['错误地址', `${whitelistInfo.invalid.length} 个`],
      ],
    });
  }

  async function openFactoryPlanCheckout() {
    const validation = validateLaunch();
    if (validation) {
      notify(validation);
      return;
    }

    const factoryReady = isAddress(FACTORY_CONTRACT);
    let factoryFeeWei = 0n;
    if (factoryReady) {
      try {
        factoryFeeWei = await getFactoryCreationFeeWei(form);
      } catch {
        notify('工厂费用读取失败，确认时会再次按链上费用读取。');
      }
    }

    const whitelistInfo = parseWhitelist(form.whitelistAddresses);
    const dividendMode = isDividendTemplate(form.templateId);
    const mintParams = getFairMintParams(form);
    const mintLaunchName = form.whitelist ? '白名单 Mint 池' : '公开 Mint 池';
    const templateId = getTemplateId(form.templateId);
    const suffix = normalizeHexSuffix(form.vanitySuffix);
    const totalValueWei = factoryReady ? factoryFeeWei : 0n;
    setCheckout({
      type: factoryReady ? 'factoryCreate' : 'factoryPlan',
      title: `发币工厂方案：${form.tokenName || 'Pepe Token'}`,
      description: factoryReady
        ? `这次会调用 Apple/Kaola 发币工厂创建新的 AppleToken + AppleMintVault。请在钱包里核对工厂地址、创建费和网络。`
        : '自助发新币需要先部署发币工厂合约。当前不会拉起钱包转账，先把你的发币参数整理成工厂部署方案。',
      amountBnb: factoryReady ? formatBnbFromWei(totalValueWei, 8) : '0',
      valueWei: totalValueWei.toString(),
      actionLabel: factoryReady ? (form.whitelist ? '确认创建白名单Mint池' : '确认创建公开Mint池') : '继续配置参数',
      summary: [
        ['工厂状态', factoryReady ? '可发真实创建交易' : '等待链上地址'],
        ['工厂合约', factoryReady ? shortAddress(FACTORY_CONTRACT) : '准备中'],
        ['发射模式', selectedMode.title],
        ['合约模板', selectedTemplate.name],
        ['模板ID', shortAddress(String(templateId))],
        ['链上动作', `创建${mintLaunchName}`],
        ['创建方法', 'AppleToken + AppleMintVault，每笔 Mint 自动加池'],
        ['代币总量', formatNumber(form.totalSupply, 0)],
        ['创建费', factoryReady ? `${formatBnbFromWei(factoryFeeWei, 8)} BNB` : '部署后链上读取'],
        ['Mint单价', `${formatBnbFromWei(mintParams.price, 8)} BNB`],
        ['Mint总份数', `${mintParams.mintLimit.toString()} 份`],
        ...(form.whitelist ? [['白名单总份数', `${mintParams.whiteLimit.toString()} 份`]] : []),
        ['每笔自动加池', 'BNB 100% / 代币 50%'],
        ['手动退款窗口', '24 小时'],
        ['配池代币储备', `${formatUnits(mintParams.liquidityTokenAmount, 18, 4)} ${cleanSymbol(form.symbol) || 'PEPE'}`],
        ...(dividendMode
          ? [
              ['分红平台币', shortAddress(TOKEN_CONTRACT)],
              ['自动到账门槛', `${form.autoClaimThreshold || 4} 平台币`],
              ['买/卖税', `${form.buyTax}% / ${form.sellTax}%`],
            ]
          : []),
        ['LP接收', shortAddress(DEAD_ADDRESS)],
        ['尾号定制', suffix ? `...${suffix}` : '未指定'],
        ['Salt', form.vanitySalt ? shortAddress(saltToBytes32(form.vanitySalt)) : '确认时自动生成'],
        ['权限', 'Token / Mint Vault Owner 给项目方，打满后 LP 进 dead'],
        ['接收钱包', form.owner && isAddress(form.owner) ? shortAddress(form.owner) : wallet.address ? shortAddress(wallet.address) : '确认时连接'],
        ['白名单', form.whitelist ? `${whitelistInfo.valid.length} 个地址 / ${mintParams.whiteLimit.toString()} 份` : '未开启'],
      ],
    });
  }

  function openContractActionCheckout(actionId) {
    if (chainInfo.loading) {
      notify('正在读取链上参数，请稍后再试。');
      return;
    }
    if (chainInfo.error) {
      notify('链上参数读取失败，请先刷新。');
      return;
    }
    if (wallet.address && chainInfo.owner && !sameAddress(wallet.address, chainInfo.owner)) {
      notify('当前钱包不是 Mint 合约 Owner，无法执行管理操作。');
      return;
    }

    const actions = {
      enableWhitelist: {
        title: '开启白名单窗口',
        description: '这次会调用 Apple Mint Vault 的 setWhitelistEnabled(true)，重新打开白名单窗口。',
        receiver: MINT_CONTRACT,
        data: VAULT_WRITE_INTERFACE.encodeFunctionData('setWhitelistEnabled', [true]),
        summary: [
          ['Mint合约', shortAddress(MINT_CONTRACT)],
          ['白名单名额', `${chainInfo.whiteLimit || 0} 份`],
        ],
      },
      disableWhitelist: {
        title: '开启公开 Mint',
        description: '这次会调用 Apple Mint Vault 的 setWhitelistEnabled(false)，剩余份数进入公开 Mint。',
        receiver: MINT_CONTRACT,
        data: VAULT_WRITE_INTERFACE.encodeFunctionData('setWhitelistEnabled', [false]),
        summary: [['Mint合约', shortAddress(MINT_CONTRACT)]],
      },
    };

    const action = actions[actionId];
    if (!action) return;

    setCheckout({
      type: 'contractAction',
      title: action.title,
      description: action.description,
      amountBnb: '0',
      valueWei: '0',
      receiver: action.receiver,
      data: action.data,
      requiresOwner: true,
      purpose: actionId,
      actionLabel: action.title,
      summary: [['Owner', shortAddress(chainInfo.owner)], ...action.summary],
    });
  }

  function submitLaunch(event) {
    event.preventDefault();
    if (form.mode === 'direct' || form.mode === 'mint') {
      openFactoryPlanCheckout();
      return;
    }

    const validation = validateLaunch();
    if (validation) {
      notify(validation);
      return;
    }
    const amountBnb = formatBnb(launchAmount);
    const whitelistInfo = parseWhitelist(form.whitelistAddresses);
    setCheckout({
      type: 'launch',
      title: `登上擂台：${form.tokenName} (${form.symbol})`,
      amountBnb,
      summary: [
        ['发射模式', selectedMode.title],
        ['合约模板', selectedTemplate.name],
        ['代币总量', formatNumber(form.totalSupply, 0)],
        ['底池规则', form.deadLiquidity ? `LP 转 ${shortAddress(DEAD_ADDRESS)}` : '手动确认底池规则'],
        ['Owner', '项目方管理，Mint 打满后 LP 黑洞'],
        ['白名单', form.whitelist ? `${whitelistInfo.valid.length} 个地址` : '未开启'],
      ],
    });
  }

  async function confirmCheckout() {
    if (!checkout || busy) return;
    if (checkout.type === 'factoryPlan') {
      setCheckout(null);
      setActivePage('launch');
      setLaunchStep('basic');
      notify('发币参数已保留，工厂合约准备好后即可发起真实创建交易。');
      return;
    }
    setBusy(true);
    try {
      let payment;
      if (checkout.type === 'mintLive') {
        payment = await requestLiveMint(checkout);
      } else if (checkout.type === 'whitelist') {
        payment = await requestWhitelistUpdate(checkout);
      } else if (checkout.type === 'contractAction') {
        payment = await requestContractAction(checkout);
      } else if (checkout.type === 'factoryCreate') {
        payment = await requestFactoryCreate(checkout);
      } else {
        payment = await requestPayment(checkout.amountBnb, checkout.type);
      }
      const actionName =
        checkout.type === 'mintLive'
          ? 'Mint'
          : checkout.type === 'whitelist'
            ? '白名单写入'
            : checkout.type === 'contractAction'
              ? checkout.actionLabel || '合约管理'
              : checkout.type === 'factoryCreate'
                ? '创建新币'
                : '发射';
      const result = {
        ...payment,
        amountBnb: checkout.amountBnb,
        action: actionName,
        tokenName: form.tokenName.trim(),
        symbol: form.symbol.trim(),
        template: selectedTemplate.name,
        mode: selectedMode.title,
        createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      };
      setLastResult(result);
      setCheckout(null);
      setChainRefresh((current) => current + 1);
      if (checkout.type === 'factoryCreate') await refreshFactoryRecords(true);
      notify(
        checkout.type === 'factoryCreate' && result.tokenAddress
          ? '新币已发射，Token 地址已解析并写入发射记录。'
          : checkout.type === 'whitelist'
            ? '白名单交易已发出，等待链上确认。'
            : '真实钱包交易已发出，等待链上确认。',
      );
      setActivePage('launch');
      setLaunchStep('preview');
    } catch (error) {
      notify(error.message || '交易未完成');
    } finally {
      setBusy(false);
    }
  }

  async function copyText(value, label) {
    try {
      await navigator.clipboard.writeText(value);
      notify(`${label}已复制`);
    } catch {
      notify('复制失败，请手动复制');
    }
  }

  return (
    <div className="app">
      <div className="bg-layer" />
      <Topbar
        wallet={wallet}
        activePage={activePage}
        navigate={navigateToPage}
        navigateToMint={navigateToMint}
        connectWallet={connectWallet}
      />
      <main className="shell page-shell">
        <div className="page-stage">
          {activePage === 'arena' && (
            <HomePage
              form={form}
              wallet={wallet}
              selectedMode={selectedMode}
              selectedTemplate={selectedTemplate}
              chainInfo={chainInfo}
              update={update}
              navigate={navigateToPage}
              connectWallet={connectWallet}
              openMintCheckout={openMintCheckout}
            />
          )}
          {activePage === 'rules' && <RulesPage />}
          {activePage === 'templates' && (
            <TemplateSection selectedTemplate={selectedTemplate} selectTemplate={(id) => update('templateId', id)} startLaunch={startLaunch} />
          )}
          {activePage === 'modes' && <ModeSection startLaunch={startLaunch} />}
          {activePage === 'launch' && (
            <LaunchWorkbench
              form={form}
              wallet={wallet}
              selectedMode={selectedMode}
              selectedTemplate={selectedTemplate}
              launchAmount={launchAmount}
              mintRaise={mintRaise}
              update={update}
              submitLaunch={submitLaunch}
              connectWallet={connectWallet}
              handleLogoUpload={handleLogoUpload}
              copyText={copyText}
              lastResult={lastResult}
              launchStep={launchStep}
              setLaunchStep={setLaunchStep}
              chainInfo={chainInfo}
              mineVanitySalt={mineVanitySalt}
              vanityPreview={vanityPreview}
              factoryRecords={factoryRecords}
              factoryRecordsCount={factoryRecordsCount}
              refreshFactoryRecords={refreshFactoryRecords}
              onSelectDeployment={setSelectedDeployment}
              busy={busy}
            />
          )}
          {activePage === 'deployments' && (
            <DeploymentsPage
              records={factoryRecords}
              total={factoryRecordsCount}
              refreshFactoryRecords={refreshFactoryRecords}
              onSelectDeployment={setSelectedDeployment}
              startLaunch={startLaunch}
            />
          )}
          {activePage === 'manifesto' && <ManifestoSection />}
        </div>
        <PagePager activePage={activePage} navigate={navigateToPage} />
      </main>
      {checkout && (
        <CheckoutModal
          checkout={checkout}
          wallet={wallet}
          busy={busy}
          confirm={confirmCheckout}
          cancel={() => setCheckout(null)}
        />
      )}
      {selectedDeployment && (
        <DeploymentDetailModal
          deployment={selectedDeployment}
          onRefund={openPoolRefundCheckout}
          close={() => setSelectedDeployment(null)}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Topbar({ wallet, activePage, navigate, navigateToMint, connectWallet }) {
  return (
    <header className="topbar">
      <button className="brand" onClick={() => navigate('arena')} type="button">
        <span className="brand-mark">
          <FrogMark compact />
        </span>
        <span>
          <b>PEPE发射擂台</b>
          <small>BSC版公平发币工具</small>
        </span>
      </button>
      <nav className="nav" aria-label="页面导航">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button key={id} className={activePage === id ? 'active' : ''} onClick={() => navigate(id)} type="button">
            <Icon size={15} />
            {label}
          </button>
        ))}
      </nav>
      <button className={`mobile-mint-row ${activePage === 'launch' ? 'active' : ''}`} onClick={navigateToMint} type="button">
        <Coins size={18} />
        <span>
          <b>创建Mint池</b>
          <small>{LAUNCH_FEE_BNB} 起 · 白名单 {WHITELIST_LAUNCH_FEE_BNB}</small>
        </span>
        <ChevronRight size={17} />
      </button>
      <button className="wallet-btn" onClick={connectWallet} type="button">
        <Wallet size={17} />
        {wallet.address ? shortAddress(wallet.address) : '连接钱包'}
      </button>
    </header>
  );
}

function HomePage({ form, wallet, selectedMode, selectedTemplate, chainInfo, update, navigate, connectWallet, openMintCheckout }) {
  return (
    <>
      <ActiveMintProject wallet={wallet} chainInfo={chainInfo} connectWallet={connectWallet} openMintCheckout={openMintCheckout} />
      <Hero
        form={form}
        wallet={wallet}
        selectedMode={selectedMode}
        selectedTemplate={selectedTemplate}
        update={update}
        navigate={navigate}
        connectWallet={connectWallet}
      />
      <MetricStrip />
    </>
  );
}

function ActiveMintProject({ wallet, chainInfo, connectWallet, openMintCheckout }) {
  const tokenName = chainInfo.tokenName || 'Babypepe';
  const tokenSymbol = chainInfo.tokenSymbol || 'Babypepe';
  const mintLimit = Math.max(0, chainInfo.mintLimit || 0);
  const minted = Math.max(0, chainInfo.minted || 0);
  const progress = mintLimit > 0 ? Math.min(100, (minted / mintLimit) * 100) : 0;
  const mintPrice = chainInfo.priceWei > 0n ? formatBnbFromWei(chainInfo.priceWei, 8) : '0.01';
  const amountPerMint = chainInfo.amountPerUnits > 0n ? formatUnits(chainInfo.amountPerUnits, chainInfo.tokenDecimals, 4) : '70000';
  const whitelistLabel =
    chainInfo.walletWhitelisted === true
      ? '当前钱包在白名单'
      : chainInfo.walletWhitelisted === false
        ? '当前钱包未在白名单'
        : wallet.address
          ? '白名单读取中'
          : '连接钱包检查白名单';

  return (
    <section className="active-mint-panel" id="active-mint">
      <div className="active-mint-copy">
        <span className="eyebrow">Live Mint</span>
        <h2>{tokenName}</h2>
        <p>白名单 Mint 已接入台子，用户可以从这里直接进入 Mint。价格、进度和状态均从链上 Mint 合约读取。</p>
        <div className="active-mint-tags">
          <span className="status-pill green">{mintStatusLabel(chainInfo)}</span>
          <span className="status-pill cyan">{whitelistLabel}</span>
          <span className="status-pill green">0.01 BNB / 份</span>
        </div>
      </div>
      <div className="active-mint-card">
        <div className="token-preview compact-preview">
          <div className="preview-logo frog-preview">
            <FrogMark />
          </div>
          <div>
            <b>{tokenName}</b>
            <span>{tokenSymbol} · BSC 白名单 Mint</span>
          </div>
        </div>
        <div className="mint-progress-row">
          <span>
            <em>Mint进度</em>
            <b>
              {minted}/{mintLimit || '--'} 份
            </b>
          </span>
          <strong>{progress.toFixed(2)}%</strong>
        </div>
        <div className="progress-track" aria-label="Mint进度">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="active-mint-actions">
          {!wallet.address && (
            <button className="secondary" onClick={connectWallet} type="button">
              <Wallet size={16} />
              连接钱包
            </button>
          )}
          <button className="primary" onClick={openMintCheckout} type="button">
            <Coins size={16} />
            马上 Mint
          </button>
          <a className="secondary" href={addressUrl(MINT_CONTRACT)} target="_blank" rel="noreferrer">
            <ExternalLink size={15} />
            Mint合约
          </a>
          <a className="secondary" href={addressUrl(TOKEN_CONTRACT)} target="_blank" rel="noreferrer">
            <ExternalLink size={15} />
            代币合约
          </a>
        </div>
        <div className="preview-lines active-mint-lines">
          <MiniMetric label="Mint价格" value={`${mintPrice} BNB`} />
          <MiniMetric label="每份获得" value={`${amountPerMint} ${tokenSymbol}`} />
          <MiniMetric label="Mint合约" value={shortAddress(MINT_CONTRACT)} />
          <MiniMetric label="代币合约" value={shortAddress(TOKEN_CONTRACT)} />
        </div>
      </div>
    </section>
  );
}

function Hero({ form, wallet, selectedMode, selectedTemplate, update, navigate, connectWallet }) {
  return (
    <section className="hero-panel" id="arena">
      <div className="hero-copy">
        <span className="eyebrow">PEPE Launch Arena · BSC</span>
        <h1>PEPE发射擂台 · BSC版</h1>
        <p className="hero-lead">让每一只 meme 都能冲向月球。这里不画饼，不锁仓，不砸盘，只把公平、底池、代码和钱包交易摆到台面上。</p>
        <div className="fair-grid">
          {fairClaims.map(([title, text]) => (
            <span key={title}>
              <XCircle size={16} />
              <b>{title}</b>
              <em>{text}</em>
            </span>
          ))}
        </div>
        <div className="hero-actions">
          <button className="primary" onClick={() => navigate('launch')} type="button">
            <Rocket size={17} />
            立即登上擂台
          </button>
          <button className="secondary" onClick={() => navigate('templates')} type="button">
            <FileCheck2 size={17} />
            查看模板
          </button>
        </div>
      </div>
      <aside className="hero-console">
        <ArenaVisual />
        <div className="quick-launch">
          <div className="panel-title compact">
            <SlidersHorizontal size={18} />
            <h2>快速登台</h2>
          </div>
          <ModeToggle value={form.mode} onChange={(value) => update('mode', value)} />
          <div className="quick-fields">
            <label>
              <span>代币名称</span>
              <input value={form.tokenName} onChange={(event) => update('tokenName', event.target.value)} placeholder="Pepe Fighter" />
            </label>
            <label>
              <span>符号</span>
              <input value={form.symbol} onChange={(event) => update('symbol', cleanSymbol(event.target.value))} placeholder="PEPE" />
            </label>
          </div>
          <div className="quick-receipt">
            <span>
              <em>模式</em>
              <b>{selectedMode.title}</b>
            </span>
            <span>
              <em>模板</em>
              <b>{selectedTemplate.name}</b>
            </span>
            <span>
              <em>钱包</em>
              <b>{wallet.address ? shortAddress(wallet.address) : '未连接'}</b>
            </span>
          </div>
          <div className="quick-actions">
            {!wallet.address && (
              <button className="secondary" onClick={connectWallet} type="button">
                <Wallet size={16} />
                连接
              </button>
            )}
            <button className="primary" onClick={() => navigate('launch')} type="button">
              完善参数
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </aside>
    </section>
  );
}

function ArenaVisual() {
  return (
    <div className="arena-visual" aria-label="PEPE 青蛙擂台主视觉">
      <img src={pepeArenaArt} alt="PEPE 青蛙站在月球擂台前" />
      <span className="ring-pulse one" />
      <span className="ring-pulse two" />
      <div className="visual-chip top">
        <LockKeyhole size={15} />
        {'LP -> dead'}
      </div>
      <div className="visual-chip bottom">
        <BadgeCheck size={15} />
        BscScan Verify
      </div>
    </div>
  );
}

function MetricStrip() {
  const metrics = [
    [FileCheck2, '开放模板', `${templates.filter((item) => item.deployable).length}个`],
    [Gauge, '发射模式', '2种'],
    [LockKeyhole, '底池规则', 'dead黑洞'],
    [Wallet, '钱包网络', 'BSC主网'],
  ];
  return (
    <section className="metric-strip" aria-label="平台核心指标">
      {metrics.map(([Icon, label, value]) => (
        <article className="metric-card" key={label}>
          <Icon size={21} />
          <span>{label}</span>
          <b>{value}</b>
        </article>
      ))}
    </section>
  );
}

function PrincipleSection() {
  return (
    <section className="section-panel principle-panel">
      <SectionHead
        eyebrow="Arena Rules"
        title="公平不是口号，是写进规则"
        text="没有 VC、没有内幕、没有花里胡哨的解锁。你站上去，挥拳，发射，剩下的交给市场去狂热。"
      />
      <div className="rule-grid">
        <RuleCard icon={ShieldCheck} title="代码全公开" text="模板协议开源、预审计、BscScan 自动验证，让用户读得到、查得到、复核得到。" />
        <RuleCard icon={LockKeyhole} title="黑洞底池" text={`PancakeSwap 初始 LP 或 Mint 累积底池自动转入 ${shortAddress(DEAD_ADDRESS)}。`} />
        <RuleCard icon={Users} title="无预挖公平" text="自由 Mint 模式无初始分配，全员同入口，杜绝老鼠仓和提前埋伏。" />
      </div>
    </section>
  );
}

function RulesPage() {
  return (
    <>
      <PrincipleSection />
      <FlowSection />
    </>
  );
}

function PagePager({ activePage, navigate }) {
  const currentIndex = pageIndex(activePage);
  const previous = navItems[currentIndex - 1];
  const next = navItems[currentIndex + 1];
  const current = navItems[currentIndex] || navItems[0];
  return (
    <div className="page-pager" aria-label="页面分页">
      <button className="secondary" disabled={!previous} onClick={() => previous && navigate(previous.id)} type="button">
        {previous ? previous.label : '已经到首页'}
      </button>
      <span>
        <b>{String(currentIndex + 1).padStart(2, '0')}</b>
        <em>{current.label}</em>
      </span>
      <button className="primary" disabled={!next} onClick={() => next && navigate(next.id)} type="button">
        {next ? next.label : '已经到最后'}
        {next && <ChevronRight size={16} />}
      </button>
    </div>
  );
}

function TemplateSection({ selectedTemplate, selectTemplate, startLaunch }) {
  return (
    <section className="section-panel" id="templates">
      <SectionHead
        eyebrow="Contract Templates"
        title="多种模板协议，像选皮肤一样发币"
        text="标准、零税、黑洞底池、无 Owner、平台币分红和白名单 Mint 池都已开放；所有发射都会按规则处理黑洞底池。"
      />
      <div className="section-actions">
        <button
          className="primary"
          onClick={() => {
            const templateId = selectedTemplate.deployable ? selectedTemplate.id : 'standard';
            startLaunch({ mode: templateId === 'fair-mint' ? 'mint' : 'direct', templateId, step: 'basic' });
          }}
          type="button"
        >
          <Rocket size={16} />
          用当前模板发币
        </button>
        <button className="secondary" onClick={() => startLaunch({ mode: 'direct', templateId: 'standard', step: 'basic' })} type="button">
          <SlidersHorizontal size={16} />
          打开发币表单
        </button>
      </div>
      <div className="template-grid showcase">
        {templates.map((template) => (
          <button
            className={`template-card ${selectedTemplate.id === template.id ? 'active' : ''}`}
            key={template.id}
            onClick={() => {
              selectTemplate(template.id);
              if (template.deployable) {
                startLaunch({ mode: template.id === 'fair-mint' ? 'mint' : 'direct', templateId: template.id, step: 'basic' });
              }
            }}
            type="button"
          >
            <span>
              <small>{template.tag}</small>
              <b>{template.name}</b>
              <em>{template.text}</em>
              <i>{template.deployable ? '已开放 · 点此发币' : '规划中'}</i>
            </span>
            {selectedTemplate.id === template.id && <CheckCircle2 size={18} />}
          </button>
        ))}
      </div>
    </section>
  );
}

function ModeSection({ startLaunch }) {
  return (
    <section className="section-panel" id="modes">
      <SectionHead
        eyebrow="Launch Modes"
        title="两种发射姿势：标准发射 / 自由 Mint"
        text="你可以用 1 分钟发起一场 Pepe 战役，也可以把 Mint 曲线、毕业目标和底池规则配置得更完整。"
      />
      <div className="section-actions">
        <button className="primary" onClick={() => startLaunch({ mode: 'direct', step: 'basic' })} type="button">
          <Rocket size={16} />
          开始标准发射
        </button>
        <button className="secondary" onClick={() => startLaunch({ mode: 'mint', step: 'basic' })} type="button">
          <Coins size={16} />
          去 Mint 面板
        </button>
      </div>
      <div className="mode-grid">
        {launchModes.map(({ id, title, kicker, text, icon: Icon }) => (
          <article className="mode-card" key={id}>
            <Icon size={23} />
            <span>{kicker}</span>
            <h3>{title}</h3>
            <p>{text}</p>
            <ul>
              {(id === 'direct'
                ? ['设定总量与税率', '创建 AppleToken + MintVault', 'Mint 自动形成 dead LP']
                : ['设定 Mint 单价与份数', '每钱包上限与白名单', 'Mint BNB 自动组成底池']
              ).map((item) => (
                <li key={item}>
                  <CheckCircle2 size={15} />
                  {item}
                </li>
              ))}
            </ul>
            <button className={id === 'direct' ? 'primary mode-action' : 'secondary mode-action'} onClick={() => startLaunch({ mode: id, step: 'basic' })} type="button">
              {id === 'direct' ? <Rocket size={15} /> : <Coins size={15} />}
              {id === 'direct' ? '开始发射' : '打开 Mint'}
            </button>
          </article>
        ))}
        <article className="dead-card">
          <LockKeyhole size={24} />
          <span>最强底池保险</span>
          <h3>自动转黑洞</h3>
          <p>所有通过平台发射的代币，初始底池或 Mint 累积底池都会按规则打入 dead 地址。没有平台、Owner 或项目方可以撤走底池。</p>
          <code>{DEAD_ADDRESS}</code>
        </article>
      </div>
    </section>
  );
}

function LaunchWorkbench({
  form,
  wallet,
  selectedMode,
  selectedTemplate,
  launchAmount,
  mintRaise,
  update,
  submitLaunch,
  connectWallet,
  handleLogoUpload,
  copyText,
  lastResult,
  launchStep,
  setLaunchStep,
  chainInfo,
  mineVanitySalt,
  vanityPreview,
  factoryRecords,
  factoryRecordsCount,
  refreshFactoryRecords,
  onSelectDeployment,
  busy,
}) {
  const currentStepIndex = launchStepIndex(launchStep);
  const previousStep = launchWizardSteps[currentStepIndex - 1];
  const nextStep = launchWizardSteps[currentStepIndex + 1];
  const whitelistInfo = parseWhitelist(form.whitelistAddresses);
  const tokenSymbol = chainInfo.tokenSymbol || form.symbol || 'PEPE';
  const liveMintPrice = chainInfo.priceWei > 0n ? formatBnbFromWei(chainInfo.priceWei, 8) : form.mintPrice;
  const liveTokensPerMint =
    chainInfo.amountPerUnits > 0n ? formatUnits(chainInfo.amountPerUnits, chainInfo.tokenDecimals, 4) : form.tokensPerMint;
  const mintProgress = chainInfo.mintLimit ? `${chainInfo.minted}/${chainInfo.mintLimit}` : `${chainInfo.minted || 0}`;
  const mintParams = getFairMintParams(form);
  const selectedMintPlaybook = form.whitelist ? 'whitelist' : 'public';

  function chooseMintPlaybook(playbook) {
    update('templateId', 'fair-mint');
    update('whitelist', playbook.whitelist);
    update('priceCurve', playbook.priceCurve);
  }

  return (
    <section className="section-panel launch-panel" id="launch">
      <SectionHead
        eyebrow="Launch Console"
        title="登上你的擂台"
        text="按步骤配置发射模式、基础信息、参数和规则，最后预览并拉起真实钱包交易。"
      />
      <form className="launch-workbench" onSubmit={submitLaunch}>
        <div className="launch-main paged-form">
          <LaunchStepper value={launchStep} onChange={setLaunchStep} />

          {launchStep === 'mode' && (
            <fieldset className="wizard-fieldset">
              <legend>发射模式</legend>
              <ModeCards value={form.mode} onChange={(value) => update('mode', value)} />
            </fieldset>
          )}

          {launchStep === 'basic' && (
            <fieldset className="wizard-fieldset">
              <legend>基础信息</legend>
              <FormField label="代币名称">
                <input value={form.tokenName} onChange={(event) => update('tokenName', event.target.value)} placeholder="Pepe Fighter" />
              </FormField>
              <FormField label="代币符号">
                <input value={form.symbol} onChange={(event) => update('symbol', cleanSymbol(event.target.value))} placeholder="PEPE" />
              </FormField>
              <FormField label="代币总量">
                <input value={form.totalSupply} onChange={(event) => update('totalSupply', event.target.value)} inputMode="decimal" />
              </FormField>
              <FormField label="项目归属钱包">
                <input value={form.owner} onChange={(event) => update('owner', event.target.value)} placeholder={wallet.address || '0x...'} />
              </FormField>
              {form.mode === 'mint' ? (
                <FormField label="Mint玩法" wide>
                  <div className="template-picker mint-playbook-picker">
                    {mintPlaybooks.map((playbook) => (
                      <button
                        className={selectedMintPlaybook === playbook.id ? 'active' : ''}
                        key={playbook.id}
                        onClick={() => chooseMintPlaybook(playbook)}
                        type="button"
                      >
                        <span>{playbook.name}</span>
                        <small>{playbook.tag}</small>
                        <em>{playbook.text}</em>
                      </button>
                    ))}
                  </div>
                  <small className="field-hint">底层合约：公平启动模板 · 模板ID 20</small>
                </FormField>
              ) : (
                <FormField label="合约模板" wide>
                  <div className="template-picker">
                    {templates
                      .filter((template) => template.deployable)
                      .filter((template) => template.id !== 'fair-mint')
                      .map((template) => (
                      <button
                        className={form.templateId === template.id ? 'active' : ''}
                        key={template.id}
                        onClick={() => update('templateId', template.id)}
                        type="button"
                      >
                        <span>{template.name}</span>
                        <small>{template.tag}</small>
                      </button>
                    ))}
                  </div>
                </FormField>
              )}
              <FormField label="Pepe风格Logo" wide>
                <div className="logo-uploader">
                  <label>
                    <Upload size={16} />
                    上传 Logo
                    <input accept="image/*" onChange={handleLogoUpload} type="file" />
                  </label>
                  <div className="logo-preview">
                    {form.logoData ? <img alt="代币 Logo 预览" src={form.logoData} /> : <FrogMark />}
                  </div>
                </div>
              </FormField>
            </fieldset>
          )}

          {launchStep === 'params' && (
            <fieldset className="wizard-fieldset">
              <legend>Apple Mint Vault 参数</legend>
              <FormField label="每份支付 BNB">
                <input value={form.mintPrice} onChange={(event) => update('mintPrice', event.target.value)} inputMode="decimal" />
              </FormField>
              <FormField label="每份获得代币">
                <input value={formatUnits(mintParams.amountPerMint, 18, 4)} disabled readOnly />
                <small className="field-hint">Apple Vault 按总量自动计算：50% 用于 Mint，50% 作为每笔加池储备。</small>
              </FormField>
              <FormField label="Mint 总份数">
                <input value={form.mintSlots} onChange={(event) => update('mintSlots', event.target.value)} inputMode="decimal" />
              </FormField>
              {form.whitelist && (
                <FormField label="白名单总份数">
                  <input value={form.whiteMintSlots} onChange={(event) => update('whiteMintSlots', event.target.value)} inputMode="decimal" />
                </FormField>
              )}
              <FormField label="每钱包上限">
                <input value={form.maxPerWallet} onChange={(event) => update('maxPerWallet', event.target.value)} inputMode="decimal" />
              </FormField>
              <FormField label="本次 Mint 数量">
                <input
                  min="1"
                  type="number"
                  value={form.mintQuantity}
                  onChange={(event) => update('mintQuantity', event.target.value)}
                  inputMode="numeric"
                />
              </FormField>
              <FormField label="BNB进池比例%">
                <input value="100" disabled readOnly />
                <small className="field-hint">Apple Vault 固定每笔 Mint 支付 100% 自动加池。</small>
              </FormField>
              <FormField label="代币配池比例%">
                <input value="50" disabled readOnly />
                <small className="field-hint">Apple Vault 固定预留总量 50% 作为配池代币储备。</small>
              </FormField>
              <FormField label="手动退款窗口">
                <input value="24 小时" disabled readOnly />
                <small className="field-hint">Mint 未满且超过 24 小时后，用户可调用 claimRefund()。</small>
              </FormField>
            </fieldset>
          )}

          {launchStep === 'rules' && (
            <fieldset className="wizard-fieldset">
              <legend>税率、权限与社群</legend>
              <FormField label="买税 %">
                <input value={form.buyTax} onChange={(event) => update('buyTax', event.target.value)} inputMode="decimal" />
              </FormField>
              <FormField label="卖税 %">
                <input value={form.sellTax} onChange={(event) => update('sellTax', event.target.value)} inputMode="decimal" />
              </FormField>
              {isDividendTemplate(form.templateId) && (
                <>
                  <FormField label="平台币到账门槛">
                    <input value={form.autoClaimThreshold} onChange={(event) => update('autoClaimThreshold', event.target.value)} inputMode="decimal" />
                    <small className="field-hint">达到该平台币数量后自动尝试打到持币钱包，默认按 4U 口径填写。</small>
                  </FormField>
                  <FormField label="自动处理批量">
                    <input value={form.autoClaimBatchSize} onChange={(event) => update('autoClaimBatchSize', event.target.value)} inputMode="numeric" />
                    <small className="field-hint">每次交易最多滚动处理多少个持币地址，数值越大越耗 Gas。</small>
                  </FormField>
                  <FormField label="换平台币触发量">
                    <input value={form.rewardSwapThreshold} onChange={(event) => update('rewardSwapThreshold', event.target.value)} inputMode="decimal" placeholder="留空为总量0.01%" />
                    <small className="field-hint">税收代币累计到该数量后，自动换成平台币进入分红账本。</small>
                  </FormField>
                </>
              )}
              <FormField label="燃烧比例 %">
                <input value={form.burnRate} onChange={(event) => update('burnRate', event.target.value)} inputMode="decimal" />
              </FormField>
              <FormField label="开始时间">
                <input value={form.startTime} onChange={(event) => update('startTime', event.target.value)} placeholder="立即 / 指定时间" />
              </FormField>
              <FormField label="合约尾号">
                <input
                  value={form.vanitySuffix}
                  onChange={(event) => update('vanitySuffix', normalizeHexSuffix(event.target.value))}
                  placeholder="例如 8888"
                />
              </FormField>
              <FormField label="CREATE2 Salt">
                <div className="vanity-tools">
                  <input
                    value={form.vanitySalt}
                    onChange={(event) => update('vanitySalt', event.target.value)}
                    placeholder="不填则自动生成"
                  />
                  <button className="secondary" disabled={busy || !form.vanitySuffix} onClick={mineVanitySalt} type="button">
                    <Gauge size={15} />
                    生成尾号Salt
                  </button>
                </div>
                {vanityPreview && <small className="field-hint">预测地址：{shortAddress(vanityPreview)}，尾号已匹配</small>}
              </FormField>
              <ToggleField
                checked
                disabled
                label="底池自动转 dead"
                text="平台强制规则：初始 LP 或 Mint 累积 LP 全部进入黑洞地址。"
                onChange={(value) => update('deadLiquidity', value)}
              />
              <ToggleField
                checked
                disabled
                label="部署后放弃 Owner"
                text="平台强制规则：新币无 Owner，Mint 池可按创建参数直接丢权限。"
                onChange={(value) => update('renounceOwner', value)}
              />
              <ToggleField
                checked={form.whitelist}
                label="开启白名单窗口"
                text="开启后只有名单内钱包可在白名单窗口 Mint 或提前参与。"
                onChange={(value) => update('whitelist', value)}
              />
              {form.whitelist && (
                <FormField label="白名单钱包地址" wide>
                  <div className="whitelist-editor">
                    <textarea
                      value={form.whitelistAddresses}
                      onChange={(event) => update('whitelistAddresses', event.target.value)}
                      placeholder={'每行一个地址，也支持逗号/空格分隔\n0x...\n0x...'}
                    />
                    <div className="whitelist-tools">
                      <span className="status-pill green">{whitelistInfo.valid.length} 个有效地址</span>
                      <span className={`status-pill ${whitelistInfo.invalid.length ? 'red' : 'cyan'}`}>
                        {whitelistInfo.invalid.length ? `${whitelistInfo.invalid.length} 个错误` : '格式正常'}
                      </span>
                      {wallet.address && (
                        <button
                          className="secondary"
                          onClick={() => update('whitelistAddresses', appendWhitelistAddress(form.whitelistAddresses, wallet.address))}
                          type="button"
                        >
                          <Wallet size={15} />
                          加入当前钱包
                        </button>
                      )}
                      <span className="status-pill green">创建时写入新池</span>
                      <button className="secondary" onClick={() => update('whitelistAddresses', '')} type="button">
                        清空名单
                      </button>
                    </div>
                    {whitelistInfo.invalid.length > 0 && (
                      <div className="invalid-list">
                        <b>格式错误：</b>
                        <span>{whitelistInfo.invalid.slice(0, 6).join('、')}</span>
                      </div>
                    )}
                  </div>
                </FormField>
              )}
              <ToggleField
                checked={form.autoVerify}
                label="自动验证代码"
                text="部署后在 BscScan 展示源码和参数。"
                onChange={(value) => update('autoVerify', value)}
              />
              <FormField label="官网">
                <input value={form.website} onChange={(event) => update('website', event.target.value)} placeholder="https://..." />
              </FormField>
              <FormField label="推特 / X">
                <input value={form.x} onChange={(event) => update('x', event.target.value)} placeholder="@..." />
              </FormField>
              <FormField label="Telegram">
                <input value={form.telegram} onChange={(event) => update('telegram', event.target.value)} placeholder="https://t.me/..." />
              </FormField>
              <FormField label="备注" wide>
                <textarea value={form.note} onChange={(event) => update('note', event.target.value)} placeholder="项目宣言、风险提醒、社群安排" />
              </FormField>
            </fieldset>
          )}

          {launchStep === 'preview' && (
            <fieldset className="wizard-fieldset preview-fieldset">
              <legend>确认发射</legend>
              <div className="launch-confirm">
                <Rocket size={26} />
                <h3>{form.tokenName || 'Pepe Fighter'} 准备登上擂台</h3>
                <p>请确认右侧预览、工厂地址、发射参数和白名单状态。点击创建后会拉起钱包部署新币。</p>
                <div className="live-mint-strip">
                  <span>
                    <em>Mint单价</em>
                    <b>{form.mintPrice} BNB</b>
                  </span>
                  <span>
                    <em>每份获得</em>
                    <b>{formatUnits(mintParams.amountPerMint, 18, 4)} {form.symbol || tokenSymbol}</b>
                  </span>
                  <span>
                    <em>总份数</em>
                    <b>{form.mintSlots}</b>
                  </span>
                </div>
                {form.whitelist && (
                  <div className="whitelist-summary">
                    <LockKeyhole size={17} />
                    白名单已开启：{whitelistInfo.valid.length} 个有效地址 / {mintParams.whiteLimit.toString()} 份
                    {whitelistInfo.invalid.length > 0 && `，${whitelistInfo.invalid.length} 个地址需修正`}
                  </div>
                )}
                <div className="whitelist-summary">
                  <ShieldCheck size={17} />
                  每笔 Mint 自动加池：BNB 100% / 代币 50%，LP 进 dead；24 小时未满可手动退款可退余额。
                </div>
                <div className="benefit-grid compact">
                  {benefits.slice(0, 4).map((item) => (
                    <span key={item}>
                      <CheckCircle2 size={15} />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </fieldset>
          )}

          <div className="step-actions">
            <button className="secondary" disabled={!previousStep} onClick={() => previousStep && setLaunchStep(previousStep.id)} type="button">
              {previousStep ? previousStep.title : '第一步'}
            </button>
            {nextStep ? (
              <button className="primary" onClick={() => setLaunchStep(nextStep.id)} type="button">
                下一步：{nextStep.title}
                <ChevronRight size={16} />
              </button>
            ) : (
              <button className="primary" type="submit">
                <Coins size={16} />
                {form.mode === 'mint' ? (form.whitelist ? '创建白名单Mint池' : '创建公开Mint池') : '登上擂台'}
              </button>
            )}
          </div>
        </div>

        <aside className={`launch-summary ${launchStep !== 'preview' ? 'desktop-summary' : ''}`}>
          <Panel title="擂台预览" icon={Gauge}>
            <div className="token-preview">
              <div className="preview-logo">{form.logoData ? <img alt="Logo" src={form.logoData} /> : <FrogMark />}</div>
              <div>
                <b>{form.tokenName || 'Pepe Fighter'}</b>
                <span>{form.symbol || 'PEPE'} · {selectedMode.title}</span>
              </div>
            </div>
            <div className="preview-lines">
              <MiniMetric label="合约模板" value={selectedTemplate.name} />
              <MiniMetric label="预计支付" value={form.mode === 'mint' ? `创建费 ${getLaunchFeeBnb(form)} BNB` : `${formatBnb(launchAmount)} BNB`} />
              <MiniMetric label="Mint募集上限" value={`${formatBnb(mintRaise)} BNB`} />
              <MiniMetric label="黑洞地址" value={shortAddress(DEAD_ADDRESS)} />
              <MiniMetric label="买/卖税" value={`${form.buyTax}% / ${form.sellTax}%`} />
              <MiniMetric label="尾号定制" value={form.vanitySuffix ? `...${normalizeHexSuffix(form.vanitySuffix)}` : '随机地址'} />
              <MiniMetric label="Owner" value="项目方 Owner / 打满后 LP 黑洞" />
              <MiniMetric label="白名单" value={form.whitelist ? `${whitelistInfo.valid.length} 地址 / ${mintParams.whiteLimit.toString()} 份` : '未开启'} />
              <MiniMetric label="每笔加池" value="BNB 100% / 币 50%" />
              <MiniMetric label="退款窗口" value="24 小时" />
            </div>
            <button className="secondary full" onClick={() => copyText(DEAD_ADDRESS, '黑洞地址')} type="button">
              <Copy size={16} />
              复制 dead 地址
            </button>
            <button className="secondary full" disabled={busy} onClick={() => refreshFactoryRecords()} type="button">
              <Timer size={16} />
              刷新发射记录
            </button>
            {!wallet.address && (
              <button className="secondary full" onClick={connectWallet} type="button">
                <Wallet size={16} />
                连接真实钱包
              </button>
            )}
            {form.whitelist && form.mode === 'mint' && <span className="status-pill green">白名单创建时写入新池</span>}
            <button className="primary full submit-btn" type="submit">
              <Coins size={16} />
              {form.mode === 'mint' ? (form.whitelist ? '创建白名单Mint池' : '创建公开Mint池') : '登上擂台'}
            </button>
          </Panel>

          <FactoryBlueprint
            form={form}
            wallet={wallet}
            selectedTemplate={selectedTemplate}
            update={update}
            setLaunchStep={setLaunchStep}
          />

          <Panel title={form.mode === 'mint' ? (form.whitelist ? '白名单Mint池' : '公开Mint池') : '发币工厂参数'} icon={Coins}>
            {form.mode === 'mint' ? (
              <>
                <div className="chain-status-row">
                  <span className="status-pill green">创建新池</span>
                  <span className="status-pill green">每笔自动加池</span>
                  <span className="status-pill green">LP进dead</span>
                  <span className="status-pill cyan">24小时退款窗口</span>
                </div>
                <div className="preview-lines chain-lines">
                  <MiniMetric label="模板" value={selectedTemplate.name} />
                  <MiniMetric label="Mint单价" value={`${formatBnbFromWei(mintParams.price, 8)} BNB`} />
                  <MiniMetric label="每份获得" value={`${formatUnits(mintParams.amountPerMint, 18, 4)} ${form.symbol || 'PEPE'}`} />
                  <MiniMetric label="Mint总份数" value={`${mintParams.mintLimit.toString()} 份`} />
                  {form.whitelist && <MiniMetric label="白名单总份数" value={`${mintParams.whiteLimit.toString()} 份`} />}
                  <MiniMetric label="每钱包上限" value={`${mintParams.accMintLimit.toString()} 份`} />
                  <MiniMetric label="单次上限" value={`${mintParams.accEachLimit.toString()} 份`} />
                  <MiniMetric label="白名单地址" value={form.whitelist ? `${whitelistInfo.valid.length} 个` : '不启用'} />
                  <MiniMetric label="BNB进池比例" value="100% / 每笔" />
                  <MiniMetric label="代币配池比例" value="50% / 总量" />
                  <MiniMetric label="配池代币储备" value={`${formatUnits(mintParams.liquidityTokenAmount, 18, 4)} ${form.symbol || 'PEPE'}`} />
                  <MiniMetric label="退款窗口" value="24 小时" />
                  <MiniMetric label="Mint池Owner" value={form.owner && isAddress(form.owner) ? shortAddress(form.owner) : wallet.address ? shortAddress(wallet.address) : '创建钱包'} />
                  <MiniMetric label="Token权限" value="无Owner" />
                </div>
              </>
            ) : (
              <>
                <div className="chain-status-row">
                  <span className="status-pill green">AppleToken</span>
                  <span className="status-pill green">MintVault</span>
                  <span className="status-pill green">LP进dead</span>
                  <span className="status-pill cyan">24小时退款窗口</span>
                </div>
                <div className="preview-lines chain-lines">
                  <MiniMetric label="模板" value={selectedTemplate.name} />
                  <MiniMetric label="创建费" value={`${getLaunchFeeBnb(form)} BNB`} />
                  <MiniMetric label="Mint单价" value={`${formatBnbFromWei(mintParams.price, 8)} BNB`} />
                  <MiniMetric label="每份获得" value={`${formatUnits(mintParams.amountPerMint, 18, 4)} ${form.symbol || 'PEPE'}`} />
                  <MiniMetric label="Mint总份数" value={`${mintParams.mintLimit.toString()} 份`} />
                  <MiniMetric label="配池代币储备" value={`${formatUnits(mintParams.liquidityTokenAmount, 18, 4)} ${form.symbol || 'PEPE'}`} />
                  <MiniMetric label="买/卖税" value={`${form.buyTax}% / ${form.sellTax}%`} />
                  {isDividendTemplate(form.templateId) && <MiniMetric label="分红平台币" value={shortAddress(TOKEN_CONTRACT)} />}
                  {isDividendTemplate(form.templateId) && <MiniMetric label="自动到账门槛" value={`${form.autoClaimThreshold || 4} 平台币`} />}
                  <MiniMetric label="LP接收" value={shortAddress(DEAD_ADDRESS)} />
                  <MiniMetric label="尾号定制" value={form.vanitySuffix ? `...${normalizeHexSuffix(form.vanitySuffix)}` : '随机'} />
                  <MiniMetric label="Token权限" value="项目方 Owner / 打满后 LP 黑洞" />
                  <MiniMetric label="接收钱包" value={form.owner && isAddress(form.owner) ? shortAddress(form.owner) : wallet.address ? shortAddress(wallet.address) : '创建钱包'} />
                </div>
              </>
            )}
          </Panel>

          <Panel title="链上输出" icon={CircleDollarSign}>
            {lastResult ? (
              <div className="result-box">
                <span>
                  <em>交易类型</em>
                  <b>{lastResult.action || '发射'}</b>
                </span>
                <span>
                  <em>交易金额</em>
                  <b>{lastResult.amountBnb} BNB</b>
                </span>
                <span>
                  <em>交易哈希</em>
                  <b>{shortAddress(lastResult.txHash)}</b>
                </span>
                <span>
                  <em>目标合约</em>
                  <b>{shortAddress(lastResult.receiver)}</b>
                </span>
                {lastResult.tokenAddress && (
                  <span>
                    <em>新币地址</em>
                    <b>{shortAddress(lastResult.tokenAddress)}</b>
                  </span>
                )}
                {lastResult.pairAddress && (
                  <span>
                    <em>交易对</em>
                    <b>{shortAddress(lastResult.pairAddress)}</b>
                  </span>
                )}
                {lastResult.poolAddress && (
                  <span>
                    <em>Mint池</em>
                    <b>{shortAddress(lastResult.poolAddress)}</b>
                  </span>
                )}
                <div className="result-actions">
                  <a className="secondary" href={txUrl(lastResult.txHash)} target="_blank" rel="noreferrer">
                    <ExternalLink size={15} />
                    BscScan交易
                  </a>
                  <a className="secondary" href={addressUrl(lastResult.receiver)} target="_blank" rel="noreferrer">
                    <ExternalLink size={15} />
                    链上入口
                  </a>
                  {lastResult.tokenAddress && (
                    <a className="secondary" href={addressUrl(lastResult.tokenAddress)} target="_blank" rel="noreferrer">
                      <ExternalLink size={15} />
                      新币合约
                    </a>
                  )}
                  {lastResult.poolAddress && (
                    <a className="secondary" href={addressUrl(lastResult.poolAddress)} target="_blank" rel="noreferrer">
                      <ExternalLink size={15} />
                      Mint池
                    </a>
                  )}
                  <a
                    className="secondary"
                    href={pancakeUrl(lastResult.tokenAddress || chainInfo.tokenAddress || TOKEN_CONTRACT)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink size={15} />
                    Pancake交易
                  </a>
                </div>
              </div>
            ) : (
              <EmptyInline
                icon={Timer}
                title="等待发射"
                text="完成真实钱包交易后，这里会展示 BscScan 交易、链上入口和后续交易对状态。"
              />
            )}
          </Panel>

          <Panel title="发射记录" icon={ListChecks}>
            <div className="record-head">
              <span className="status-pill green">链上部署 {factoryRecordsCount}</span>
              <button className="secondary" onClick={() => refreshFactoryRecords(false)} type="button">
                <Timer size={15} />
                刷新
              </button>
            </div>
            <DeploymentRecordsList records={factoryRecords.slice(0, 8)} compact onSelectDeployment={onSelectDeployment} />
          </Panel>
        </aside>
      </form>
    </section>
  );
}

function deploymentKey(item) {
  return `${item.token || item.pool || item.creator}-${item.blockNumber}-${item.salt}`;
}

function DeploymentRecordsList({ records, compact = false, onSelectDeployment }) {
  if (!records.length) {
    return <EmptyInline icon={Timer} title="新工厂暂无发币记录" text="只有通过本页面发币工厂创建成功的新币，才会写入这里；创建完成后会自动显示部署钱包、Token、Mint池和开源入口。" />;
  }

  return (
    <div className={`launch-records ${compact ? 'compact' : ''}`}>
      {records.map((item) => (
        <DeploymentRecordCard item={item} key={deploymentKey(item)} compact={compact} onSelectDeployment={onSelectDeployment} />
      ))}
    </div>
  );
}

function DeploymentRecordCard({ item, compact = false, onSelectDeployment }) {
  const hasPool = isAddress(item.pool) && !sameAddress(item.pool, ZERO_ADDRESS);
  const hasPair = isAddress(item.pair) && !sameAddress(item.pair, ZERO_ADDRESS);
  const modeLabel = deploymentModeLabel(item.templateId, item.pool);

  return (
    <article className={`launch-record ${compact ? 'compact' : ''}`}>
      <span>
        <b>{templateLabelById(item.templateId)}</b>
        <em>{modeLabel} · {deploymentTimeLabel(item)}</em>
      </span>
      <div className="record-metrics">
        <small>
          <em>部署钱包</em>
          <a href={addressUrl(item.creator)} target="_blank" rel="noreferrer">{shortAddress(item.creator)}</a>
        </small>
        <small>
          <em>Token</em>
          <a href={addressUrl(item.token)} target="_blank" rel="noreferrer">{shortAddress(item.token)}</a>
        </small>
        {!compact && (
          <small>
            <em>{hasPool ? 'Mint池' : '交易对'}</em>
            <a href={addressUrl(hasPool ? item.pool : item.pair)} target="_blank" rel="noreferrer">
              {shortAddress(hasPool ? item.pool : item.pair) || '待生成'}
            </a>
          </small>
        )}
      </div>
      <div className="record-actions">
        <button className="secondary" onClick={() => onSelectDeployment(item)} type="button">
          <ListChecks size={14} />
          详情
        </button>
        <a className="secondary" href={addressCodeUrl(item.token)} target="_blank" rel="noreferrer">
          开源
        </a>
        {hasPair && (
          <a className="secondary" href={pancakeUrl(item.token)} target="_blank" rel="noreferrer">
            Pancake
          </a>
        )}
        {hasPool && (
          <a className="secondary" href={addressUrl(item.pool)} target="_blank" rel="noreferrer">
            Mint池
          </a>
        )}
      </div>
    </article>
  );
}

function DeploymentsPage({ records, total, refreshFactoryRecords, onSelectDeployment, startLaunch }) {
  return (
    <section className="section-panel deployments-page" id="deployments">
      <SectionHead
        eyebrow="Launch Records"
        title="部署列表"
        text="这里显示的是通过当前发币工厂创建成功的新币记录。还没人发币时会显示 0；点下面按钮进入白名单 Mint 发币表单。"
      />
      <div className="section-actions">
        <button className="primary" onClick={() => startLaunch({ mode: 'mint', templateId: 'fair-mint', step: 'basic' })} type="button">
          <Rocket size={16} />
          创建白名单Mint
        </button>
        <button className="secondary" onClick={() => refreshFactoryRecords(false)} type="button">
          <Timer size={16} />
          刷新部署列表
        </button>
        <a className="secondary" href={addressUrl(FACTORY_CONTRACT)} target="_blank" rel="noreferrer">
          <ExternalLink size={16} />
          工厂合约
        </a>
      </div>
      <div className="deployment-stats">
        <MiniMetric label="链上总部署" value={`${total} 个`} />
        <MiniMetric label="当前展示" value={`${records.length} 个`} />
        <MiniMetric label="工厂地址" value={shortAddress(FACTORY_CONTRACT)} />
        <MiniMetric label="创建费" value={`普通 ${LAUNCH_FEE_BNB} / 白名单 ${WHITELIST_LAUNCH_FEE_BNB}`} />
      </div>
      <DeploymentRecordsList records={records} onSelectDeployment={onSelectDeployment} />
    </section>
  );
}

function FactoryBlueprint({ form, wallet, selectedTemplate, update, setLaunchStep }) {
  const factoryReady = isAddress(FACTORY_CONTRACT);
  const creator = form.owner && isAddress(form.owner) ? form.owner : wallet.address;
  const mintParams = getFairMintParams(form);
  const dividendMode = isDividendTemplate(form.templateId);
  const sourceUrl = CONTRACT_SOURCE_URL;

  return (
    <Panel title="自助发币工厂" icon={Settings}>
      <div className="factory-status">
        <span className={`status-pill ${factoryReady ? 'green' : 'cyan'}`}>{factoryReady ? '工厂已部署' : '工厂准备中'}</span>
        <span className="status-pill green">Apple/Kaola</span>
        <span className="status-pill green">模板分页</span>
        <span className="status-pill green">CREATE2尾号</span>
        <span className="status-pill green">强制LP进dead</span>
        <span className="status-pill green">24h退款</span>
      </div>
      <div className="factory-flow">
        {factoryFlow.map(([step, title, text]) => (
          <span key={step}>
            <em>{step}</em>
            <b>{title}</b>
            <small>{text}</small>
          </span>
        ))}
      </div>
      <div className="preview-lines factory-lines">
        <MiniMetric label="新币模式" value={form.whitelist ? '白名单Mint池' : '公开Mint池'} />
        <MiniMetric label="模板协议" value={dividendMode ? '持币分红平台币' : selectedTemplate.name} />
        <MiniMetric label="模板ID" value={shortAddress(String(getTemplateId(form.templateId)))} />
        {dividendMode && <MiniMetric label="分红币" value={shortAddress(TOKEN_CONTRACT)} />}
        {dividendMode && <MiniMetric label="到账门槛" value={`${form.autoClaimThreshold || 4} 平台币`} />}
        <MiniMetric label="创建者" value={creator ? shortAddress(creator) : '连接后填入'} />
        <MiniMetric label="创建费" value={`${getLaunchFeeBnb(form)} BNB`} />
        <MiniMetric label="Mint单价" value={`${formatBnbFromWei(mintParams.price, 8)} BNB`} />
        {form.whitelist && <MiniMetric label="白名单份数" value={`${mintParams.whiteLimit.toString()} 份`} />}
        <MiniMetric label="每笔加池" value="BNB 100% / 币 50%" />
        <MiniMetric label="退款窗口" value="24 小时" />
        <MiniMetric label="配池代币储备" value={`${formatUnits(mintParams.liquidityTokenAmount, 18, 4)} ${cleanSymbol(form.symbol) || 'PEPE'}`} />
        <MiniMetric label="LP接收" value={shortAddress(DEAD_ADDRESS)} />
        <MiniMetric label="尾号" value={form.vanitySuffix ? `...${normalizeHexSuffix(form.vanitySuffix)}` : '可选'} />
        <MiniMetric label="权限" value="项目方 Owner / 打满后 LP 黑洞" />
      </div>
      <div className="factory-actions">
        <button
          className="secondary"
          onClick={() => {
            update('mode', 'direct');
            setLaunchStep('basic');
          }}
          type="button"
        >
          <SlidersHorizontal size={15} />
          配置新币
        </button>
        <a className="secondary" href={sourceUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={15} />
          工厂源码
        </a>
        {factoryReady && (
          <a className="secondary" href={addressUrl(FACTORY_CONTRACT)} target="_blank" rel="noreferrer">
            <ExternalLink size={15} />
            工厂地址
          </a>
        )}
      </div>
      <p className="factory-note">发射工厂已切到 Apple/Kaola 合约：创建 AppleToken 与 AppleMintVault，支持白名单 Mint、每笔 Mint 自动加池、24 小时未满退款，以及全局链上分页查询。</p>
    </Panel>
  );
}

function FlowSection() {
  return (
    <section className="section-panel">
      <SectionHead
        eyebrow="Launch Flow"
        title="哪怕只花 1 分钟，也能发起公平战役"
        text="连接钱包、选择模式、填写参数、确认交易。代币诞生后输出链上地址和交易入口。"
      />
      <div className="flow-grid">
        {flowSteps.map(([step, title, text, Icon]) => (
          <article className="flow-step" key={step}>
            <span>{step}</span>
            <Icon size={21} />
            <b>{title}</b>
            <p>{text}</p>
          </article>
        ))}
      </div>
      <div className="benefit-grid">
        {benefits.map((item) => (
          <span key={item}>
            <CheckCircle2 size={16} />
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

function ManifestoSection() {
  return (
    <section className="manifesto-panel" id="manifesto">
      <div>
        <span className="eyebrow">Frog Champion Manifesto</span>
        <h2>擂主宣言</h2>
        <p>我们不信项目方的人品，我们只信黑洞地址。我们不谈信仰，我们只看 Mint 速度。在这里，每一只 meme 都有平等的出拳机会。</p>
        <div className="contact-line">
          <span>官方推特：@</span>
          <span>官方Telegram：</span>
          <span>QQ社群：</span>
        </div>
      </div>
      <aside>
        <FrogMark />
        <b>赢，就百倍；输，就下一只。</b>
        <p>郑重提醒：Meme 币价格波动极大，平台仅提供公平发射工具，不对任何代币后续价格负责。所有参与者均需为自己的盈亏行为负责。</p>
      </aside>
    </section>
  );
}

function SectionHead({ eyebrow, title, text }) {
  return (
    <div className="section-head">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

function RuleCard({ icon: Icon, title, text }) {
  return (
    <article className="rule-card">
      <Icon size={22} />
      <b>{title}</b>
      <p>{text}</p>
    </article>
  );
}

function ModeToggle({ value, onChange }) {
  return (
    <div className="mode-toggle" role="group" aria-label="选择发射模式">
      {launchModes.map(({ id, title, icon: Icon }) => (
        <button className={value === id ? 'active' : ''} key={id} onClick={() => onChange(id)} type="button">
          <Icon size={15} />
          {title}
        </button>
      ))}
    </div>
  );
}

function LaunchStepper({ value, onChange }) {
  return (
    <div className="launch-stepper" aria-label="发射步骤">
      {launchWizardSteps.map((step, index) => (
        <button className={value === step.id ? 'active' : ''} key={step.id} onClick={() => onChange(step.id)} type="button">
          <span>{String(index + 1).padStart(2, '0')}</span>
          <b>{step.label}</b>
        </button>
      ))}
    </div>
  );
}

function ModeCards({ value, onChange }) {
  return (
    <div className="mode-cards">
      {launchModes.map(({ id, title, kicker, text, icon: Icon }) => (
        <button className={value === id ? 'active' : ''} key={id} onClick={() => onChange(id)} type="button">
          <Icon size={20} />
          <span>
            <b>{title}</b>
            <em>{kicker}</em>
            <small>{text}</small>
          </span>
        </button>
      ))}
    </div>
  );
}

function ToggleField({ checked, label, text, onChange, disabled = false }) {
  return (
    <label className={`toggle-field ${disabled ? 'locked' : ''}`}>
      <input checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      <span>
        <b>{label}</b>
        <em>{text}</em>
      </span>
    </label>
  );
}

function FormField({ label, children, wide = false }) {
  return (
    <label className={`form-field ${wide ? 'wide' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function SegmentedControl({ value, onChange, options }) {
  return (
    <div className="segmented-control">
      {options.map((option) => (
        <button className={value === option ? 'active' : ''} key={option} onClick={() => onChange(option)} type="button">
          {option}
        </button>
      ))}
    </div>
  );
}

function Panel({ title, icon: Icon, children }) {
  return (
    <section className="panel">
      <div className="panel-title">
        <Icon size={18} />
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function MiniMetric({ label, value }) {
  return (
    <span className="mini-metric">
      <em>{label}</em>
      <b>{value}</b>
    </span>
  );
}

function EmptyInline({ icon: Icon, title, text }) {
  return (
    <div className="empty-inline">
      <Icon size={23} />
      <b>{title}</b>
      <p>{text}</p>
    </div>
  );
}

function FrogMark({ compact = false }) {
  return (
    <span className={`frog-mark ${compact ? 'compact' : ''}`} aria-hidden="true">
      <span className="frog-eye left" />
      <span className="frog-eye right" />
      <span className="frog-mouth" />
    </span>
  );
}

function DeploymentDetailModal({ deployment, close, onRefund }) {
  const hasPool = isAddress(deployment.pool) && !sameAddress(deployment.pool, ZERO_ADDRESS);
  const hasPair = isAddress(deployment.pair) && !sameAddress(deployment.pair, ZERO_ADDRESS);
  const primaryMarketAddress = hasPool ? deployment.pool : deployment.pair;
  const modeLabel = deploymentModeLabel(deployment.templateId, deployment.pool);

  const details = [
    ['部署钱包', shortAddress(deployment.creator)],
    ['Token合约', shortAddress(deployment.token)],
    [hasPool ? 'Mint池' : '交易对', shortAddress(primaryMarketAddress) || '待生成'],
    ['模板', `${templateLabelById(deployment.templateId)} / ID ${deployment.templateId}`],
    ['发射模式', modeLabel],
    ['支付金额', `${formatBnbFromWei(deployment.valuePaid || 0n, 8)} BNB`],
    ['LP数量', deployment.liquidity ? deployment.liquidity.toString() : '0'],
    ['区块', deployment.blockNumber ? String(deployment.blockNumber) : '待确认'],
    ['时间', deploymentTimeLabel(deployment)],
    ['Salt', shortAddress(deployment.salt)],
    ['元数据Hash', shortAddress(deployment.metadataHash)],
  ];

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="checkout-modal deployment-modal" role="dialog" aria-modal="true" aria-labelledby="deployment-title">
        <div className="modal-icon">
          <ListChecks size={24} />
        </div>
        <h2 id="deployment-title">部署详情</h2>
        <p>这条记录来自工厂合约链上分页数据，部署钱包就是调用发射工厂创建新币的钱包。</p>
        {hasPool && (
          <div className="whitelist-summary deployment-rule-summary">
            <ShieldCheck size={17} />
            新版 Mint 池支持每笔自动加池、LP 进 dead、24 小时失败后手动退款；已经进入 dead LP 的部分无法退款。
          </div>
        )}
        <div className="checkout-lines">
          {details.map(([label, value]) => (
            <span key={label}>
              <em>{label}</em>
              <strong>{value}</strong>
            </span>
          ))}
        </div>
        <div className="deployment-links">
          <a className="secondary" href={addressUrl(deployment.creator)} target="_blank" rel="noreferrer">
            <ExternalLink size={15} />
            部署钱包
          </a>
          <a className="secondary" href={addressCodeUrl(deployment.token)} target="_blank" rel="noreferrer">
            <ExternalLink size={15} />
            Token源码
          </a>
          {hasPool && (
            <a className="secondary" href={addressCodeUrl(deployment.pool)} target="_blank" rel="noreferrer">
              <ExternalLink size={15} />
              Mint池代码
            </a>
          )}
          {hasPair && (
            <a className="secondary" href={pancakeUrl(deployment.token)} target="_blank" rel="noreferrer">
              <ExternalLink size={15} />
              Pancake交易
            </a>
          )}
          <a className="secondary" href={CONTRACT_SOURCE_URL} target="_blank" rel="noreferrer">
            <ExternalLink size={15} />
            模板源码
          </a>
          <a className="secondary" href={addressCodeUrl(FACTORY_CONTRACT)} target="_blank" rel="noreferrer">
            <ExternalLink size={15} />
            工厂开源
          </a>
        </div>
        <div className="modal-actions">
          {hasPool && (
            <button className="secondary" onClick={() => onRefund(deployment)} type="button">
              <CreditCard size={16} />
              手动退款
            </button>
          )}
          <button className="primary" onClick={close} type="button">
            关闭
          </button>
        </div>
      </section>
    </div>
  );
}

function CheckoutModal({ checkout, wallet, busy, confirm, cancel }) {
  const ActionIcon =
    checkout.type === 'whitelist'
      ? LockKeyhole
      : checkout.type === 'mintLive'
        ? Coins
        : checkout.type === 'contractAction' || checkout.type === 'factoryPlan' || checkout.type === 'factoryCreate'
          ? Settings
          : CreditCard;
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
        <div className="modal-icon">
          <ActionIcon size={24} />
        </div>
        <h2 id="checkout-title">{checkout.title}</h2>
        <p>{checkout.description || '这次操作会调用真实钱包在 BSC 发起交易。请在钱包弹窗里核对金额、地址和网络。'}</p>
        <div className="checkout-amount">
          <span>应付金额</span>
          <b>{checkout.amountBnb} BNB</b>
        </div>
        <div className="checkout-lines">
          {checkout.summary.map(([label, value]) => (
            <span key={label}>
              <em>{label}</em>
              <strong>{value}</strong>
            </span>
          ))}
          <span>
            <em>支付钱包</em>
            <strong>{wallet.address ? shortAddress(wallet.address) : '确认时连接'}</strong>
          </span>
        </div>
        <div className="modal-actions">
          <button className="secondary" disabled={busy} onClick={cancel} type="button">
            取消
          </button>
          <button className="primary" disabled={busy} onClick={confirm} type="button">
            <ActionIcon size={16} />
            {busy ? '等待钱包确认...' : checkout.actionLabel || '确认并拉起钱包'}
          </button>
        </div>
      </section>
    </div>
  );
}

export default App;
