# PEPE 发射台 · BSC 版

BSC 版 PEPE 风格发币工具，使用 Vite + React 构建。当前主流程已经接入生产发射合约：部署新币、创建 Mint 池、写入白名单、匹配 `eeee` 靓号尾号，并把自动验源码任务送入后端队列。

## 当前功能

- 支持白名单 Mint 和公开 Mint
- Mint 收款按规则自动加 PancakeSwap LP
- LP 接收地址固定为 `0x...dEaD`
- 未打满且超过退款窗口后，用户可手动退款可退余额
- 部署列表详情可发起真实 Mint、写入白名单、切换白名单窗口
- 支持买卖税、高级税、四项税收分配、链上发射记录分页查询
- 创建费默认 `0.005 BNB`
- Token 地址尾号由工厂强制校验为 `eeee`

注意：已部署工厂的尾号是不可变的。如果后端 `/health` 返回的 `requiredTokenSuffix` 不是前端配置的尾号，需要重新部署对应尾号的工厂，并同步更新 `VITE_FACTORY_CONTRACT` 与 `PEPE_FACTORY_ADDRESS`。

## 后端：靓号、资产与自动验源码

前端依赖本项目后端处理三类链上配套工作：

- `/api/vanity-salt`：按 Factory 参数搜索 CREATE2 salt，默认匹配 `...eeee`
- `/api/assets` 与 `/api/assets/:filename`：保存 Logo 数据并返回可写入 `metadataUri` 的公开 URL
- `/api/verify-project` 与 `/api/verify-status`：把新 Token 加入自动验源码队列，后端也会轮询 Factory 新项目并自动 backfill

本地开发时需要同时运行后端和前端：

```bash
npm install
npm run hardhat:compile
npm run backend
npm run dev
```

生产环境部署时，需要把 `VITE_APP_BACKEND_URL` 配置为公开可访问的后端地址，并让后端的 `PEPE_FACTORY_ADDRESS` 指向同一个 `VITE_FACTORY_CONTRACT`。自动验源码需要配置 `BSCSCAN_API_KEY`，后端会调用 `npm run contracts:verify:project` 完成 Token 与 Mint 池源码验证。

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

```env
VITE_FACTORY_CONTRACT=0x988Cf7cb0b2AB68340769449850d8Bdf2a40DfB2
VITE_VANITY_SUFFIX=eeee
VITE_APP_BACKEND_URL=https://154.12.118.163.sslip.io
VITE_TOKEN_CONTRACT=

PRIVATE_KEY=
BSC_RPC_URL=https://bsc-rpc.publicnode.com
BSCSCAN_API_KEY=
FACTORY_FEE_RECEIVER=0x8D944D45aa683BCaE0f15c8f1D479fB121aE616c
FACTORY_CREATION_FEE_BNB=0.005
PANCAKE_ROUTER=0x10ED43C718714eb63d5aA57B78B54704E256024E
DEFAULT_REWARD_TOKEN=0x55d398326f99059fF775485246999027B3197955
REQUIRED_TOKEN_SUFFIX=eeee

PEPE_BACKEND_PORT=8787
PEPE_CHAIN_ID=56
PEPE_FACTORY_ADDRESS=0x988Cf7cb0b2AB68340769449850d8Bdf2a40DfB2
PEPE_BACKEND_TOKEN=
PEPE_PUBLIC_BASE_URL=https://154.12.118.163.sslip.io
PEPE_ASSET_DIR=work/assets
PEPE_RATE_WINDOW_MS=60000
PEPE_VANITY_RATE_LIMIT=8
PEPE_VERIFY_RATE_LIMIT=30
PEPE_ASSET_RATE_LIMIT=20
AUTO_VERIFY_PROJECTS=true
VERIFY_POLL_MS=30000
VERIFY_BACKFILL_COUNT=12
VERIFY_INITIAL_DELAY_MS=20000
VERIFY_RETRY_DELAY_MS=60000
VERIFY_RETRY_LIMIT=5
```
