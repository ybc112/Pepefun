# PEPE发射擂台 · BSC版

BSC 版公平 Meme 发射工具前端，使用 Vite + React 构建。页面聚焦 PEPE 青蛙擂台视觉、直接发币、自由 Mint、黑洞底池和真实钱包交易。

## 自助发币工厂

仓库已加入 `contracts/PepeLaunchFactory.sol` 作为第一版发币工厂草案：

- `createFixedSupplyToken`: 创建固定总量 BEP20
- `createFairMintLaunch`: 创建 BEP20 + 公平 Mint 池
- 支持白名单、公开 Mint、单钱包上限、单次上限
- 直接发币支持创建 PancakeSwap 初始池子，LP 直接打入 `0x...dEaD`
- 新币合约不保留 Owner，Mint 池支持创建后立即丢权限
- 前端已加入“自助发币工厂”方案面板，并能在配置 `VITE_FACTORY_CONTRACT` 后打包真实创建交易

上线真实“别人自己发新币”前，还需要先审计并部署 Factory 合约。部署构造参数需要 `feeReceiver`、`creationFee` 和 PancakeSwap V2 Router：`0x10ED43C718714eb63d5aA57B78B54704E256024E`。

## 本地运行

```bash
npm install
npm run dev
```

## Cloudflare Pages

仓库连接到 Cloudflare Pages 后使用以下配置：

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js version: `20`

也可以本地登录 Cloudflare 后直接部署：

```bash
npm run deploy:cloudflare
```

## 环境变量

真实链上支付入口由部署环境配置：

```env
VITE_PAYMENT_RECEIVER=
VITE_FACTORY_CONTRACT=
VITE_MINT_CONTRACT=
VITE_TOKEN_CONTRACT=
```
