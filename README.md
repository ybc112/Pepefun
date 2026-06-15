# PEPE 发射擂台 · BSC 版

BSC 版公平 Meme 发射工具前端，使用 Vite + React 构建。页面继续保留 PEPE 青蛙擂台视觉，链上发射逻辑已切换为 Apple/Kaola 发射合约。

## 自助发币工厂

当前主流程调用 `AppleLaunchFactory.createLaunch`，创建 `AppleToken + AppleMintVault`：

- 支持白名单 Mint 和公开 Mint
- Mint 收款按规则自动加 PancakeSwap LP
- LP 接收地址固定为 `0x...dEaD`
- 未打满且超过退款窗口后，用户可手动退款可退余额
- 部署列表详情可对当前项目的 `AppleMintVault.mint(uint256)` 发起真实 Mint
- 部署列表详情可对当前项目的 `setWhitelistAccounts` / `setWhitelistEnabled` 发起 Owner 管理交易
- 支持分红模板、买卖税、高级税、四项税收分配、链上发射记录分页查询
- 创建费默认 `0.005 BNB`
- Token 地址尾号由工厂 `requiredTokenSuffix` 强制校验

当前核心合约源码与 `E:\dapp\kaola\contracts` 对齐，编译器使用 Solidity `0.8.28`。

默认靓号尾号为 `eeee`。部署新工厂时，`scripts/deploy-factory.cjs` 会读取 `REQUIRED_TOKEN_SUFFIX` / `VITE_VANITY_SUFFIX`，未配置时默认使用 `eeee`。

注意：已部署工厂的尾号是不可变的。如果后端 `/health` 返回的 `requiredTokenSuffix` 不是 `eeee`，需要重新部署一个 `0xeeee` 工厂，并同步更新 `VITE_FACTORY_CONTRACT` 与 `APPLE_FACTORY_ADDRESS`。

```bash
npm run hardhat:compile
npm run deploy:factory:bsc
```

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

生产环境部署时，需要把 `VITE_APP_BACKEND_URL` 配置为公开可访问的后端地址，并让后端的 `APPLE_FACTORY_ADDRESS` 指向同一个 `VITE_FACTORY_CONTRACT`。自动验源码需要配置 `BSCSCAN_API_KEY`，后端会调用 `npm run contracts:verify:project` 分别验证 `AppleToken` 和 `AppleMintVault`。

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
VITE_FACTORY_CONTRACT=0xEd168e31FD49E09794E8d21c2DE92b7188Ed3eE9
VITE_VANITY_SUFFIX=eeee
VITE_APP_BACKEND_URL=http://localhost:8787
VITE_TOKEN_CONTRACT=

PRIVATE_KEY=
BSC_RPC_URL=https://bsc-rpc.publicnode.com
BSCSCAN_API_KEY=
FACTORY_FEE_RECEIVER=0xF007f8Dd9037e9DD56B2953D8dA60cBc4B7FA939
FACTORY_CREATION_FEE_BNB=0.005
PANCAKE_ROUTER=0x10ED43C718714eb63d5aA57B78B54704E256024E
DEFAULT_REWARD_TOKEN=0x55d398326f99059fF775485246999027B3197955
REQUIRED_TOKEN_SUFFIX=eeee

APPLE_BACKEND_PORT=8787
APPLE_CHAIN_ID=56
APPLE_FACTORY_ADDRESS=0xEd168e31FD49E09794E8d21c2DE92b7188Ed3eE9
APPLE_BACKEND_TOKEN=
APPLE_PUBLIC_BASE_URL=http://localhost:8787
APPLE_ASSET_DIR=work/assets
APPLE_RATE_WINDOW_MS=60000
APPLE_VANITY_RATE_LIMIT=8
APPLE_VERIFY_RATE_LIMIT=30
APPLE_ASSET_RATE_LIMIT=20
AUTO_VERIFY_PROJECTS=true
VERIFY_POLL_MS=30000
VERIFY_BACKFILL_COUNT=12
VERIFY_INITIAL_DELAY_MS=20000
VERIFY_RETRY_DELAY_MS=60000
VERIFY_RETRY_LIMIT=5
```
