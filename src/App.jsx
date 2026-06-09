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
import pepeArenaArt from './assets/pepe-arena.svg';

const STORAGE_KEY = 'pepe-launch-arena-draft-v4';
const LAUNCH_FEE_BNB = '0.01';
const PAYMENT_RECEIVER = import.meta.env.VITE_PAYMENT_RECEIVER || '';
const FACTORY_CONTRACT = import.meta.env.VITE_FACTORY_CONTRACT || '';
const DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD';
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
  { id: 'launch', label: '登上擂台', icon: Upload },
  { id: 'manifesto', label: '擂主宣言', icon: ListChecks },
];

const launchModes = [
  {
    id: 'direct',
    title: '直接发币',
    kicker: '适合已有分配方案',
    text: '设定总量、税率和初始流动性，支付 BNB 后发起部署，LP 规则按黑洞底池执行。',
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
    tag: '持币生BNB',
    text: '交易税进入分红池，持币地址按比例获得 BNB。',
  },
  {
    id: 'fair-mint',
    name: '公平启动模板',
    tag: '无预挖',
    text: '无团队预留、无老鼠仓，发射权交给 Mint 速度和共识。',
  },
  {
    id: 'no-owner',
    name: '无Owner模板',
    tag: '部署即放弃',
    text: '部署后抛弃所有权，后续参数不能被随意修改。',
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
  },
  {
    id: 'zero-tax',
    name: '零税公平模板',
    tag: '纯净交易',
    text: '买卖税为 0，适合强调简单、透明、公平的 meme。',
  },
  {
    id: 'dividend-token',
    name: '指定币分红模板',
    tag: '多币分红',
    text: '支持 BNB 或指定代币分红，适合社区运营玩法。',
  },
  {
    id: 'community',
    name: '社区金库模板',
    tag: '公开金库',
    text: '营销、回购、分红比例写入参数，所有规则链上可查。',
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
  ['02', '选择模式', '直接发币或自由 Mint，选择合约模板和税控参数。', SlidersHorizontal],
  ['03', '上传Logo', '上传 Pepe 风格 Logo，预览代币名、符号和擂台视觉。', Upload],
  ['04', '登上擂台', '确认支付并拉起钱包，等待链上交易回执。', Rocket],
];

const launchWizardSteps = [
  { id: 'mode', label: '模式', title: '发射模式' },
  { id: 'basic', label: '基础', title: '基础信息' },
  { id: 'params', label: '参数', title: '发射参数' },
  { id: 'rules', label: '规则', title: '税率与权限' },
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
  mintPrice: '0.001',
  tokensPerMint: '1000',
  mintSlots: '1000',
  maxPerWallet: '5',
  priceCurve: '固定价格',
  graduationTarget: '5',
  startTime: '',
  website: '',
  x: '',
  telegram: '',
  deadLiquidity: true,
  renounceOwner: true,
  whitelist: false,
  whitelistAddresses: '',
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
    if (saved?.version === 4) return { ...defaultForm, ...saved.form };
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

function toWeiHex(amountBnb) {
  const [whole = '0', fraction = ''] = String(amountBnb || '0').split('.');
  const wei =
    BigInt(whole || '0') * 10n ** 18n +
    BigInt((fraction || '').padEnd(18, '0').slice(0, 18) || '0');
  return `0x${wei.toString(16)}`;
}

function txUrl(hash) {
  return hash ? `https://bscscan.com/tx/${hash}` : '#';
}

function addressUrl(address) {
  return isAddress(address) ? `https://bscscan.com/address/${address}` : '#';
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
  const [launchStep, setLaunchStep] = useState('mode');
  const [form, setForm] = useState(loadDraft);
  const [wallet, setWallet] = useState({ address: '', chainId: '', providerName: '' });
  const [checkout, setCheckout] = useState(null);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState(null);

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
    const baseFee = numberValue(LAUNCH_FEE_BNB);
    if (form.mode === 'direct') return baseFee + Math.max(0, numberValue(form.initialLiquidity));
    return baseFee;
  }, [form.initialLiquidity, form.mode]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 4, form }));
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
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function notify(message) {
    setToast(message);
  }

  function navigateToPage(page) {
    if (!navItems.some((item) => item.id === page)) return;
    setActivePage(page);
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
      throw new Error('链上执行入口尚未接入，请稍后再发起交易。');
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
    if (form.owner.trim() && !isAddress(form.owner)) return '项目归属钱包地址格式不正确';
    if (numberValue(form.buyTax) < 0 || numberValue(form.sellTax) < 0) return '税率不能小于 0';
    if (form.mode === 'direct' && numberValue(form.initialLiquidity) < 0) return '初始流动性不能小于 0';
    const whitelistInfo = parseWhitelist(form.whitelistAddresses);
    if (form.whitelist && whitelistInfo.valid.length === 0) return '已开启白名单，请至少添加 1 个有效钱包地址';
    if (form.whitelist && whitelistInfo.invalid.length > 0) return '白名单里有格式错误的钱包地址，请先修正';
    if (form.mode === 'mint') {
      if (numberValue(form.mintPrice) <= 0) return 'Mint 单价必须大于 0';
      if (numberValue(form.tokensPerMint) <= 0) return '每份 Mint 获得代币必须大于 0';
      if (numberValue(form.mintSlots) <= 0) return 'Mint 总份数必须大于 0';
      if (numberValue(form.maxPerWallet) <= 0) return '每钱包 Mint 上限必须大于 0';
    }
    return '';
  }

  function submitLaunch(event) {
    event.preventDefault();
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
        ['Owner', form.renounceOwner ? '部署后抛弃' : '保留项目方管理'],
        ['白名单', form.whitelist ? `${whitelistInfo.valid.length} 个地址` : '未开启'],
      ],
    });
  }

  async function confirmCheckout() {
    if (!checkout || busy) return;
    setBusy(true);
    try {
      const payment = await requestPayment(checkout.amountBnb, checkout.type);
      const result = {
        ...payment,
        amountBnb: checkout.amountBnb,
        tokenName: form.tokenName.trim(),
        symbol: form.symbol.trim(),
        template: selectedTemplate.name,
        mode: selectedMode.title,
        createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      };
      setLastResult(result);
      setCheckout(null);
      notify('真实钱包交易已发出，等待链上确认。');
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
      <Topbar wallet={wallet} activePage={activePage} navigate={navigateToPage} connectWallet={connectWallet} />
      <main className="shell page-shell">
        <div className="page-stage">
          {activePage === 'arena' && (
            <HomePage
              form={form}
              wallet={wallet}
              selectedMode={selectedMode}
              selectedTemplate={selectedTemplate}
              update={update}
              navigate={navigateToPage}
              connectWallet={connectWallet}
            />
          )}
          {activePage === 'rules' && <RulesPage />}
          {activePage === 'templates' && (
            <TemplateSection selectedTemplate={selectedTemplate} selectTemplate={(id) => update('templateId', id)} />
          )}
          {activePage === 'modes' && <ModeSection />}
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
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Topbar({ wallet, activePage, navigate, connectWallet }) {
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
    [FileCheck2, '合约模板', '10+'],
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

function TemplateSection({ selectedTemplate, selectTemplate }) {
  return (
    <section className="section-panel" id="templates">
      <SectionHead
        eyebrow="Contract Templates"
        title="多种模板协议，像选皮肤一样发币"
        text="BSC 链 10+ 成熟模板，覆盖标准、燃烧、分红、公平 Mint、无 Owner、防巨鲸、黑洞底池等常用玩法。"
      />
      <div className="template-grid showcase">
        {templates.map((template) => (
          <button
            className={`template-card ${selectedTemplate.id === template.id ? 'active' : ''}`}
            key={template.id}
            onClick={() => selectTemplate(template.id)}
            type="button"
          >
            <span>
              <small>{template.tag}</small>
              <b>{template.name}</b>
              <em>{template.text}</em>
            </span>
            {selectedTemplate.id === template.id && <CheckCircle2 size={18} />}
          </button>
        ))}
      </div>
    </section>
  );
}

function ModeSection() {
  return (
    <section className="section-panel" id="modes">
      <SectionHead
        eyebrow="Launch Modes"
        title="两种发射姿势：直接发币 / 自由 Mint"
        text="你可以用 1 分钟发起一场 Pepe 战役，也可以把 Mint 曲线、毕业目标和底池规则配置得更完整。"
      />
      <div className="mode-grid">
        {launchModes.map(({ id, title, kicker, text, icon: Icon }) => (
          <article className="mode-card" key={id}>
            <Icon size={23} />
            <span>{kicker}</span>
            <h3>{title}</h3>
            <p>{text}</p>
            <ul>
              {(id === 'direct'
                ? ['设定总量与税率', '可加入初始流动性', '部署完成后创建交易对']
                : ['设定 Mint 单价与份数', '每钱包上限与白名单', 'Mint BNB 自动组成底池']
              ).map((item) => (
                <li key={item}>
                  <CheckCircle2 size={15} />
                  {item}
                </li>
              ))}
            </ul>
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
}) {
  const currentStepIndex = launchStepIndex(launchStep);
  const previousStep = launchWizardSteps[currentStepIndex - 1];
  const nextStep = launchWizardSteps[currentStepIndex + 1];
  const whitelistInfo = parseWhitelist(form.whitelistAddresses);

  return (
    <section className="section-panel launch-panel" id="launch">
      <SectionHead
        eyebrow="Launch Console"
        title="登上你的擂台"
        text="发射台改成步骤页了。按顺序填模式、基础、参数、规则，最后预览并拉起真实钱包。"
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
              <FormField label="合约模板" wide>
                <div className="template-picker">
                  {templates.slice(0, 8).map((template) => (
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
              <legend>{form.mode === 'mint' ? '自由 Mint 参数' : '直接发币参数'}</legend>
              {form.mode === 'mint' ? (
                <>
                  <FormField label="每份支付 BNB">
                    <input value={form.mintPrice} onChange={(event) => update('mintPrice', event.target.value)} inputMode="decimal" />
                  </FormField>
                  <FormField label="每份获得代币">
                    <input value={form.tokensPerMint} onChange={(event) => update('tokensPerMint', event.target.value)} inputMode="decimal" />
                  </FormField>
                  <FormField label="Mint 总份数">
                    <input value={form.mintSlots} onChange={(event) => update('mintSlots', event.target.value)} inputMode="decimal" />
                  </FormField>
                  <FormField label="每钱包上限">
                    <input value={form.maxPerWallet} onChange={(event) => update('maxPerWallet', event.target.value)} inputMode="decimal" />
                  </FormField>
                  <FormField label="价格曲线">
                    <SegmentedControl
                      value={form.priceCurve}
                      onChange={(value) => update('priceCurve', value)}
                      options={['固定价格', '阶梯涨价', '时间递增']}
                    />
                  </FormField>
                  <FormField label="毕业目标 BNB">
                    <input value={form.graduationTarget} onChange={(event) => update('graduationTarget', event.target.value)} inputMode="decimal" />
                  </FormField>
                </>
              ) : (
                <>
                  <FormField label="初始流动性 BNB">
                    <input value={form.initialLiquidity} onChange={(event) => update('initialLiquidity', event.target.value)} inputMode="decimal" />
                  </FormField>
                  <FormField label="首发价格">
                    <input value={form.launchPrice} onChange={(event) => update('launchPrice', event.target.value)} inputMode="decimal" />
                  </FormField>
                  <FormField label="团队分配 %">
                    <input value={form.teamAllocation} onChange={(event) => update('teamAllocation', event.target.value)} inputMode="decimal" />
                  </FormField>
                  <FormField label="开盘时间">
                    <input value={form.startTime} onChange={(event) => update('startTime', event.target.value)} placeholder="立即 / 2026-06-09 20:00" />
                  </FormField>
                </>
              )}
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
              <FormField label="燃烧比例 %">
                <input value={form.burnRate} onChange={(event) => update('burnRate', event.target.value)} inputMode="decimal" />
              </FormField>
              <FormField label="开始时间">
                <input value={form.startTime} onChange={(event) => update('startTime', event.target.value)} placeholder="立即 / 指定时间" />
              </FormField>
              <ToggleField
                checked={form.deadLiquidity}
                label="底池自动转 dead"
                text="初始 LP 或 Mint 累积底池按规则进入黑洞地址。"
                onChange={(value) => update('deadLiquidity', value)}
              />
              <ToggleField
                checked={form.renounceOwner}
                label="部署后放弃 Owner"
                text="合约所有权抛弃后，后续无人可随意改参数。"
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
                <p>请确认右侧预览、支付金额、黑洞底池和 Owner 规则。点击登上擂台后会拉起真实钱包。</p>
                {form.whitelist && (
                  <div className="whitelist-summary">
                    <LockKeyhole size={17} />
                    白名单已开启：{whitelistInfo.valid.length} 个有效地址
                    {whitelistInfo.invalid.length > 0 && `，${whitelistInfo.invalid.length} 个地址需修正`}
                  </div>
                )}
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
                <CreditCard size={16} />
                登上擂台
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
              <MiniMetric label="预计支付" value={`${formatBnb(launchAmount)} BNB`} />
              <MiniMetric label="Mint募集上限" value={`${formatBnb(mintRaise)} BNB`} />
              <MiniMetric label="黑洞地址" value={shortAddress(DEAD_ADDRESS)} />
              <MiniMetric label="买/卖税" value={`${form.buyTax}% / ${form.sellTax}%`} />
              <MiniMetric label="Owner" value={form.renounceOwner ? '部署后抛弃' : '项目方保留'} />
              <MiniMetric label="白名单" value={form.whitelist ? `${whitelistInfo.valid.length} 个地址` : '未开启'} />
            </div>
            <button className="secondary full" onClick={() => copyText(DEAD_ADDRESS, '黑洞地址')} type="button">
              <Copy size={16} />
              复制 dead 地址
            </button>
            {!wallet.address && (
              <button className="secondary full" onClick={connectWallet} type="button">
                <Wallet size={16} />
                连接真实钱包
              </button>
            )}
            <button className="primary full submit-btn" type="submit">
              <CreditCard size={16} />
              登上擂台
            </button>
          </Panel>

          <Panel title="链上输出" icon={CircleDollarSign}>
            {lastResult ? (
              <div className="result-box">
                <span>
                  <em>交易金额</em>
                  <b>{lastResult.amountBnb} BNB</b>
                </span>
                <span>
                  <em>交易哈希</em>
                  <b>{shortAddress(lastResult.txHash)}</b>
                </span>
                <span>
                  <em>接收合约</em>
                  <b>{shortAddress(lastResult.receiver)}</b>
                </span>
                <div className="result-actions">
                  <a className="secondary" href={txUrl(lastResult.txHash)} target="_blank" rel="noreferrer">
                    <ExternalLink size={15} />
                    BscScan交易
                  </a>
                  <a className="secondary" href={addressUrl(lastResult.receiver)} target="_blank" rel="noreferrer">
                    <ExternalLink size={15} />
                    链上入口
                  </a>
                  <a className="secondary muted-link" href={pancakeUrl('')} aria-disabled="true">
                    <ExternalLink size={15} />
                    Pancake待生成
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
        </aside>
      </form>
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

function ToggleField({ checked, label, text, onChange }) {
  return (
    <label className="toggle-field">
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
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

function CheckoutModal({ checkout, wallet, busy, confirm, cancel }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
        <div className="modal-icon">
          <CreditCard size={24} />
        </div>
        <h2 id="checkout-title">{checkout.title}</h2>
        <p>这次操作会调用真实钱包在 BSC 发起交易。请在钱包弹窗里核对金额、地址和网络。</p>
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
            <CreditCard size={16} />
            {busy ? '等待钱包确认...' : '确认并拉起钱包'}
          </button>
        </div>
      </section>
    </div>
  );
}

export default App;
