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
import { Contract, Interface, JsonRpcProvider, hexlify, keccak256, randomBytes, toUtf8Bytes } from 'ethers';
import pepeArenaArt from './assets/pepe-arena.svg';

const STORAGE_KEY = 'pepe-launch-arena-draft-factory';
const LAUNCH_FEE_BNB = '0.005';
const WHITELIST_LAUNCH_FEE_BNB = LAUNCH_FEE_BNB;
const DEFAULT_FACTORY_CONTRACT = '0xE2340E4B5242A3DbF6bdC453A2F234d6f132565b';
const FACTORY_CONTRACT = import.meta.env.VITE_FACTORY_CONTRACT || DEFAULT_FACTORY_CONTRACT;
const TOKEN_CONTRACT = import.meta.env.VITE_TOKEN_CONTRACT || '';
const DEFAULT_REWARD_TOKEN = import.meta.env.VITE_REWARD_TOKEN_CONTRACT || '0x55d398326f99059fF775485246999027B3197955';
const CONTRACT_SOURCE_URL = 'https://github.com/ybc112/Pepefun/tree/main/contracts';
const DEFAULT_VANITY_SUFFIX = 'eeee';
const VANITY_SUFFIX = normalizeHexSuffix(import.meta.env.VITE_VANITY_SUFFIX || DEFAULT_VANITY_SUFFIX) || DEFAULT_VANITY_SUFFIX;
const DEFAULT_APP_BACKEND_URL = import.meta.env.DEV ? 'http://localhost:8787' : 'https://154.12.118.163.sslip.io';
const APP_BACKEND_URL = normalizeBackendBaseUrl(import.meta.env.VITE_APP_BACKEND_URL || DEFAULT_APP_BACKEND_URL);
const BSC_CHAIN_ID = 56;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD';
const BSC_PUBLIC_RPCS = ['https://bsc-mainnet.public.blastapi.io', 'https://bsc-rpc.publicnode.com', 'https://bsc.drpc.org'];
const FACTORY_VIEW_ABI = [
  'function allTokensLength() view returns (uint256)',
  'function creationFee() view returns (uint256)',
  'function getProjects(uint256 offset,uint256 limit) view returns (tuple(address creator,address token,address vault,address paymentToken,address receiver,address platformFeeReceiver,bytes32 templateId,uint256 totalSupply,uint256 mintCount,uint256 whitelistMintCount,uint256 publicMintCount,uint256 mintPrice,uint256 maxMintPerWallet,bool whitelistEnabled,string metadataUri,uint64 createdAt,address rewardToken,uint256 rewardThreshold,uint16 buyTaxBps,uint16 sellTaxBps,uint16 transferTaxBps,uint16 addLiquidityTaxBps,uint16 removeLiquidityTaxBps,uint16 launchProtectionTaxBps,uint16 launchProtectionBlocks,uint32 claimWait,uint16 fundFeeBps,uint16 lpFeeBps,uint16 dividendFeeBps,uint16 burnFeeBps)[])',
];
const FACTORY_WRITE_INTERFACE = new Interface([
  'function createLaunch((string name,string symbol,string metadataUri,uint256 totalSupply,uint256 mintCount,uint256 mintPrice,uint256 maxMintPerWallet,address paymentToken,address rewardToken,uint256 rewardThreshold,address receiver,bytes32 templateId,uint16 buyTaxBps,uint16 sellTaxBps,uint16 transferTaxBps,uint16 addLiquidityTaxBps,uint16 removeLiquidityTaxBps,uint16 launchProtectionTaxBps,uint16 launchProtectionBlocks,uint32 claimWait,uint16 fundFeeBps,uint16 lpFeeBps,uint16 dividendFeeBps,uint16 burnFeeBps,uint256 whitelistMintCount,bool whitelistEnabled) params,bytes32 salt) payable returns (address token,address vault)',
  'event LaunchCreated(address indexed creator,address indexed token,address indexed vault,bytes32 templateId,string name,string symbol,uint256 totalSupply,uint256 mintCount,uint256 mintPrice,address paymentToken,bool whitelistEnabled,string metadataUri)',
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
  reflection: keccak256(toUtf8Bytes('reflection')),
  'dividend-token': keccak256(toUtf8Bytes('dividend-token')),
  'fair-mint': keccak256(toUtf8Bytes('fair-mint')),
};
const BSC_CHAIN = {
  chainId: '0x38',
  chainName: 'BNB Smart Chain',
  nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  rpcUrls: ['https://bsc-dataseed.binance.org'],
  blockExplorerUrls: ['https://bscscan.com'],
};

const navItems = [
  { id: 'launch', label: '部署新币', icon: Upload },
  { id: 'deployments', label: '部署列表', icon: ListChecks },
];

const ACTIVE_TEMPLATE_ID = 'fair-mint';

const templates = [
  {
    id: 'standard',
    name: '标准BEP20模板',
    tag: '经典稳定',
    text: '固定总量、标准转账、BscScan 公开验证，社区最熟悉。',
    deployable: true,
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
    name: 'PEPE Mint 池',
    tag: '真实部署',
    text: '部署代币和 Mint 池，每笔 Mint 自动按规则进池，LP 最终进入 dead。',
    deployable: true,
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
];

const mintPlaybooks = [
  {
    id: 'whitelist',
    name: '白名单Mint',
    tag: '主玩法',
    text: '创建时写入白名单，白名单窗口结束后项目方可开公开 Mint。',
    whitelist: true,
  },
  {
    id: 'public',
    name: '公开Mint',
    tag: '全员同入口',
    text: '任何钱包按单价 Mint，卖完后募集 BNB 自动进池。',
    whitelist: false,
  },
];

const fairClaims = [
  ['参数公开上链', '部署钱包、Owner 和税控参数全部可查。'],
  ['没有底池被撤', 'LP 自动打入 dead 黑洞地址。'],
  ['没有合约留后门', '模板开源、参数上链、BscScan 可验证。'],
  ['没有内幕预留', '新币从 Mint 池启动，全凭手速和共识。'],
];

const benefits = [
  '发币成本低，零代码也能完成参数配置',
  '底池强制转 dead 黑洞，永不可撤',
  '合约逻辑公开验证，关键参数无法悄悄改',
  '支持公平 Mint，杜绝预挖和老鼠仓',
  'BSC 主网钱包直连，MetaMask / OKX / TokenPocket / TrustWallet 可用',
  '合约地址、交易哈希、PancakeSwap 入口按发射结果输出',
];

const flowSteps = [
  ['01', '连接钱包', '连接真实 BSC 钱包，自动切换到 BNB Smart Chain。', Wallet],
  ['02', '配置 Mint', '选择白名单或公开 Mint，填写总量、价格、份数和税控参数。', SlidersHorizontal],
  ['03', '上传Logo', '上传 Pepe 风格 Logo，预览代币名、符号和擂台视觉。', Upload],
  ['04', '登上擂台', '确认支付并拉起钱包，等待链上交易回执。', Rocket],
];

const factoryFlow = [
  ['01', '选择模板', '按开放模板发币，暂未开放的模板不会伪装成可部署。'],
  ['02', '预测地址', 'CREATE2 salt 可预测 Token 地址，也可强制校验尾号。'],
  ['03', '每笔加池', 'Mint 支付按比例自动加 PancakeSwap，LP 接收地址写死为 dead。'],
  ['04', '失败退款', '未打满且超过退款窗口后，用户可手动退回可退余额。'],
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
  transferTax: '0',
  addLiquidityTax: '0',
  removeLiquidityTax: '0',
  launchProtectionTax: '0',
  launchProtectionBlocks: '0',
  claimWaitSeconds: '60',
  fundFeePercent: '44',
  lpFeePercent: '18',
  dividendFeePercent: '16',
  burnRate: '10',
  mintPrice: '0.01',
  mintSlots: '1000',
  whiteMintSlots: '100',
  maxPerWallet: '5',
  rewardSwapThreshold: '',
  website: '',
  x: '',
  telegram: '',
  deadLiquidity: true,
  whitelist: true,
  whitelistAddresses: '',
  mintQuantity: '1',
  vanitySuffix: VANITY_SUFFIX,
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
        templateId: ACTIVE_TEMPLATE_ID,
        vanitySuffix: VANITY_SUFFIX,
        vanitySalt: '',
        deadLiquidity: true,
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
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 12);
}

function stripHex(value) {
  return String(value || '').replace(/^0x/i, '');
}

function hexToBigInt(value) {
  const hex = stripHex(value);
  return hex ? BigInt(`0x${hex}`) : 0n;
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

function encodeWhitelistCall(addresses, enabled = true) {
  return VAULT_WRITE_INTERFACE.encodeFunctionData('setWhitelistAccounts', [addresses, enabled]);
}

function getDividendParams(form) {
  const enabled = isDividendTemplate(form.templateId);
  const totalSupply = decimalToUnits(form.totalSupply, 18);
  const defaultRewardThreshold = totalSupply > 0n ? totalSupply / 10000n : 0n;
  return {
    rewardToken: enabled && isAddress(TOKEN_CONTRACT) ? TOKEN_CONTRACT : DEFAULT_REWARD_TOKEN,
    feeReceiver: ZERO_ADDRESS,
    buyFeeBps: enabled ? percentToBps(form.buyTax) : 0,
    sellFeeBps: enabled ? percentToBps(form.sellTax) : 0,
    rewardThreshold: enabled && numberValue(form.rewardSwapThreshold) > 0 ? decimalToUnits(form.rewardSwapThreshold, 18) : defaultRewardThreshold,
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
  };
}

function isWhitelistMintLaunch(form) {
  return isFairMintTemplate(form.templateId) && Boolean(form.whitelist);
}

function getLaunchFeeBnb(form) {
  return isWhitelistMintLaunch(form) ? WHITELIST_LAUNCH_FEE_BNB : LAUNCH_FEE_BNB;
}

function uintNumber(value) {
  const clean = String(value || '0').trim();
  if (!/^\d+$/.test(clean)) return 0;
  const nextValue = Number(clean);
  return Number.isSafeInteger(nextValue) && nextValue >= 0 ? nextValue : 0;
}

function getTaxSplitTotal(form) {
  return numberValue(form.fundFeePercent) + numberValue(form.lpFeePercent) + numberValue(form.dividendFeePercent) + numberValue(form.burnRate);
}

function getAdvancedTaxSummary(form) {
  if (form.templateId === 'zero-tax') return '零税模板';
  const items = [
    ['转账', form.transferTax],
    ['加池', form.addLiquidityTax],
    ['撤池', form.removeLiquidityTax],
    ['保护', form.launchProtectionTax],
  ].filter(([, value]) => numberValue(value) > 0);
  return items.length ? items.map(([label, value]) => `${label}${formatBnb(value)}%`).join(' / ') : '无';
}

function getTaxSplitSummary(form) {
  return `营销${formatBnb(form.fundFeePercent)}% / LP${formatBnb(form.lpFeePercent)}% / 分红${formatBnb(form.dividendFeePercent)}% / 销毁${formatBnb(form.burnRate)}%`;
}

function buildFactoryLaunchParams(form, creatorAddress, metadataUri = buildMetadataUriPayload(form)) {
  const receiver = form.owner && isAddress(form.owner) ? form.owner : creatorAddress;
  const mintParams = getFairMintParams(form);
  const dividendParams = getDividendParams(form);
  const zeroTaxMode = form.templateId === 'zero-tax';
  const buyTaxBps = zeroTaxMode ? 0 : percentToBps(form.buyTax);
  const sellTaxBps = zeroTaxMode ? 0 : percentToBps(form.sellTax);
  const transferTaxBps = zeroTaxMode ? 0 : percentToBps(form.transferTax);
  const addLiquidityTaxBps = zeroTaxMode ? 0 : percentToBps(form.addLiquidityTax);
  const removeLiquidityTaxBps = zeroTaxMode ? 0 : percentToBps(form.removeLiquidityTax);
  const launchProtectionTaxBps = zeroTaxMode ? 0 : percentToBps(form.launchProtectionTax);

  return {
    name: form.tokenName.trim(),
    symbol: cleanSymbol(form.symbol),
    metadataUri,
    totalSupply: decimalToUnits(form.totalSupply, 18),
    mintCount: mintParams.mintLimit,
    mintPrice: mintParams.price,
    maxMintPerWallet: mintParams.accMintLimit,
    paymentToken: ZERO_ADDRESS,
    rewardToken: isAddress(dividendParams.rewardToken) ? dividendParams.rewardToken : ZERO_ADDRESS,
    rewardThreshold: dividendParams.rewardThreshold,
    receiver,
    templateId: getTemplateId(form.templateId),
    buyTaxBps,
    sellTaxBps,
    transferTaxBps,
    addLiquidityTaxBps,
    removeLiquidityTaxBps,
    launchProtectionTaxBps,
    launchProtectionBlocks: uintNumber(form.launchProtectionBlocks),
    claimWait: uintNumber(form.claimWaitSeconds),
    fundFeeBps: percentToBps(form.fundFeePercent),
    lpFeeBps: percentToBps(form.lpFeePercent),
    dividendFeeBps: percentToBps(form.dividendFeePercent),
    burnFeeBps: percentToBps(form.burnRate),
    whitelistMintCount: form.whitelist ? mintParams.whiteLimit : 0n,
    whitelistEnabled: Boolean(form.whitelist),
  };
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
    .slice(0, 4);
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

function normalizeBackendBaseUrl(value) {
  const nextValue = String(value || '').trim();
  if (nextValue === 'same-origin' && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return nextValue.replace(/\/+$/, '');
}

function buildBackendUrl(path) {
  return `${APP_BACKEND_URL}${path}`;
}

function serializeFactoryParams(params) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, typeof value === 'bigint' ? value.toString() : value]),
  );
}

async function resolveLaunchSalt(creator, params, suffix) {
  const vanitySuffix = normalizeHexSuffix(suffix);
  if (!vanitySuffix) {
    return {
      salt: hexlify(randomBytes(32)),
      predictedTokenAddress: '',
      vanitySuffix: '',
      vanityAttempts: 0,
    };
  }

  if (!APP_BACKEND_URL) {
    throw new Error(`靓号尾号 ...${vanitySuffix} 需要配置 VITE_APP_BACKEND_URL 并运行后端。`);
  }

  const response = await fetch(buildBackendUrl('/api/vanity-salt'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      suffix: vanitySuffix,
      maxIterations: 500000,
      creator,
      params: serializeFactoryParams(params),
    }),
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || `没有匹配到 ...${vanitySuffix} 靓号地址，请稍后重试。`);
  }

  if (!result.ok || !/^0x[0-9a-fA-F]{64}$/.test(String(result.salt || ''))) {
    throw new Error(`没有匹配到 ...${vanitySuffix} 靓号地址，请稍后重试。`);
  }

  if (
    !isAddress(result.factory) ||
    result.factory.toLowerCase() !== FACTORY_CONTRACT.toLowerCase() ||
    Number(result.chainId || 0) !== BSC_CHAIN_ID
  ) {
    throw new Error('靓号后端连接的工厂或链 ID 与当前页面不一致。');
  }

  const matchedSuffix = normalizeHexSuffix(result.suffix || vanitySuffix);
  const predictedTokenAddress = isAddress(result.tokenAddress) ? result.tokenAddress : '';
  if (!predictedTokenAddress || !predictedTokenAddress.toLowerCase().endsWith(matchedSuffix)) {
    throw new Error(`后端返回的 Token 地址没有命中 ...${matchedSuffix}。`);
  }

  return {
    salt: result.salt,
    predictedTokenAddress,
    vanitySuffix: matchedSuffix,
    vanityAttempts: Number(result.attempts || 0),
  };
}

function buildMetadataUriPayload(form, logoUrl = '') {
  return JSON.stringify({
    name: String(form.tokenName || '').trim(),
    symbol: cleanSymbol(form.symbol || ''),
    image: logoUrl,
    website: String(form.website || '').trim(),
    x: String(form.x || '').trim(),
    telegram: String(form.telegram || '').trim(),
    note: String(form.note || '').trim(),
  });
}

async function uploadLogoAsset(dataUrl) {
  const raw = String(dataUrl || '');
  if (!raw.startsWith('data:')) return '';
  if (!APP_BACKEND_URL) {
    throw new Error('Logo 上链元数据需要配置 VITE_APP_BACKEND_URL 并运行后端。');
  }

  const response = await fetch(buildBackendUrl('/api/assets'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ dataUrl: raw }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.url) {
    throw new Error(result.error || 'Logo 资产上传失败，请稍后重试。');
  }
  return String(result.url);
}

async function buildMetadataUri(form) {
  const logoUrl = form.logoData ? await uploadLogoAsset(form.logoData) : '';
  return buildMetadataUriPayload(form, logoUrl);
}

async function queueProjectVerification(tokenAddress) {
  if (!APP_BACKEND_URL || !isAddress(tokenAddress)) return null;
  const response = await fetch(buildBackendUrl('/api/verify-project'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: tokenAddress }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || '自动验源码入队失败。');
  }
  return result.job || null;
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

async function getFactoryCreationFeeWei(formLike = null) {
  formLike;
  if (!isAddress(FACTORY_CONTRACT)) return 0n;
  const raw = await publicRpcCall(FACTORY_CONTRACT, new Interface(['function creationFee() view returns (uint256)']).encodeFunctionData('creationFee'));
  return hexToBigInt(raw);
}

function pageFromHash() {
  if (typeof window === 'undefined') return 'launch';
  const id = window.location.hash.replace('#', '');
  return navItems.some((item) => item.id === id) ? id : 'launch';
}

function pageIndex(page) {
  return Math.max(0, navItems.findIndex((item) => item.id === page));
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

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === form.templateId) || templates[0],
    [form.templateId],
  );

  const mintRaise = useMemo(
    () => numberValue(form.mintPrice) * numberValue(form.mintSlots),
    [form.mintPrice, form.mintSlots],
  );
  const launchAmount = useMemo(() => {
    return numberValue(getLaunchFeeBnb(form));
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

  function update(field, value) {
    if (field === 'deadLiquidity') {
      setForm((current) => ({ ...current, [field]: true }));
      return;
    }
    if (field === 'vanitySuffix') {
      setForm((current) => ({ ...current, vanitySuffix: VANITY_SUFFIX, vanitySalt: '' }));
      return;
    }
    if (field === 'mode') {
      setForm((current) => ({
        ...current,
        mode: 'mint',
        templateId: ACTIVE_TEMPLATE_ID,
      }));
      return;
    }
    setForm((current) => ({ ...current, [field]: value }));
  }

  function notify(message) {
    setToast(message);
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
            mintPrice: item.mintPrice,
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
    const suffix = normalizeHexSuffix(form.vanitySuffix || VANITY_SUFFIX);
    if (!suffix) {
      notify('请先确认想要的靓号尾号，例如 8888');
      return;
    }
    if (suffix.length > 4) {
      notify('当前发币工厂按后 4 位校验尾号，请填写 1-4 位十六进制字符');
      return;
    }
    const validation = validateLaunch();
    if (validation) {
      notify(validation);
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
      const metadataUri = await buildMetadataUri(form);
      const params = buildFactoryLaunchParams(form, address, metadataUri);
      notify(`正在匹配 Token 地址尾号 ...${suffix}，找到后会自动填入 Salt。`);
      const vanity = await resolveLaunchSalt(address, params, suffix);
      update('vanitySuffix', vanity.vanitySuffix || suffix);
      update('vanitySalt', vanity.salt);
      setVanityPreview(vanity.predictedTokenAddress || '');
      notify(`已匹配靓号 ...${vanity.vanitySuffix || suffix}，尝试 ${vanity.vanityAttempts || 0} 次。`);
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
      mode: 'mint',
      templateId: ACTIVE_TEMPLATE_ID,
      ...(typeof next.whitelist === 'boolean' ? { whitelist: next.whitelist } : {}),
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

  async function requestFactoryCreate(currentCheckout) {
    const { provider, address } = await ensureWallet();
    if (!isAddress(FACTORY_CONTRACT)) {
      throw new Error('发币工厂合约还未准备好，暂不能创建新币。');
    }

    const whitelistInfo = parseWhitelist(form.whitelistAddresses);
    const metadataUri = await buildMetadataUri(form);
    const params = buildFactoryLaunchParams(form, address, metadataUri);
    const suffix = normalizeHexSuffix(form.vanitySuffix || VANITY_SUFFIX);
    const vanity = await resolveLaunchSalt(address, params, suffix);
    const salt = suffix ? vanity.salt : saltToBytes32(form.vanitySalt, `${address}-${form.symbol}-${form.tokenName}`);
    if (vanity.vanitySuffix) {
      update('vanitySuffix', vanity.vanitySuffix);
      update('vanitySalt', salt);
      setVanityPreview(vanity.predictedTokenAddress || '');
      notify(`已锁定 Token 地址尾号 ...${vanity.vanitySuffix}，正在拉起钱包。`);
    }
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
      notify('Mint池已创建，正在写入白名单地址。');
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

    let verifyQueued = false;
    let verifyError = '';
    if (form.autoVerify && deployment?.tokenAddress) {
      try {
        await queueProjectVerification(deployment.tokenAddress);
        verifyQueued = true;
      } catch (error) {
        verifyError = error.message || '自动验源码入队失败';
      }
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
      predictedTokenAddress: vanity.predictedTokenAddress || '',
      vanitySuffix: vanity.vanitySuffix || '',
      vanityAttempts: vanity.vanityAttempts || 0,
      verifyQueued,
      verifyError,
      actionLabel: form.whitelist ? '部署白名单Mint池' : '部署公开Mint池',
    };
  }

  async function requestContractAction(currentCheckout) {
    const { provider, address } = await ensureWallet();

    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: address,
          to: currentCheckout.receiver,
          data: currentCheckout.data,
          value: weiHex(currentCheckout.valueWei || 0),
        },
      ],
    });

    return {
      txHash,
      from: address,
      receiver: currentCheckout.receiver,
      tokenAddress: currentCheckout.tokenAddress || '',
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
      description: '这次会调用该 Mint 池的退款方法。只有在未打满并超过退款窗口后，合约才会退回当前钱包的可退余额。',
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

  function openPoolMintCheckout(deployment, quantity = 1) {
    if (!deployment || !isAddress(deployment.pool) || sameAddress(deployment.pool, ZERO_ADDRESS)) {
      notify('这条记录没有 Mint 池，不能发起 Mint。');
      return;
    }
    const mintQuantity = BigInt(Math.max(1, Math.floor(Number(quantity) || 1)));
    const mintPriceWei = BigInt(deployment.mintPrice || deployment.valuePaid || 0n);
    if (mintPriceWei <= 0n) {
      notify('这条记录缺少 Mint 单价，暂不能发起 Mint。');
      return;
    }
    const valueWei = mintPriceWei * mintQuantity;
    setCheckout({
      type: 'contractAction',
      title: `Mint ${mintQuantity.toString()} 份`,
      description: '这次会调用该 Mint 池的 mint 方法，钱包弹窗里的接收地址应为当前项目的 Mint 池。',
      amountBnb: formatBnbFromWei(valueWei, 8),
      valueWei: valueWei.toString(),
      receiver: deployment.pool,
      tokenAddress: deployment.token,
      data: VAULT_WRITE_INTERFACE.encodeFunctionData('mint', [mintQuantity]),
      requiresOwner: false,
      purpose: 'mint',
      actionLabel: '确认 Mint',
      summary: [
        ['Mint池', shortAddress(deployment.pool)],
        ['Token', shortAddress(deployment.token)],
        ['Mint数量', `${mintQuantity.toString()} 份`],
        ['Mint单价', `${formatBnbFromWei(mintPriceWei, 8)} BNB`],
      ],
    });
  }

  function openPoolWhitelistCheckout(deployment, addresses) {
    if (!deployment || !isAddress(deployment.pool) || sameAddress(deployment.pool, ZERO_ADDRESS)) {
      notify('这条记录没有 Mint 池，不能写入白名单。');
      return;
    }
    const parsed = parseWhitelist(addresses);
    if (parsed.invalid.length > 0) {
      notify('白名单里有格式错误的钱包地址，请先修正。');
      return;
    }
    if (!parsed.valid.length) {
      notify('请至少填写 1 个有效白名单地址。');
      return;
    }
    setCheckout({
      type: 'contractAction',
      title: `写入白名单：${parsed.valid.length} 个地址`,
      description: '这次会调用该 Mint 池的白名单写入方法。只有项目 Owner 钱包可以成功执行。',
      amountBnb: '0',
      valueWei: '0',
      receiver: deployment.pool,
      tokenAddress: deployment.token,
      data: VAULT_WRITE_INTERFACE.encodeFunctionData('setWhitelistAccounts', [parsed.valid, true]),
      requiresOwner: true,
      purpose: 'setWhitelistAccounts',
      actionLabel: '确认写入白名单',
      summary: [
        ['Mint池', shortAddress(deployment.pool)],
        ['Token', shortAddress(deployment.token)],
        ['白名单地址', `${parsed.valid.length} 个`],
      ],
    });
  }

  function openPoolWhitelistModeCheckout(deployment, enabled) {
    if (!deployment || !isAddress(deployment.pool) || sameAddress(deployment.pool, ZERO_ADDRESS)) {
      notify('这条记录没有 Mint 池，不能切换白名单窗口。');
      return;
    }
    setCheckout({
      type: 'contractAction',
      title: enabled ? '开启白名单窗口' : '开启公开 Mint',
      description: '这次会调用该 Mint 池的白名单窗口开关方法。只有项目 Owner 钱包可以成功执行。',
      amountBnb: '0',
      valueWei: '0',
      receiver: deployment.pool,
      tokenAddress: deployment.token,
      data: VAULT_WRITE_INTERFACE.encodeFunctionData('setWhitelistEnabled', [Boolean(enabled)]),
      requiresOwner: true,
      purpose: enabled ? 'enableWhitelist' : 'disableWhitelist',
      actionLabel: enabled ? '确认开启白名单' : '确认开启公开 Mint',
      summary: [
        ['Mint池', shortAddress(deployment.pool)],
        ['Token', shortAddress(deployment.token)],
        ['目标状态', enabled ? '白名单窗口开启' : '公开 Mint 开启'],
      ],
    });
  }

  function handleLogoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 260 * 1024) {
      notify('Logo 图片请控制在 260KB 以内，才能写入后端资产并进入元数据。');
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
    if (!isFairMintTemplate(form.templateId)) return '当前页面只支持 PEPE Mint 池部署流程';
    if (normalizeHexSuffix(form.vanitySuffix).length !== String(form.vanitySuffix || '').replace(/^0x/i, '').replace(/\s+/g, '').length) {
      return '尾号只能填写 0-9 / a-f 的十六进制字符';
    }
    if (normalizeHexSuffix(form.vanitySuffix).length > 4) return '当前发币工厂尾号最多支持 4 位十六进制字符';
    if (form.owner.trim() && !isAddress(form.owner)) return '项目归属钱包地址格式不正确';
    const taxFields = [
      ['买税', form.buyTax],
      ['卖税', form.sellTax],
      ['转账税', form.transferTax],
      ['加池税', form.addLiquidityTax],
      ['撤池税', form.removeLiquidityTax],
      ['开盘保护税', form.launchProtectionTax],
    ];
    const invalidTax = taxFields.find(([, value]) => numberValue(value) < 0 || numberValue(value) > 25);
    if (invalidTax) return `${invalidTax[0]}必须在 0% - 25% 之间`;
    const splitFields = [
      ['营销分配', form.fundFeePercent],
      ['LP分配', form.lpFeePercent],
      ['分红分配', form.dividendFeePercent],
      ['销毁分配', form.burnRate],
    ];
    const invalidSplit = splitFields.find(([, value]) => numberValue(value) < 0 || numberValue(value) > 100);
    if (invalidSplit) return `${invalidSplit[0]}必须在 0% - 100% 之间`;
    if (getTaxSplitTotal(form) > 100) return '税收分配总和不能超过 100%';
    if (String(form.launchProtectionBlocks || '0').trim() && !/^\d+$/.test(String(form.launchProtectionBlocks).trim())) return '保护区块必须是整数';
    if (String(form.claimWaitSeconds || '0').trim() && !/^\d+$/.test(String(form.claimWaitSeconds).trim())) return '分红等待秒数必须是整数';
    if (uintNumber(form.claimWaitSeconds) > 24 * 60 * 60) return '分红等待秒数不能超过 24 小时';
    if (isDividendTemplate(form.templateId)) {
      if (!isAddress(TOKEN_CONTRACT)) return '平台币地址未配置，暂不能创建分红模板';
      if (String(form.rewardSwapThreshold || '').trim() && numberValue(form.rewardSwapThreshold) <= 0) return '换平台币触发量必须大于 0';
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

  async function openFactoryPlanCheckout() {
    const validation = validateLaunch();
    if (validation) {
      notify(validation);
      return;
    }

    if (!isAddress(FACTORY_CONTRACT)) {
      notify('发币工厂地址未配置，不能创建真实链上项目。');
      return;
    }

    let factoryFeeWei = 0n;
    try {
      factoryFeeWei = await getFactoryCreationFeeWei(form);
    } catch {
      notify('工厂费用读取失败，确认时会再次按链上费用读取。');
    }

    const whitelistInfo = parseWhitelist(form.whitelistAddresses);
    const dividendMode = isDividendTemplate(form.templateId);
    const mintParams = getFairMintParams(form);
    const mintLaunchName = form.whitelist ? '白名单 Mint 池' : '公开 Mint 池';
    const templateId = getTemplateId(form.templateId);
    const suffix = normalizeHexSuffix(form.vanitySuffix || VANITY_SUFFIX);
    const totalValueWei = factoryFeeWei;
    setCheckout({
      type: 'factoryCreate',
      title: `创建发币项目：${form.tokenName || 'Pepe Token'}`,
      description: '这次会调用 PEPE 发币工厂创建新的代币和 Mint 池。请在钱包里核对工厂地址、创建费和网络。',
      amountBnb: formatBnbFromWei(totalValueWei, 8),
      valueWei: totalValueWei.toString(),
      actionLabel: form.whitelist ? '确认部署白名单Mint池' : '确认部署公开Mint池',
      summary: [
        ['工厂状态', '真实链上创建交易'],
        ['工厂合约', shortAddress(FACTORY_CONTRACT)],
        ['部署类型', form.whitelist ? '白名单 Mint' : '公开 Mint'],
        ['合约逻辑', 'PEPE Mint 池'],
        ['链上动作', `创建${mintLaunchName}`],
        ['创建方法', 'Token + Mint 池，每笔 Mint 自动加池'],
        ['代币总量', formatNumber(form.totalSupply, 0)],
        ['创建费', `${formatBnbFromWei(factoryFeeWei, 8)} BNB`],
        ['Mint单价', `${formatBnbFromWei(mintParams.price, 8)} BNB`],
        ['Mint总份数', `${mintParams.mintLimit.toString()} 份`],
        ...(form.whitelist ? [['白名单总份数', `${mintParams.whiteLimit.toString()} 份`]] : []),
        ['每笔自动加池', 'BNB 100% / 代币 50%'],
        ['手动退款窗口', '24 小时'],
        ['配池代币储备', `${formatUnits(mintParams.liquidityTokenAmount, 18, 4)} ${cleanSymbol(form.symbol) || 'PEPE'}`],
        ...(dividendMode
          ? [
              ['分红平台币', shortAddress(TOKEN_CONTRACT)],
              ['换平台币触发量', form.rewardSwapThreshold ? `${form.rewardSwapThreshold} ${cleanSymbol(form.symbol) || 'TOKEN'}` : '总量 0.01%'],
            ]
          : []),
        ['买/卖税', `${form.buyTax}% / ${form.sellTax}%`],
        ['高级税', getAdvancedTaxSummary(form)],
        ['税收分配', getTaxSplitSummary(form)],
        ['LP接收', shortAddress(DEAD_ADDRESS)],
        ['尾号定制', suffix ? `...${suffix}` : '未指定'],
        ['Salt', suffix ? '确认时后端匹配' : form.vanitySalt ? shortAddress(saltToBytes32(form.vanitySalt)) : '确认时自动生成'],
        ['权限', 'Token / Mint池 Owner 给项目方，打满后 LP 进 dead'],
        ['接收钱包', form.owner && isAddress(form.owner) ? shortAddress(form.owner) : wallet.address ? shortAddress(wallet.address) : '确认时连接'],
        ['白名单', form.whitelist ? `${whitelistInfo.valid.length} 个地址 / ${mintParams.whiteLimit.toString()} 份` : '未开启'],
      ],
    });
  }

  function submitLaunch(event) {
    event.preventDefault();
    if (form.mode !== 'mint' || !isFairMintTemplate(form.templateId)) {
      update('mode', 'mint');
      update('templateId', ACTIVE_TEMPLATE_ID);
    }
    openFactoryPlanCheckout();
  }

  async function confirmCheckout() {
    if (!checkout || busy) return;
    setBusy(true);
    try {
      let payment;
      if (checkout.type === 'contractAction') {
        payment = await requestContractAction(checkout);
      } else if (checkout.type === 'factoryCreate') {
        payment = await requestFactoryCreate(checkout);
      } else {
        throw new Error('当前操作没有接入真实合约调用。');
      }
      const actionName =
        checkout.type === 'contractAction'
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
        mode: form.whitelist ? '白名单 Mint' : '公开 Mint',
        createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      };
      setLastResult(result);
      setCheckout(null);
      if (checkout.type === 'factoryCreate') await refreshFactoryRecords(true);
      notify(
        checkout.type === 'factoryCreate' && result.tokenAddress
          ? result.verifyQueued
            ? '新币已发射，Token 地址已解析，自动验源码已入队。'
            : result.verifyError
              ? `新币已发射，但自动验源码入队失败：${result.verifyError}`
              : '新币已发射，Token 地址已解析并写入发射记录。'
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
          {activePage === 'launch' && (
            <LaunchWorkbench
              form={form}
              wallet={wallet}
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
              copyText={copyText}
              startLaunch={startLaunch}
            />
          )}
        </div>
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
          onMint={openPoolMintCheckout}
          onRefund={openPoolRefundCheckout}
          onSetWhitelist={openPoolWhitelistCheckout}
          onSetWhitelistMode={openPoolWhitelistModeCheckout}
          copyText={copyText}
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
      <button className="brand" onClick={() => navigate('launch')} type="button">
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
          <b>部署新币</b>
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

function HomePage({ form, wallet, selectedMode, selectedTemplate, update, navigate, connectWallet }) {
  return (
    <>
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
        <RuleCard icon={Users} title="无预挖公平" text="Mint 池启动无初始分配，全员同入口，杜绝老鼠仓和提前埋伏。" />
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
        title="PEPE 发币参数模板"
        text="这里只保留当前工厂真实支持的参数组合：标准、零税、黑洞底池、平台币分红和白名单 Mint 池。"
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
              <i>已接入真实工厂创建</i>
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
        title="一条真实部署流程"
        text="你可以用 1 分钟发起一场 Pepe 战役，也可以把 Mint 曲线、毕业目标和底池规则配置得更完整。"
      />
      <div className="section-actions">
        <button className="primary" onClick={() => startLaunch({ mode: 'direct', step: 'basic' })} type="button">
          <Rocket size={16} />
          开始部署新币
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
                ? ['设定总量与税率', '创建 Token + Mint池', 'Mint 自动形成 dead LP']
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
  mineVanitySalt,
  vanityPreview,
  factoryRecords,
  factoryRecordsCount,
  refreshFactoryRecords,
  onSelectDeployment,
  busy,
}) {
  const [advancedOpen, setAdvancedOpen] = useState(launchStep === 'rules' || launchStep === 'preview');
  const whitelistInfo = parseWhitelist(form.whitelistAddresses);
  const tokenSymbol = form.symbol || 'PEPE';
  const mintParams = getFairMintParams(form);
  const selectedMintPlaybook = form.whitelist ? 'whitelist' : 'public';

  useEffect(() => {
    if (launchStep === 'rules' || launchStep === 'preview') setAdvancedOpen(true);
  }, [launchStep]);

  function chooseMintPlaybook(playbook) {
    update('templateId', ACTIVE_TEMPLATE_ID);
    update('whitelist', playbook.whitelist);
  }

  function toggleAdvanced() {
    const nextOpen = !advancedOpen;
    setAdvancedOpen(nextOpen);
    setLaunchStep(nextOpen ? 'rules' : 'basic');
  }

  return (
    <section className="section-panel launch-panel" id="launch">
      <SectionHead
        eyebrow="Launch Console"
        title="部署新币"
        text="一条真实发币流程：部署代币、创建 Mint 池、匹配 eeee 尾号，并把验源码任务送入后端队列。"
      />
      <form className="launch-workbench" onSubmit={submitLaunch}>
        <div className="launch-main quick-launch-main">
          <div className="quick-launch-hero">
            <div>
              <span className="eyebrow">Quick Launch</span>
              <h3>核心参数</h3>
              <p>先填代币和 Mint 参数，高级税率与社群资料折叠在下方，确认后拉起真实钱包交易。</p>
            </div>
            <div className="quick-launch-status">
              <span className="status-pill green">尾号 ...{normalizeHexSuffix(form.vanitySuffix || VANITY_SUFFIX)}</span>
              <span className="status-pill green">自动验源码 {form.autoVerify ? '开' : '关'}</span>
              <span className="status-pill cyan">{form.whitelist ? '白名单Mint' : '公开Mint'}</span>
            </div>
          </div>

          <fieldset className="wizard-fieldset quick-fieldset">
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
            <FormField label="Mint类型" wide>
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
              <small className="field-hint">只保留真实可用的部署链路，白名单与公开 Mint 会写入合约参数。</small>
            </FormField>
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

          <fieldset className="wizard-fieldset quick-fieldset">
            <legend>Mint参数</legend>
            <FormField label="每份支付 BNB">
              <input value={form.mintPrice} onChange={(event) => update('mintPrice', event.target.value)} inputMode="decimal" />
            </FormField>
            <FormField label="每份获得代币">
              <input value={formatUnits(mintParams.amountPerMint, 18, 4)} disabled readOnly />
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
            <div className="fixed-rule-strip">
              <span>
                <ShieldCheck size={15} />
                <b>每笔加池</b>
                <em>BNB 100% / 代币 50%</em>
              </span>
              <span>
                <LockKeyhole size={15} />
                <b>LP黑洞</b>
                <em>{shortAddress(DEAD_ADDRESS)}</em>
              </span>
              <span>
                <Timer size={15} />
                <b>退款窗口</b>
                <em>24 小时</em>
              </span>
            </div>
            <ToggleField
              checked
              disabled
              label="底池自动转 dead"
              text="初始 LP 或 Mint 累积 LP 全部进入黑洞地址。"
              onChange={(value) => update('deadLiquidity', value)}
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
          </fieldset>

          <div className={`advanced-shell ${advancedOpen ? 'open' : ''}`}>
            <button className="advanced-toggle" onClick={toggleAdvanced} type="button" aria-expanded={advancedOpen}>
              <SlidersHorizontal size={16} />
              <span>
                <b>高级配置</b>
                <em>税率、靓号 Salt、自动验源码和社群资料</em>
              </span>
              <ChevronRight className="advanced-chevron" size={16} />
            </button>
            {advancedOpen && (
              <fieldset className="wizard-fieldset quick-fieldset advanced-fieldset">
                <legend>高级配置</legend>
                <FormField label="买税 %">
                  <input value={form.buyTax} onChange={(event) => update('buyTax', event.target.value)} inputMode="decimal" />
                </FormField>
                <FormField label="卖税 %">
                  <input value={form.sellTax} onChange={(event) => update('sellTax', event.target.value)} inputMode="decimal" />
                </FormField>
                <FormField label="转账税 %">
                  <input value={form.transferTax} onChange={(event) => update('transferTax', event.target.value)} inputMode="decimal" />
                </FormField>
                <FormField label="加池税 %">
                  <input value={form.addLiquidityTax} onChange={(event) => update('addLiquidityTax', event.target.value)} inputMode="decimal" />
                </FormField>
                <FormField label="撤池税 %">
                  <input value={form.removeLiquidityTax} onChange={(event) => update('removeLiquidityTax', event.target.value)} inputMode="decimal" />
                </FormField>
                <FormField label="开盘保护税 %">
                  <input value={form.launchProtectionTax} onChange={(event) => update('launchProtectionTax', event.target.value)} inputMode="decimal" />
                </FormField>
                <FormField label="保护区块">
                  <input value={form.launchProtectionBlocks} onChange={(event) => update('launchProtectionBlocks', event.target.value)} inputMode="numeric" />
                </FormField>
                <FormField label="分红等待秒">
                  <input value={form.claimWaitSeconds} onChange={(event) => update('claimWaitSeconds', event.target.value)} inputMode="numeric" />
                </FormField>
                <FormField label="营销分配 %">
                  <input value={form.fundFeePercent} onChange={(event) => update('fundFeePercent', event.target.value)} inputMode="decimal" />
                </FormField>
                <FormField label="LP分配 %">
                  <input value={form.lpFeePercent} onChange={(event) => update('lpFeePercent', event.target.value)} inputMode="decimal" />
                </FormField>
                <FormField label="分红分配 %">
                  <input value={form.dividendFeePercent} onChange={(event) => update('dividendFeePercent', event.target.value)} inputMode="decimal" />
                </FormField>
                {isDividendTemplate(form.templateId) && (
                  <FormField label="换平台币触发量">
                    <input value={form.rewardSwapThreshold} onChange={(event) => update('rewardSwapThreshold', event.target.value)} inputMode="decimal" placeholder="留空为总量0.01%" />
                    <small className="field-hint">税收代币累计到该数量后，自动换成平台币进入分红账本。</small>
                  </FormField>
                )}
                <FormField label="销毁分配 %">
                  <input value={form.burnRate} onChange={(event) => update('burnRate', event.target.value)} inputMode="decimal" />
                  <small className="field-hint">当前分配合计 {formatBnb(getTaxSplitTotal(form))}%</small>
                </FormField>
                <FormField label="靓号尾号">
                  <div className="vanity-lock-card">
                    <span>
                      <em>固定匹配</em>
                      <b>...{normalizeHexSuffix(form.vanitySuffix || VANITY_SUFFIX) || VANITY_SUFFIX}</b>
                    </span>
                    <small>当前工厂自动校验，部署时锁定尾号</small>
                  </div>
                </FormField>
                <FormField label="CREATE2 Salt">
                  <div className="vanity-tools">
                    <input
                      value={form.vanitySalt}
                      onChange={(event) => update('vanitySalt', event.target.value)}
                      placeholder="不填则自动生成"
                    />
                    <button className="secondary" disabled={busy || !normalizeHexSuffix(form.vanitySuffix || VANITY_SUFFIX)} onClick={mineVanitySalt} type="button">
                      <Gauge size={15} />
                      匹配靓号Salt
                    </button>
                  </div>
                  {vanityPreview && <small className="field-hint">预测地址：{shortAddress(vanityPreview)}，尾号已匹配</small>}
                </FormField>
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
          </div>

          <div className="quick-submit-card">
            <div className="launch-confirm compact-confirm">
              <Rocket size={24} />
              <div>
                <h3>{form.tokenName || 'Pepe Fighter'} 准备发射</h3>
                <p>确认后会拉起真实钱包交易，创建新币和 Mint 池。</p>
              </div>
            </div>
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
                白名单：{whitelistInfo.valid.length} 个有效地址 / {mintParams.whiteLimit.toString()} 份
                {whitelistInfo.invalid.length > 0 && `，${whitelistInfo.invalid.length} 个地址需修正`}
              </div>
            )}
            <div className="quick-submit-actions">
              {!wallet.address && (
                <button className="secondary" onClick={connectWallet} type="button">
                  <Wallet size={16} />
                  连接钱包
                </button>
              )}
              <button className="primary" disabled={busy} type="submit">
                <Coins size={16} />
                {form.whitelist ? '部署白名单Mint池' : '部署公开Mint池'}
              </button>
            </div>
          </div>

        </div>

        <aside className={`launch-summary ${launchStep !== 'preview' ? 'desktop-summary' : ''}`}>
          <Panel title="擂台预览" icon={Gauge}>
            <div className="token-preview">
              <div className="preview-logo">{form.logoData ? <img alt="Logo" src={form.logoData} /> : <FrogMark />}</div>
              <div>
                <b>{form.tokenName || 'Pepe Fighter'}</b>
                <span>{form.symbol || 'PEPE'} · {form.whitelist ? '白名单 Mint' : '公开 Mint'}</span>
              </div>
            </div>
            <div className="preview-lines">
              <MiniMetric label="部署类型" value={form.whitelist ? '白名单 Mint' : '公开 Mint'} />
              <MiniMetric label="预计支付" value={`创建费 ${getLaunchFeeBnb(form)} BNB`} />
              <MiniMetric label="Mint募集上限" value={`${formatBnb(mintRaise)} BNB`} />
              <MiniMetric label="黑洞地址" value={shortAddress(DEAD_ADDRESS)} />
              <MiniMetric label="买/卖税" value={`${form.buyTax}% / ${form.sellTax}%`} />
              <MiniMetric label="高级税" value={getAdvancedTaxSummary(form)} />
              <MiniMetric label="税收分配" value={getTaxSplitSummary(form)} />
              <MiniMetric label="尾号定制" value={`...${normalizeHexSuffix(form.vanitySuffix || VANITY_SUFFIX)}`} />
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
            {form.whitelist && <span className="status-pill green">白名单创建时写入新池</span>}
            <button className="primary full submit-btn" type="submit">
              <Coins size={16} />
              {form.whitelist ? '部署白名单Mint池' : '部署公开Mint池'}
            </button>
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
                  {lastResult.tokenAddress && (
                    <a className="secondary" href={pancakeUrl(lastResult.tokenAddress)} target="_blank" rel="noreferrer">
                      <ExternalLink size={15} />
                      Pancake交易
                    </a>
                  )}
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
            <DeploymentRecordsList records={factoryRecords.slice(0, 8)} compact onSelectDeployment={onSelectDeployment} copyText={copyText} />
          </Panel>
        </aside>
      </form>
    </section>
  );
}

function deploymentKey(item) {
  return `${item.token || item.pool || item.creator}-${item.blockNumber}-${item.salt}`;
}

function DeploymentRecordsList({ records, compact = false, onSelectDeployment, copyText }) {
  if (!records.length) {
    return <EmptyInline icon={Timer} title="新工厂暂无发币记录" text="只有通过本页面发币工厂创建成功的新币，才会写入这里；创建完成后会自动显示部署钱包、Token、Mint池和开源入口。" />;
  }

  return (
    <div className={`launch-records ${compact ? 'compact' : ''}`}>
      {records.map((item) => (
        <DeploymentRecordCard item={item} key={deploymentKey(item)} compact={compact} onSelectDeployment={onSelectDeployment} copyText={copyText} />
      ))}
    </div>
  );
}

function DeploymentRecordCard({ item, compact = false, onSelectDeployment, copyText }) {
  const hasPool = isAddress(item.pool) && !sameAddress(item.pool, ZERO_ADDRESS);
  const hasPair = isAddress(item.pair) && !sameAddress(item.pair, ZERO_ADDRESS);
  const modeLabel = deploymentModeLabel(item.templateId, item.pool);
  const marketAddress = hasPool ? item.pool : item.pair;

  return (
    <article className={`launch-record ${compact ? 'compact' : ''}`}>
      <span>
        <b>{templateLabelById(item.templateId)}</b>
        <em>{modeLabel} · {deploymentTimeLabel(item)}</em>
      </span>
      <div className="record-metrics">
        <small>
          <em>部署钱包</em>
          <AddressCopy value={item.creator} label="部署钱包" copyText={copyText} />
        </small>
        <small>
          <em>Token</em>
          <AddressCopy value={item.token} label="Token合约" copyText={copyText} />
        </small>
        {!compact && (
          <small>
            <em>{hasPool ? 'Mint池' : '交易对'}</em>
            <AddressCopy value={marketAddress} label={hasPool ? 'Mint池' : '交易对'} copyText={copyText} fallback="待生成" />
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

function DeploymentsPage({ records, total, refreshFactoryRecords, onSelectDeployment, copyText, startLaunch }) {
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
          部署白名单Mint
        </button>
        <button className="secondary" onClick={() => refreshFactoryRecords(false)} type="button">
          <Timer size={16} />
          刷新部署列表
        </button>
        <a className="secondary" href={addressUrl(FACTORY_CONTRACT)} target="_blank" rel="noreferrer">
          <ExternalLink size={16} />
          工厂合约
        </a>
        <button className="secondary" onClick={() => copyText?.(FACTORY_CONTRACT, '工厂合约')} type="button">
          <Copy size={16} />
          复制工厂
        </button>
      </div>
      <div className="deployment-stats">
        <MiniMetric label="链上总部署" value={`${total} 个`} />
        <MiniMetric label="当前展示" value={`${records.length} 个`} />
        <MiniMetric label="工厂地址" value={shortAddress(FACTORY_CONTRACT)} />
        <MiniMetric label="创建费" value={`普通 ${LAUNCH_FEE_BNB} / 白名单 ${WHITELIST_LAUNCH_FEE_BNB}`} />
      </div>
      <DeploymentRecordsList records={records} onSelectDeployment={onSelectDeployment} copyText={copyText} />
    </section>
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
    <div className="mode-toggle" role="group" aria-label="部署流程">
      <button className={value === 'mint' ? 'active' : ''} onClick={() => onChange('mint')} type="button">
        <Coins size={15} />
        PEPE Mint 池
      </button>
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

function AddressCopy({ value, label, copyText, fallback = '待生成' }) {
  const canCopy = isAddress(value);
  if (!canCopy) return <b>{fallback}</b>;
  return (
    <span className="address-copy">
      <a href={addressUrl(value)} target="_blank" rel="noreferrer">{shortAddress(value)}</a>
      <button onClick={() => copyText?.(value, label)} type="button" aria-label={`复制${label}`}>
        <Copy size={13} />
      </button>
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

function DeploymentDetailModal({ deployment, close, onMint, onRefund, onSetWhitelist, onSetWhitelistMode, copyText }) {
  const [mintQuantity, setMintQuantity] = useState('1');
  const [whitelistBatch, setWhitelistBatch] = useState('');
  const hasPool = isAddress(deployment.pool) && !sameAddress(deployment.pool, ZERO_ADDRESS);
  const hasPair = isAddress(deployment.pair) && !sameAddress(deployment.pair, ZERO_ADDRESS);
  const primaryMarketAddress = hasPool ? deployment.pool : deployment.pair;
  const modeLabel = deploymentModeLabel(deployment.templateId, deployment.pool);
  const mintPriceWei = BigInt(deployment.mintPrice || deployment.valuePaid || 0n);
  const mintQuantityValue = BigInt(Math.max(1, Math.floor(numberValue(mintQuantity) || 1)));
  const mintCostWei = mintPriceWei * mintQuantityValue;

  const details = [
    ['部署钱包', shortAddress(deployment.creator)],
    ['Token合约', shortAddress(deployment.token)],
    [hasPool ? 'Mint池' : '交易对', shortAddress(primaryMarketAddress) || '待生成'],
    ['模板', `${templateLabelById(deployment.templateId)} / ID ${deployment.templateId}`],
    ['发射模式', modeLabel],
    ['Mint单价', `${formatBnbFromWei(mintPriceWei, 8)} BNB`],
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
          <button className="secondary" onClick={() => copyText?.(deployment.creator, '部署钱包')} type="button">
            <Copy size={15} />
            复制钱包
          </button>
          <button className="secondary" onClick={() => copyText?.(deployment.token, 'Token合约')} type="button">
            <Copy size={15} />
            复制Token
          </button>
          {hasPool && (
            <button className="secondary" onClick={() => copyText?.(deployment.pool, 'Mint池')} type="button">
              <Copy size={15} />
              复制Mint池
            </button>
          )}
          <button className="secondary" onClick={() => copyText?.(FACTORY_CONTRACT, '工厂合约')} type="button">
            <Copy size={15} />
            复制工厂
          </button>
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
        {hasPool && (
          <div className="deployment-mint-box">
            <label className="form-field">
              <span>Mint数量</span>
              <input
                min="1"
                type="number"
                value={mintQuantity}
                onChange={(event) => setMintQuantity(event.target.value)}
                inputMode="numeric"
              />
            </label>
            <div className="preview-lines">
              <MiniMetric label="Mint单价" value={`${formatBnbFromWei(mintPriceWei, 8)} BNB`} />
              <MiniMetric label="本次支付" value={`${formatBnbFromWei(mintCostWei, 8)} BNB`} />
            </div>
          </div>
        )}
        {hasPool && (
          <div className="deployment-mint-box">
            <label className="form-field">
              <span>Owner白名单地址</span>
              <textarea
                value={whitelistBatch}
                onChange={(event) => setWhitelistBatch(event.target.value)}
                placeholder={'每行一个地址，或用逗号/空格分隔\n0x...\n0x...'}
              />
            </label>
            <div className="record-actions">
              <button className="secondary" onClick={() => onSetWhitelist(deployment, whitelistBatch)} type="button">
                <LockKeyhole size={15} />
                写入白名单
              </button>
              <button className="secondary" onClick={() => onSetWhitelistMode(deployment, true)} type="button">
                开启白名单
              </button>
              <button className="secondary" onClick={() => onSetWhitelistMode(deployment, false)} type="button">
                开启公开Mint
              </button>
            </div>
          </div>
        )}
        <div className="modal-actions">
          {hasPool && (
            <button className="primary" onClick={() => onMint(deployment, Number(mintQuantity) || 1)} type="button">
              <Coins size={16} />
              Mint当前项目
            </button>
          )}
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
    checkout.type === 'contractAction' || checkout.type === 'factoryCreate'
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
