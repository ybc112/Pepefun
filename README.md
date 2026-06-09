# PEPE发射擂台 · BSC版

BSC 版公平 Meme 发射工具前端，使用 Vite + React 构建。页面聚焦 PEPE 青蛙擂台视觉、直接发币、自由 Mint、黑洞底池和真实钱包交易。

## 自助发币工厂

仓库已加入 `contracts/PepeLaunchFactory.sol` 作为 BSC 发币工厂：

- `deployFromTemplate`: 按已接入模板 ID 部署新币，前端普通用户默认走这个入口
- `deployToken`: 高级受控入口，只有已批准 creationCode hash 才能部署
- `predictTokenAddress` / `predictTemplateTokenAddress`: CREATE2 预测地址，支持尾号定制
- `getDeployments` / `getCreatorTokens` / `getLaunchedTokens`: 链上发射记录分页查询
- 直接发币支持创建 PancakeSwap 初始池子，LP 直接打入 `0x...dEaD`
- 超额 BNB 会退款；新币支持创建后立即丢权限
- 前端已加入“自助发币工厂”方案面板，默认调用已部署 Factory，也可用 `VITE_FACTORY_CONTRACT` 覆盖

部署构造参数需要 `feeReceiver`、`creationFee`、PancakeSwap V2 Router 和默认分红平台币地址。

当前 Hardhat 部署脚本默认收 mint/创建费地址为：`0xF007f8Dd9037e9DD56B2953D8dA60cBc4B7FA939`。

当前前端默认 Factory V3 地址为：`0x9c7DA60DfC7E2ef82014b347Db24BcE9fb1faF08`。

Factory V3 已在 BscScan 开源验证：`https://bscscan.com/address/0x9c7DA60DfC7E2ef82014b347Db24BcE9fb1faF08#code`。

默认分红平台币地址为：`0xb3b2afb0de33d4d80a20839662bc99c6b360eeee`。

当前 Factory 创建费为：`0.005 BNB`。

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
VITE_FACTORY_CONTRACT=0x9c7DA60DfC7E2ef82014b347Db24BcE9fb1faF08
VITE_MINT_CONTRACT=
VITE_TOKEN_CONTRACT=
```
