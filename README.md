# PEPE发射擂台 · BSC版

BSC 版公平 Meme 发射工具前端，使用 Vite + React 构建。页面聚焦 PEPE 青蛙擂台视觉、直接发币、自由 Mint、黑洞底池和真实钱包交易。

## 自助发币工厂

仓库已加入 `contracts/PepeLaunchFactory.sol` 作为 BSC 发币工厂：

- `createFixedSupplyToken`: 创建固定总量 BEP20
- `createDividendToken`: 创建持币分红平台币模板，买卖税最高 10%，手续费换成平台币后由持币人主动领取
- 现有 Mint 合约仍可在前端 Mint 面板使用，V2 工厂前端路径专注直接发币和分红模板
- 直接发币支持创建 PancakeSwap 初始池子，LP 直接打入 `0x...dEaD`
- 新币支持创建后立即丢权限
- 前端已加入“自助发币工厂”方案面板，默认调用已部署 Factory，也可用 `VITE_FACTORY_CONTRACT` 覆盖

部署构造参数需要 `feeReceiver`、`creationFee`、PancakeSwap V2 Router 和默认分红平台币地址。

当前 Hardhat 部署脚本默认收 mint/创建费地址为：`0xF007f8Dd9037e9DD56B2953D8dA60cBc4B7FA939`。

当前前端默认 Factory V2 地址为：`0x7aD123deaf587cF6763Ef6043A453a0D5b852F8d`。

Factory V2 已在 BscScan 开源验证：`https://bscscan.com/address/0x7aD123deaf587cF6763Ef6043A453a0D5b852F8d#code`。

默认分红平台币地址为：`0xb3b2afb0de33d4d80a20839662bc99c6b360eeee`。

当前 Factory 创建费为：`0.05 BNB`。

```bash
npm run hardhat:compile
npm run deploy:factory:bsc
```

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
VITE_FACTORY_CONTRACT=0x7aD123deaf587cF6763Ef6043A453a0D5b852F8d
VITE_MINT_CONTRACT=
VITE_TOKEN_CONTRACT=
```
