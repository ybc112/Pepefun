import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Coins,
  Copy,
  CreditCard,
  ExternalLink,
  FileCheck2,
  Gauge,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  Minus,
  Plus,
  RefreshCcw,
  Rocket,
  Search,
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

const STORAGE_KEY = 'pepe-moonlaunching-state-v2';
const APPLICATION_FEE_BNB = '0.01';
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

const seedProjects = [
  {
    id: 'PEPE-1042',
    name: 'Pepe Uppercut',
    symbol: 'PUNCH',
    mode: 'Mint',
    phase: 'live',
    owner: '0xA1F4B76a2C2a5F0d12f94B7d5C33aE6B6B5d9001',
    contract: '0x8b4b3d7fb9c66c4d28c8d721bb9d812987f2a112',
    pair: '0xd3f51d63120f8f59c91380af22516f01d5d3beef',
    vault: '0x7cA2Dbc18B37175Dc53E5e9F7a4c2f0A5f1a77a1',
    description:
      'Mint 首发保护项目，每份立即发币并同步加 LP，首发阶段产生的 LP 进入独立金库。',
    tags: ['审核精选', 'Mint 首发', 'LP 破发保护'],
    accent: '#d7ff56',
    startTime: '2026-06-09 11:21',
    openTime: '2026-06-09 11:51',
    endTime: '2026-06-10 11:51',
    minted: 640,
    mintTotal: 1000,
    mintPrice: '0.01',
    tokenPerMint: '420,690 PUNCH',
    lpTokenPerMint: '210,345 PUNCH',
    maxPerWallet: 5,
    whitelistMode: '白名单先抢',
    whitelistQuota: 250,
    whitelistMinted: 188,
    protection: {
      enabled: true,
      vaultLp: '18.42 LP',
      endTime: '2026-06-16 11:51',
      claimWindow: '72 小时',
    },
    taxes: {
      buy: '1',
      sell: '1',
      extraRoute: '额外高税自动回流',
      dividend: '默认 BNB 分红',
    },
  },
  {
    id: 'PEPE-2110',
    name: 'Dead Pool Frog',
    symbol: 'DPF',
    mode: 'Curve',
    phase: 'live',
    owner: '0x69c2b1e919c2296a5ad84f803a64a1225e2f0b2d',
    contract: '0x7f1a90923f336f2cb61269a9adbe46f81a3c7a73',
    pair: '0xb0b6f4f76a522fd6e6f3e53b5b0a15503f10dead',
    vault: '0x841f6eB52a5D6BbDfe70641989A0Ca91C7174110',
    description:
      '曲线池项目，项目方已完成第一笔首买，达到毕业目标后用剩余币和池内 BNB 自动加池。',
    tags: ['曲线池', '项目方首买', '5 BNB 毕业'],
    accent: '#8de9ff',
    startTime: '2026-06-09 11:31',
    openTime: '项目方首买后',
    endTime: '毕业后自动迁移',
    minted: 3.8,
    mintTotal: 5,
    mintPrice: '曲线定价',
    tokenPerMint: '按曲线',
    lpTokenPerMint: '毕业后加池',
    maxPerWallet: 0,
    whitelistMode: '不限白名单',
    whitelistQuota: 0,
    whitelistMinted: 0,
    protection: {
      enabled: false,
      vaultLp: '毕业后生成',
      endTime: '-',
      claimWindow: '-',
    },
    taxes: {
      buy: '2',
      sell: '2',
      extraRoute: '额外高税进营销钱包',
      dividend: '指定代币分红',
    },
  },
  {
    id: 'PEPE-3021',
    name: 'No VC Pepe',
    symbol: 'NOVC',
    mode: 'Fair',
    phase: 'preparing',
    owner: '0x5f90a0196adfb4fc951f41310b691117f08ddeed',
    contract: '审核通过，等待开盘部署',
    pair: '待创建',
    vault: '待创建',
    description:
      '公平开盘项目，项目方自助加池，到北京时间开盘点后开放全员交易。',
    tags: ['公平开盘', '无预留', '开盘白名单可选'],
    accent: '#f0c85b',
    startTime: '2026-06-09 11:51',
    openTime: '2026-06-10 11:51',
    endTime: '开盘后持续交易',
    minted: 0,
    mintTotal: 100,
    mintPrice: '项目方加池',
    tokenPerMint: '不开启 Mint',
    lpTokenPerMint: '项目方自助加池',
    maxPerWallet: 0,
    whitelistMode: '开盘前白名单可提前交易',
    whitelistQuota: 150,
    whitelistMinted: 0,
    protection: {
      enabled: false,
      vaultLp: '开盘后展示',
      endTime: '-',
      claimWindow: '-',
    },
    taxes: {
      buy: '0',
      sell: '0',
      extraRoute: '额外高税按正常比例',
      dividend: '默认 BNB 分红',
    },
  },
];

const navItems = [
  { key: 'home', label: '首页', icon: LayoutDashboard },
  { key: 'projects', label: '浏览项目', icon: Search },
  { key: 'apply', label: '发射申请', icon: Upload },
  { key: 'mine', label: '我的参与', icon: ListChecks },
];

const modeMeta = {
  Mint: { label: 'Mint 首发保护', icon: Coins },
  Curve: { label: '曲线池', icon: Gauge },
  Fair: { label: '公平开盘', icon: ShieldCheck },
};

const phaseMeta = {
  preparing: { label: '筹备中', tone: 'amber', icon: Timer },
  live: { label: '可参与', tone: 'green', icon: Rocket },
  completed: { label: '已完成', tone: 'cyan', icon: BadgeCheck },
};

const defaultApplyForm = {
  mode: 'Mint',
  name: '',
  symbol: '',
  owner: '',
  website: '',
  intro: '',
  totalSupply: '1000000000',
  mintTotal: '1000',
  tokenPerMint: '1000000',
  lpTokenPerMint: '500000',
  mintPrice: '0.01',
  maxPerWallet: '5',
  whitelistMode: 'Mint 不限白名单',
  whitelistQuota: '0',
  launchWhitelist: '不开启开盘白名单',
  graduationTarget: '5',
  fairLiquidity: '1',
  startTime: '',
  openTime: '',
  endTime: '',
  buyTax: '1',
  sellTax: '1',
  extraTaxRoute: '额外高税按正常比例',
  dividendMode: '默认 BNB 分红',
  teamInfo: '',
};

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

function loadState() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved?.version === 2) return saved;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  return {
    version: 2,
    projects: seedProjects,
    applications: [],
    records: {},
  };
}

function shortAddress(address) {
  if (!address) return '';
  if (!isAddress(address)) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || '').trim());
}

function normalizeAddress(value) {
  return isAddress(value) ? value.trim().toLowerCase() : '';
}

function formatNumber(value, options = {}) {
  return new Intl.NumberFormat('en-US', options).format(Number(value || 0));
}

function progressPercent(current, total) {
  if (!total) return 0;
  const raw = (Number(current) / Number(total)) * 100;
  if (raw > 0 && raw < 0.1) return 0.1;
  return Math.max(0, Math.min(100, Math.round(raw * 10) / 10));
}

function toWeiHex(amountBnb) {
  const [whole = '0', fraction = ''] = String(amountBnb || '0').split('.');
  const wei =
    BigInt(whole || '0') * 10n ** 18n +
    BigInt((fraction || '').padEnd(18, '0').slice(0, 18) || '0');
  return `0x${wei.toString(16)}`;
}

function bscscanUrl(address) {
  return isAddress(address) ? `https://bscscan.com/address/${address}` : '#';
}

function pancakeUrl(address) {
  return isAddress(address) ? `https://pancakeswap.finance/swap?chain=bsc&outputCurrency=${address}` : '#';
}

function recordFor(records, address) {
  const key = normalizeAddress(address);
  return records[key] || { applications: [], mints: [], payments: [] };
}

function projectFromApplication(app, index) {
  const mode = app.mode;
  const isMint = mode === 'Mint';
  const isCurve = mode === 'Curve';
  return {
    id: `PEPE-${String(5000 + index).padStart(4, '0')}`,
    name: app.name,
    symbol: app.symbol.toUpperCase(),
    mode,
    phase: isMint || isCurve ? 'preparing' : 'preparing',
    owner: app.owner,
    contract: FACTORY_CONTRACT ? '等待 Factory 部署' : '待配置 Factory',
    pair: '待创建',
    vault: '待创建',
    description: app.intro || '项目资料已提交，等待平台审核和链上部署。',
    tags: [
      modeMeta[mode].label,
      app.whitelistMode,
      app.launchWhitelist,
    ],
    accent: mode === 'Mint' ? '#d7ff56' : mode === 'Curve' ? '#8de9ff' : '#f0c85b',
    startTime: app.startTime || '待公布',
    openTime: app.openTime || '待公布',
    endTime: app.endTime || '待公布',
    minted: 0,
    mintTotal: isCurve ? Number(app.graduationTarget || 5) : Number(app.mintTotal || 1000),
    mintPrice: isMint ? app.mintPrice : isCurve ? '曲线定价' : '项目方加池',
    tokenPerMint: isMint ? `${formatNumber(app.tokenPerMint)} ${app.symbol.toUpperCase()}` : isCurve ? '按曲线' : '不开启 Mint',
    lpTokenPerMint: isMint ? `${formatNumber(app.lpTokenPerMint)} ${app.symbol.toUpperCase()}` : isCurve ? '毕业后加池' : '项目方自助加池',
    maxPerWallet: Number(app.maxPerWallet || 0),
    whitelistMode: app.whitelistMode,
    whitelistQuota: Number(app.whitelistQuota || 0),
    whitelistMinted: 0,
    protection: {
      enabled: isMint,
      vaultLp: isMint ? '部署后生成' : '-',
      endTime: isMint ? app.endTime || '待公布' : '-',
      claimWindow: isMint ? '72 小时' : '-',
    },
    taxes: {
      buy: app.buyTax,
      sell: app.sellTax,
      extraRoute: app.extraTaxRoute,
      dividend: app.dividendMode,
    },
    applicant: app.applicant,
  };
}

function App() {
  const [state, setState] = useState(loadState);
  const [page, setPage] = useState('home');
  const [wallet, setWallet] = useState({ address: '', chainId: '', providerName: '' });
  const [query, setQuery] = useState('');
  const [modeFilter, setModeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProjectId, setSelectedProjectId] = useState(seedProjects[0].id);
  const [applyForm, setApplyForm] = useState(defaultApplyForm);
  const [checkout, setCheckout] = useState(null);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [mintQty, setMintQty] = useState(1);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

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

  const selectedProject = useMemo(
    () => state.projects.find((project) => project.id === selectedProjectId) || state.projects[0],
    [selectedProjectId, state.projects],
  );

  const record = recordFor(state.records, wallet.address);

  const filteredProjects = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return state.projects.filter((project) => {
      const matchesMode = modeFilter === 'all' || project.mode === modeFilter;
      const matchesStatus = statusFilter === 'all' || project.phase === statusFilter;
      const matchesQuery =
        !needle ||
        project.name.toLowerCase().includes(needle) ||
        project.symbol.toLowerCase().includes(needle) ||
        project.id.toLowerCase().includes(needle);
      return matchesMode && matchesStatus && matchesQuery;
    });
  }, [modeFilter, query, state.projects, statusFilter]);

  const stats = useMemo(() => {
    const live = state.projects.filter((project) => project.phase === 'live').length;
    const protectedProjects = state.projects.filter((project) => project.protection.enabled).length;
    const totalMint = state.projects.reduce((sum, project) => sum + Number(project.mintTotal || 0), 0);
    const minted = state.projects.reduce((sum, project) => sum + Number(project.minted || 0), 0);
    return {
      projects: state.projects.length,
      live,
      protectedProjects,
      progress: progressPercent(minted, totalMint),
      applications: state.applications.length,
    };
  }, [state.applications.length, state.projects]);

  function notify(message) {
    setToast(message);
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
    setWallet({ address, chainId, providerName: detectProviderName(provider) });
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

  async function requestPayment(amountBnb, note) {
    const { provider, address } = await ensureWallet();
    const receiver = PAYMENT_RECEIVER || FACTORY_CONTRACT;
    if (!isAddress(receiver)) {
      throw new Error('链上收款地址尚未接入，请稍后再发起交易。');
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
    return { txHash, from: address, note };
  }

  function openProject(projectId) {
    setSelectedProjectId(projectId);
    setMintQty(1);
    setPage('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openApplicationCheckout(event) {
    event.preventDefault();
    const payload = {
      ...applyForm,
      id: `APP-${Date.now().toString().slice(-6)}`,
      symbol: applyForm.symbol.trim().toUpperCase(),
      owner: applyForm.owner.trim() || wallet.address,
      submittedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    };
    if (!payload.name.trim()) return notify('请填写代币名称');
    if (!payload.symbol.trim()) return notify('请填写代币符号');
    if (!isAddress(payload.owner)) return notify('请填写真实项目归属钱包地址，或先连接钱包');
    if (payload.mode === 'Mint' && Number(payload.mintTotal) <= 0) return notify('Mint 总份数必须大于 0');
    if (payload.mode === 'Mint' && Number(payload.mintPrice) <= 0) return notify('每份支付 BNB 必须大于 0');
    setCheckout({
      type: 'application',
      title: `提交 ${payload.symbol} ${modeMeta[payload.mode].label}申请`,
      amountBnb: APPLICATION_FEE_BNB,
      application: payload,
      summary: [
        ['模式', modeMeta[payload.mode].label],
        ['项目', `${payload.name} (${payload.symbol})`],
        ['白名单', payload.whitelistMode],
        ['审核费去向', '平台审核合约'],
      ],
    });
  }

  function openMintCheckout(project) {
    const quantity = Math.max(1, mintQty);
    const numericPrice = Number(project.mintPrice);
    const amount = Number.isFinite(numericPrice) ? (numericPrice * quantity).toFixed(4) : '0';
    setCheckout({
      type: 'mint',
      title: `Mint ${quantity} 份 ${project.symbol}`,
      amountBnb: amount,
      projectId: project.id,
      quantity,
      summary: [
        ['项目', `${project.name} (${project.symbol})`],
        ['每份代币', project.tokenPerMint],
        ['每份加池', project.lpTokenPerMint],
        ['LP 金库', shortAddress(project.vault)],
      ],
    });
  }

  async function confirmCheckout() {
    if (!checkout || busy) return;
    setBusy(true);
    try {
      const { txHash, from } = await requestPayment(checkout.amountBnb, checkout.type);
      const payment = {
        type: checkout.type,
        target: checkout.projectId || checkout.application?.id,
        amountBnb: checkout.amountBnb,
        txHash,
        createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      };
      const key = normalizeAddress(from);

      if (checkout.type === 'application') {
        const application = {
          ...checkout.application,
          applicant: from,
          status: 'pending',
          paymentHash: txHash,
        };
        setState((current) => {
          const walletRecord = current.records[key] || { applications: [], mints: [], payments: [] };
          return {
            ...current,
            applications: [application, ...current.applications],
            records: {
              ...current.records,
              [key]: {
                ...walletRecord,
                applications: [application.id, ...(walletRecord.applications || [])],
                payments: [payment, ...(walletRecord.payments || [])],
              },
            },
          };
        });
        setApplyForm(defaultApplyForm);
        notify('申请费已发起真实链上支付，申请进入待审核。');
      }

      if (checkout.type === 'mint') {
        setState((current) => {
          const walletRecord = current.records[key] || { applications: [], mints: [], payments: [] };
          return {
            ...current,
            projects: current.projects.map((project) => {
              if (project.id !== checkout.projectId) return project;
              const minted = Math.min(Number(project.mintTotal), Number(project.minted) + checkout.quantity);
              return {
                ...project,
                minted,
                phase: minted >= Number(project.mintTotal) ? 'completed' : project.phase,
              };
            }),
            records: {
              ...current.records,
              [key]: {
                ...walletRecord,
                mints: [
                  {
                    projectId: checkout.projectId,
                    quantity: checkout.quantity,
                    txHash,
                    createdAt: payment.createdAt,
                  },
                  ...(walletRecord.mints || []),
                ],
                payments: [payment, ...(walletRecord.payments || [])],
              },
            },
          };
        });
        notify('Mint 交易已发出，记录已同步到当前钱包。');
      }

      setCheckout(null);
    } catch (error) {
      notify(error.message || '交易失败');
    } finally {
      setBusy(false);
    }
  }

  function approveApplication(appId) {
    setState((current) => {
      const app = current.applications.find((item) => item.id === appId);
      if (!app) return current;
      return {
        ...current,
        applications: current.applications.map((item) =>
          item.id === appId ? { ...item, status: 'approved', reviewedAt: new Date().toLocaleString('zh-CN', { hour12: false }) } : item,
        ),
        projects: [projectFromApplication(app, current.projects.length + 1), ...current.projects],
      };
    });
    notify('审核通过，项目已加入大厅。');
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      notify('已复制');
    } catch {
      notify('复制失败，请手动复制');
    }
  }

  return (
    <div className="app">
      <div className="bg-layer" aria-hidden="true" />
      <Header page={page} setPage={setPage} wallet={wallet} connectWallet={connectWallet} />
      <main className="shell">
        {page === 'home' && <HomePage stats={stats} projects={state.projects.slice(0, 3)} setPage={setPage} openProject={openProject} />}
        {page === 'projects' && (
          <ProjectsPage
            projects={filteredProjects}
            allProjects={state.projects}
            query={query}
            setQuery={setQuery}
            modeFilter={modeFilter}
            setModeFilter={setModeFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            openProject={openProject}
          />
        )}
        {page === 'detail' && selectedProject && (
          <ProjectDetail
            project={selectedProject}
            wallet={wallet}
            connectWallet={connectWallet}
            mintQty={mintQty}
            setMintQty={setMintQty}
            openMintCheckout={openMintCheckout}
            copyText={copyText}
            back={() => setPage('projects')}
          />
        )}
        {page === 'apply' && (
          <ApplyPage
            form={applyForm}
            setForm={setApplyForm}
            submit={openApplicationCheckout}
            wallet={wallet}
            connectWallet={connectWallet}
            applications={state.applications}
            approveApplication={approveApplication}
          />
        )}
        {page === 'mine' && (
          <MinePage wallet={wallet} connectWallet={connectWallet} record={record} projects={state.projects} applications={state.applications} />
        )}
      </main>
      {checkout && (
        <CheckoutModal checkout={checkout} busy={busy} wallet={wallet} confirm={confirmCheckout} cancel={() => setCheckout(null)} />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function detectProviderName(provider) {
  if (provider?.isTokenPocket) return 'TokenPocket';
  if (provider?.isOkxWallet || provider?.isOKExWallet) return 'OKX Wallet';
  if (provider?.isMetaMask) return 'MetaMask';
  if (provider?.isTrust) return 'Trust Wallet';
  return 'Wallet';
}

function Header({ page, setPage, wallet, connectWallet }) {
  return (
    <header className="topbar">
      <button className="brand" onClick={() => setPage('home')} type="button" aria-label="返回首页">
        <span className="brand-mark">
          <FrogMark compact />
        </span>
        <span>
          <b>PEPE发射擂台</b>
          <small>BSC版精选发射台</small>
        </span>
      </button>
      <nav className="nav" aria-label="主导航">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.key} className={page === item.key ? 'active' : ''} onClick={() => setPage(item.key)} type="button">
              <Icon size={17} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <button className="wallet-btn" onClick={connectWallet} type="button">
        <Wallet size={20} />
        <span>{wallet.address ? shortAddress(wallet.address) : '连接钱包'}</span>
      </button>
    </header>
  );
}

function HomePage({ stats, projects, setPage, openProject }) {
  return (
    <>
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">BSC Meme Launch Arena</span>
          <h1>一键点火，登台开盘把 meme 送上第一轨道</h1>
          <p>
            PEPE发射擂台采用审核制精选上架，支持 Mint 首发保护、曲线池和公平开盘。
            项目币、LP 金库、税率、回流去向和关键状态全部公开展示。
          </p>
          <div className="hero-actions">
            <button className="primary big" onClick={() => setPage('projects')} type="button">
              <Search size={19} />
              进入项目大厅
            </button>
            <button className="secondary big" onClick={() => setPage('apply')} type="button">
              <Upload size={19} />
              提交发射申请
            </button>
          </div>
          <div className="trust-line">
            <span>审核制上架</span>
            <span>独立项目币合约</span>
            <span>Mint 首发 LP 保护</span>
            <span>曲线池防抢跑</span>
            <span>税控公开可放弃</span>
          </div>
        </div>
        <div className="arena-console" aria-label="平台机制">
          <FrogMascot />
          <RuleLine icon={FileCheck2} step="01" title="审核精选" text="团队/资方项目优先发射" />
          <RuleLine icon={LockKeyhole} step="02" title="破发保护" text="首发 LP 锁入金库守住底线" />
          <RuleLine icon={Gauge} step="03" title="公开进度" text="Mint / 曲线 / 毕业可追踪" />
          <button className="primary full" onClick={() => setPage('apply')} type="button">
            申请点火
            <ChevronRight size={18} />
          </button>
        </div>
      </section>

      <section className="metric-strip">
        <MetricCard icon={Rocket} label="已上架" value={stats.projects} />
        <MetricCard icon={ShieldCheck} label="首发保护" value={stats.protectedProjects} />
        <MetricCard icon={Coins} label="可参与" value={stats.live} />
        <MetricCard icon={Gauge} label="整体进度" value={`${stats.progress}%`} />
      </section>

      <section className="flow-band">
        <FlowStep icon={FileCheck2} step="01" title="审核制精选上架" text="申请需要平台审核，不做无门槛泛滥上币。" />
        <FlowStep icon={LockKeyhole} step="02" title="Mint 首发 LP 保护" text="首发形成的 LP 进入独立金库，保护真正参与首发的人。" />
        <FlowStep icon={Settings} step="03" title="LP 与税控公开" text="LP 金库、税率、销毁停止线和回流去向在详情页展示。" />
      </section>

      <section className="section-head">
        <div>
          <span className="eyebrow">Project Hall</span>
          <h2>精选发射项目</h2>
        </div>
        <button className="secondary" onClick={() => setPage('projects')} type="button">
          查看全部
          <ChevronRight size={18} />
        </button>
      </section>
      <div className="token-grid">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} openProject={openProject} />
        ))}
      </div>
    </>
  );
}

function ProjectsPage({ projects, allProjects, query, setQuery, modeFilter, setModeFilter, statusFilter, setStatusFilter, openProject }) {
  return (
    <>
      <section className="page-head">
        <div>
          <span className="eyebrow">Project Hall</span>
          <h1>浏览项目</h1>
          <p>按状态和模式筛选项目，查看 Mint 进度、曲线毕业、LP 金库和开盘规则。</p>
        </div>
        <button className="secondary" type="button">
          <RefreshCcw size={18} />
          刷新
        </button>
      </section>
      <div className="filter-panel">
        <div className="search-box">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索项目名 / 符号 / ID" />
        </div>
        <div className="filter-row">
          <span>
            <Timer size={17} />
            状态
          </span>
          {[
            ['all', '全部'],
            ['preparing', '筹备中'],
            ['live', '可参与'],
            ['completed', '已完成'],
          ].map(([key, label]) => (
            <button key={key} className={statusFilter === key ? 'active' : ''} onClick={() => setStatusFilter(key)} type="button">
              {label}
            </button>
          ))}
        </div>
        <div className="filter-row">
          <span>
            <SlidersHorizontal size={17} />
            模式
          </span>
          {['all', 'Mint', 'Curve', 'Fair'].map((mode) => (
            <button key={mode} className={modeFilter === mode ? 'active' : ''} onClick={() => setModeFilter(mode)} type="button">
              {mode === 'all' ? '全部' : modeMeta[mode].label}
            </button>
          ))}
        </div>
      </div>
      <div className="result-line">
        <span>{formatNumber(projects.length)} 个结果</span>
        <span>总项目 {formatNumber(allProjects.length)}</span>
      </div>
      <div className="token-grid">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} openProject={openProject} />
        ))}
      </div>
      {!projects.length && (
        <div className="empty-state">
          <Search size={28} />
          <b>没有匹配项目</b>
          <p>换一个筛选条件。</p>
        </div>
      )}
    </>
  );
}

function ProjectCard({ project, openProject }) {
  const phase = phaseMeta[project.phase] || phaseMeta.preparing;
  const PhaseIcon = phase.icon;
  const percent = progressPercent(project.minted, project.mintTotal);
  return (
    <article className="token-card" style={{ '--accent': project.accent }}>
      <div className="token-top">
        <TokenAvatar project={project} />
        <div>
          <span className={`status-pill ${phase.tone}`}>
            <PhaseIcon size={14} />
            {phase.label}
          </span>
          <h3>
            {project.name} <em>{project.symbol}</em>
          </h3>
        </div>
      </div>
      <p>{project.description}</p>
      <div className="tag-row">
        {project.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <ProgressBar value={percent} label={project.mode === 'Curve' ? '毕业进度' : 'Mint / 开盘进度'} detail={`${percent}%`} />
      <div className="card-metrics">
        <MiniMetric label="模式" value={modeMeta[project.mode].label} />
        <MiniMetric label="单价" value={project.mode === 'Mint' ? `${project.mintPrice} BNB` : project.mintPrice} />
      </div>
      <button className="card-link" onClick={() => openProject(project.id)} type="button">
        查看详情
        <ChevronRight size={17} />
      </button>
    </article>
  );
}

function ProjectDetail({ project, wallet, connectWallet, mintQty, setMintQty, openMintCheckout, copyText, back }) {
  const phase = phaseMeta[project.phase] || phaseMeta.preparing;
  const PhaseIcon = phase.icon;
  const percent = progressPercent(project.minted, project.mintTotal);
  const maxQty = Math.max(1, Math.min(10, Number(project.mintTotal) - Number(project.minted)));
  const canMint = project.mode === 'Mint' && project.phase === 'live' && Number(project.minted) < Number(project.mintTotal);
  return (
    <>
      <section className="page-head">
        <div>
          <button className="secondary" onClick={back} type="button">
            返回
          </button>
          <span className={`status-pill ${phase.tone}`}>
            <PhaseIcon size={14} />
            {phase.label}
          </span>
          <h1>
            {project.name} <em>{project.symbol}</em>
          </h1>
          <p>{project.description}</p>
          <div className="hero-actions">
            <button className="secondary" onClick={() => copyText(project.contract)} type="button">
              <Copy size={18} />
              复制合约
            </button>
            <a className="secondary" href={bscscanUrl(project.contract)} rel="noreferrer" target="_blank">
              <ExternalLink size={18} />
              BscScan
            </a>
            <a className="secondary" href={pancakeUrl(project.contract)} rel="noreferrer" target="_blank">
              <ExternalLink size={18} />
              Pancake
            </a>
          </div>
        </div>
        <div className="arena-console">
          <MiniMetric label="模式" value={modeMeta[project.mode].label} />
          <MiniMetric label="进度" value={`${percent}%`} />
          <MiniMetric label="LP 金库" value={shortAddress(project.vault)} />
        </div>
      </section>

      <div className="detail-grid">
        <Panel title="项目公开信息" icon={ShieldCheck}>
          <div className="detail-metrics">
            <MiniMetric label="项目方" value={shortAddress(project.owner)} />
            <MiniMetric label="合约" value={shortAddress(project.contract)} />
            <MiniMetric label="交易对" value={shortAddress(project.pair)} />
            <MiniMetric label="开盘时间" value={project.openTime} />
          </div>
        </Panel>
        <Panel title="税控与回流" icon={Settings}>
          <div className="detail-metrics">
            <MiniMetric label="买税" value={`${project.taxes.buy}%`} />
            <MiniMetric label="卖税" value={`${project.taxes.sell}%`} />
            <MiniMetric label="高税去向" value={project.taxes.extraRoute} />
            <MiniMetric label="分红" value={project.taxes.dividend} />
          </div>
        </Panel>
        <Panel title="LP 破发保护" icon={LockKeyhole}>
          <div className="detail-metrics">
            <MiniMetric label="状态" value={project.protection.enabled ? '已开启' : '未开启'} />
            <MiniMetric label="金库 LP" value={project.protection.vaultLp} />
            <MiniMetric label="保护结束" value={project.protection.endTime} />
            <MiniMetric label="领取窗口" value={project.protection.claimWindow} />
          </div>
        </Panel>
      </div>

      <div className="work-grid">
        <Panel title="Mint / 毕业进度" icon={Gauge} tone="strong">
          <ProgressBar
            value={percent}
            label={`${formatNumber(project.minted)} / ${formatNumber(project.mintTotal)}`}
            detail={`${percent}%`}
          />
          <div className="detail-metrics">
            <MiniMetric label="每份获得" value={project.tokenPerMint} />
            <MiniMetric label="每份加池" value={project.lpTokenPerMint} />
            <MiniMetric label="每钱包上限" value={project.maxPerWallet || '-'} />
            <MiniMetric label="白名单" value={project.whitelistMode} />
          </div>
        </Panel>
        <Panel title="参与 Mint" icon={Coins} tone="strong">
          <div className="mint-box">
            <div className="stepper" aria-label="Mint 数量">
              <button onClick={() => setMintQty(Math.max(1, mintQty - 1))} type="button">
                <Minus size={16} />
              </button>
              <strong>{mintQty}</strong>
              <button onClick={() => setMintQty(Math.min(maxQty, mintQty + 1))} type="button">
                <Plus size={16} />
              </button>
            </div>
            <div>
              <span>预计支付</span>
              <b>{Number.isFinite(Number(project.mintPrice)) ? `${(Number(project.mintPrice) * mintQty).toFixed(4)} BNB` : project.mintPrice}</b>
            </div>
          </div>
          {!wallet.address && (
            <button className="secondary full" onClick={connectWallet} type="button">
              <Wallet size={18} />
              连接真实钱包
            </button>
          )}
          <button className="primary full" disabled={!canMint} onClick={() => openMintCheckout(project)} type="button">
            <CreditCard size={18} />
            {canMint ? '提交 Mint 交易' : '当前不可 Mint'}
          </button>
        </Panel>
      </div>
    </>
  );
}

function ApplyPage({ form, setForm, submit, wallet, connectWallet, applications, approveApplication }) {
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  return (
    <>
      <section className="page-head">
        <div>
          <span className="eyebrow">Launch Application</span>
          <h1>发射申请</h1>
          <p>采用审核制上架。请提交真实项目资料、团队/资方背景、开盘节奏、代币分配和公开规则。</p>
        </div>
        <button className="primary" onClick={connectWallet} type="button">
          <Wallet size={18} />
          {wallet.address ? shortAddress(wallet.address) : '连接钱包'}
        </button>
      </section>
      <form className="launch-layout" onSubmit={submit}>
        <section className="launch-main">
          <div className="mode-switch">
            {['Mint', 'Curve', 'Fair'].map((mode) => {
              const Icon = modeMeta[mode].icon;
              return (
                <button key={mode} className={form.mode === mode ? 'active' : ''} onClick={() => update('mode', mode)} type="button">
                  <Icon size={18} />
                  <span>
                    <b>{modeMeta[mode].label}</b>
                    <em>{mode === 'Mint' ? '固定份数，首发 LP 保护' : mode === 'Curve' ? '项目方首买，曲线毕业' : '项目方加池，到点开盘'}</em>
                  </span>
                </button>
              );
            })}
          </div>
          <Fieldset title="基础信息">
            <FormField label="代币名称">
              <input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="例如 Pepe Uppercut" />
            </FormField>
            <FormField label="代币符号">
              <input value={form.symbol} onChange={(event) => update('symbol', event.target.value)} placeholder="例如 PUNCH" />
            </FormField>
            <FormField label="项目归属钱包">
              <input value={form.owner} onChange={(event) => update('owner', event.target.value)} placeholder={wallet.address || '0x...'} />
            </FormField>
            <FormField label="官网 / 社群">
              <input value={form.website} onChange={(event) => update('website', event.target.value)} placeholder="https://..." />
            </FormField>
            <FormField label="项目说明" wide>
              <textarea value={form.intro} onChange={(event) => update('intro', event.target.value)} placeholder="玩法、运营计划、风险说明" />
            </FormField>
            <FormField label="团队/资方背景" wide>
              <textarea value={form.teamInfo} onChange={(event) => update('teamInfo', event.target.value)} placeholder="审核需要的真实背景资料" />
            </FormField>
          </Fieldset>
          <Fieldset title={form.mode === 'Mint' ? 'Mint 与保护' : form.mode === 'Curve' ? '曲线池参数' : '公平开盘参数'}>
            <FormField label="代币总数量">
              <input value={form.totalSupply} onChange={(event) => update('totalSupply', event.target.value)} />
            </FormField>
            {form.mode === 'Mint' && (
              <>
                <FormField label="Mint 总份数">
                  <input value={form.mintTotal} onChange={(event) => update('mintTotal', event.target.value)} />
                </FormField>
                <FormField label="每份获得代币">
                  <input value={form.tokenPerMint} onChange={(event) => update('tokenPerMint', event.target.value)} />
                </FormField>
                <FormField label="每份加池代币">
                  <input value={form.lpTokenPerMint} onChange={(event) => update('lpTokenPerMint', event.target.value)} />
                </FormField>
                <FormField label="每份支付 BNB">
                  <input value={form.mintPrice} onChange={(event) => update('mintPrice', event.target.value)} />
                </FormField>
                <FormField label="每钱包最多 Mint">
                  <input value={form.maxPerWallet} onChange={(event) => update('maxPerWallet', event.target.value)} />
                </FormField>
              </>
            )}
            {form.mode === 'Curve' && (
              <FormField label="毕业目标 BNB">
                <input value={form.graduationTarget} onChange={(event) => update('graduationTarget', event.target.value)} />
              </FormField>
            )}
            {form.mode === 'Fair' && (
              <FormField label="初始加池 BNB">
                <input value={form.fairLiquidity} onChange={(event) => update('fairLiquidity', event.target.value)} />
              </FormField>
            )}
            <FormField label="开始时间">
              <input value={form.startTime} onChange={(event) => update('startTime', event.target.value)} placeholder="2026-06-09 11:21" />
            </FormField>
            <FormField label="开盘时间">
              <input value={form.openTime} onChange={(event) => update('openTime', event.target.value)} placeholder="2026-06-09 11:51" />
            </FormField>
          </Fieldset>
          <Fieldset title="白名单与税控">
            <FormField label="Mint 白名单">
              <SegmentedControl
                value={form.whitelistMode}
                onChange={(value) => update('whitelistMode', value)}
                options={['Mint 不限白名单', 'Mint 白名单先抢']}
              />
            </FormField>
            <FormField label="白名单专属份数">
              <input value={form.whitelistQuota} onChange={(event) => update('whitelistQuota', event.target.value)} />
            </FormField>
            <FormField label="开盘白名单">
              <SegmentedControl
                value={form.launchWhitelist}
                onChange={(value) => update('launchWhitelist', value)}
                options={['不开启开盘白名单', '开盘前白名单可提前交易']}
              />
            </FormField>
            <FormField label="额外高税去向">
              <SegmentedControl
                value={form.extraTaxRoute}
                onChange={(value) => update('extraTaxRoute', value)}
                options={['额外高税按正常比例', '额外高税进营销钱包', '额外高税进分红池', '额外高税直接销毁', '额外高税自动回流']}
              />
            </FormField>
            <FormField label="买税 %">
              <input value={form.buyTax} onChange={(event) => update('buyTax', event.target.value)} />
            </FormField>
            <FormField label="卖税 %">
              <input value={form.sellTax} onChange={(event) => update('sellTax', event.target.value)} />
            </FormField>
            <FormField label="分红模式">
              <SegmentedControl
                value={form.dividendMode}
                onChange={(value) => update('dividendMode', value)}
                options={['默认 BNB 分红', '指定代币分红']}
              />
            </FormField>
          </Fieldset>
        </section>
        <aside className="launch-summary">
          <Panel title="提交审核" icon={CircleDollarSign}>
            <div className="receipt">
              <span>
                <em>发射模式</em>
                <b>{modeMeta[form.mode].label}</b>
              </span>
              <span>
                <em>审核费</em>
                <b>{APPLICATION_FEE_BNB} BNB</b>
              </span>
              <span>
                <em>真实钱包</em>
                <b>{wallet.address ? shortAddress(wallet.address) : '未连接'}</b>
              </span>
            </div>
            <button className="primary full submit-btn" type="submit">
              <CreditCard size={18} />
              提交{modeMeta[form.mode].label}申请，支付 {APPLICATION_FEE_BNB} BNB
            </button>
          </Panel>
          <Panel title="审核队列" icon={FileCheck2}>
            {applications.length ? (
              <div className="record-list">
                {applications.slice(0, 5).map((app) => (
                  <span key={app.id}>
                    <b>{app.symbol}</b>
                    <em>{app.status === 'pending' ? '待审核' : '已上架'}</em>
                    {app.status === 'pending' && (
                      <button className="secondary" onClick={() => approveApplication(app.id)} type="button">
                        通过
                      </button>
                    )}
                  </span>
                ))}
              </div>
            ) : (
              <EmptyInline icon={FileCheck2} title="暂无申请" text="提交后会显示在这里。" />
            )}
          </Panel>
        </aside>
      </form>
    </>
  );
}

function MinePage({ wallet, connectWallet, record, projects, applications }) {
  const myApps = applications.filter((app) => record.applications?.includes(app.id) || normalizeAddress(app.applicant) === normalizeAddress(wallet.address));
  const mintMap = (record.mints || []).reduce((acc, item) => {
    acc[item.projectId] = (acc[item.projectId] || 0) + Number(item.quantity || 0);
    return acc;
  }, {});
  return (
    <>
      <section className="page-head">
        <div>
          <span className="eyebrow">My Mission Control</span>
          <h1>我的参与</h1>
          <p>连接真实钱包后查看你参与过的项目、提交过的申请和链上支付记录。</p>
        </div>
        <button className="primary" onClick={connectWallet} type="button">
          <Wallet size={18} />
          {wallet.address ? shortAddress(wallet.address) : '连接钱包'}
        </button>
      </section>
      <div className="mine-grid">
        <Panel title="我参与的代币" icon={Coins}>
          {Object.keys(mintMap).length ? (
            <div className="record-list">
              {Object.entries(mintMap).map(([projectId, quantity]) => {
                const project = projects.find((item) => item.id === projectId);
                return (
                  <span key={projectId}>
                    <b>{project?.symbol || projectId}</b>
                    <em>{quantity} 份</em>
                  </span>
                );
              })}
            </div>
          ) : (
            <EmptyInline icon={Coins} title="暂无参与记录" text="完成 Mint 后会显示在这里。" />
          )}
        </Panel>
        <Panel title="我申请 / 归属的代币" icon={FileCheck2}>
          {myApps.length ? (
            <div className="record-list">
              {myApps.map((app) => (
                <span key={app.id}>
                  <b>
                    {app.name} / {app.symbol}
                  </b>
                  <em>{app.status === 'pending' ? '待审核' : '已上架'}</em>
                </span>
              ))}
            </div>
          ) : (
            <EmptyInline icon={FileCheck2} title="暂无申请" text="提交发射申请后会显示状态。" />
          )}
        </Panel>
        <Panel title="链上支付记录" icon={CreditCard}>
          {record.payments?.length ? (
            <div className="payment-table">
              {record.payments.map((payment, index) => (
                <div key={`${payment.txHash}-${index}`}>
                  <span>{payment.type}</span>
                  <b>{payment.amountBnb} BNB</b>
                  <em>{payment.createdAt}</em>
                  <small>{shortAddress(payment.txHash)}</small>
                </div>
              ))}
            </div>
          ) : (
            <EmptyInline icon={CreditCard} title="暂无支付记录" text="真实交易发出后会记录在这里。" />
          )}
        </Panel>
      </div>
    </>
  );
}

function CheckoutModal({ checkout, busy, wallet, confirm, cancel }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
        <div className="modal-icon">
          <CreditCard size={26} />
        </div>
        <h2 id="checkout-title">{checkout.title}</h2>
        <p>这次操作会调用真实钱包发起 BSC 交易。请在钱包弹窗里核对金额、收款地址和网络。</p>
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
          <button className="secondary" onClick={cancel} disabled={busy} type="button">
            取消
          </button>
          <button className="primary" onClick={confirm} disabled={busy} type="button">
            <CreditCard size={18} />
            {busy ? '等待钱包确认...' : '确认并拉起钱包'}
          </button>
        </div>
      </section>
    </div>
  );
}

function TokenAvatar({ project }) {
  return (
    <span className="token-avatar frog-token" style={{ '--frog-accent': project.accent }}>
      <span className="frog-eye left" />
      <span className="frog-eye right" />
      <span className="frog-mouth" />
      <b>{project.symbol.slice(0, 3)}</b>
    </span>
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

function FrogMascot() {
  return (
    <div className="frog-mascot" aria-label="青蛙发射擂台">
      <FrogMark />
      <div>
        <b>PEPE RING</b>
        <span>青蛙元素发射台</span>
      </div>
    </div>
  );
}

function RuleLine({ icon: Icon, step, title, text }) {
  return (
    <span className="rule-line">
      <Icon size={18} />
      <b>
        {step} {title}
      </b>
      <em>{text}</em>
    </span>
  );
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <article className="metric-card">
      <Icon size={22} />
      <span>{label}</span>
      <b>{value}</b>
    </article>
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

function ProgressBar({ value, label, detail }) {
  return (
    <div className="progress-wrap">
      <div className="progress-head">
        <span>{label}</span>
        <strong>{detail}</strong>
      </div>
      <div className="progress-bar" aria-label={label}>
        <i style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, children, tone = '' }) {
  return (
    <section className={`panel ${tone}`}>
      <div className="panel-title">
        <Icon size={19} />
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function FlowStep({ icon: Icon, step, title, text }) {
  return (
    <article className="flow-step">
      <span>{step}</span>
      <Icon size={21} />
      <b>{title}</b>
      <p>{text}</p>
    </article>
  );
}

function Fieldset({ title, children }) {
  return (
    <fieldset>
      <legend>{title}</legend>
      {children}
    </fieldset>
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
        <button key={option} className={value === option ? 'active' : ''} onClick={() => onChange(option)} type="button">
          {option}
        </button>
      ))}
    </div>
  );
}

function EmptyInline({ icon: Icon, title, text }) {
  return (
    <div className="empty-inline">
      <Icon size={24} />
      <b>{title}</b>
      <p>{text}</p>
    </div>
  );
}

export default App;
