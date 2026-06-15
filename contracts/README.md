# PEPE Launch Arena Contracts

The frontend keeps the PEPE launch arena style, while the active launch contracts now use the Apple/Kaola mechanism.

## Active Contracts

- `AppleLaunchFactory`
  - Creates one `AppleToken` and one `AppleMintVault` per launch through `createLaunch`.
  - Records projects on-chain with `allTokensLength`, `getProjects`, creator indexes, and template indexes.
  - Collects the platform creation fee.
  - Creates the PancakeSwap pair during launch creation.
  - Supports a required token address suffix configured at factory deployment.

- `AppleToken`
  - ERC20 launch token with configurable buy, sell, transfer, add-LP, remove-LP, and launch-protection taxes.
  - Supports fund, LP, dividend, and burn tax splits.
  - Supports reward-token dividend accounting.

- `AppleMintVault`
  - Holds the full launch token supply.
  - Sells 50% of supply through BNB minting and reserves 50% for liquidity.
  - Adds PancakeSwap liquidity on each mint and locks LP to `0x...dEaD`.
  - Supports whitelist-enabled launches and owner-managed whitelist lists.
  - Supports refunds after the fixed 24-hour window when the launch is not sold out.

- `AppleLaunchDeployers`
  - Deploys `AppleToken` and `AppleMintVault` with CREATE2 for the factory.

The older Pepe template contracts are kept in `legacy-contracts/pepe/` for reference, but `scripts/deploy-factory.cjs` now deploys the Apple/Kaola factory stack.

## Deployment

Create `.env` from `.env.example` and set:

```env
PRIVATE_KEY=
BSC_RPC_URL=https://bsc-rpc.publicnode.com
BSCSCAN_API_KEY=
FACTORY_FEE_RECEIVER=0xF007f8Dd9037e9DD56B2953D8dA60cBc4B7FA939
FACTORY_CREATION_FEE_BNB=0.005
PANCAKE_ROUTER=0x10ED43C718714eb63d5aA57B78B54704E256024E
REQUIRED_TOKEN_SUFFIX=aaaa
VERIFY_AFTER_DEPLOY=false
```

Compile:

```bash
npm run hardhat:compile
```

Deploy to BSC:

```bash
npm run deploy:factory:bsc
```

The deployment script writes a deployment record to `deployments/<network>-AppleLaunchFactory.json`.

## Current Kaola Mainnet Factory

- Factory: `0xEd168e31FD49E09794E8d21c2DE92b7188Ed3eE9`
- Token deployer: `0x25C696315043840C1aD282E30B8cEcf7780c0B95`
- Vault deployer: `0xD9E652932d7c586b0Ba51F16102a66d62C8090f5`
- Creation fee: `0.005 BNB`
- Required token suffix: `0xaaaa`
