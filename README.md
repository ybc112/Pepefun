# PEPE发射擂台

BSC 版精选发射台前端，使用 Vite + React 构建。

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

真实链上支付前需要配置：

```env
VITE_PAYMENT_RECEIVER=
VITE_FACTORY_CONTRACT=
```
