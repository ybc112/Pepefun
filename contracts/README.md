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
FACTORY_FEE_RECEIVER=0xE3361a68e42Cea9aebA8D1148721D435ACB5c88b
FACTORY_CREATION_FEE_BNB=0.005
PANCAKE_ROUTER=0x10ED43C718714eb63d5aA57B78B54704E256024E
REQUIRED_TOKEN_SUFFIX=5555
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

- Factory: `0x8c0F9b5490d45c7fcBc29cDda2aA2843DBe2162e`
- Token deployer: `0xf9E47B4f7567C96d15839af157B409544Cd4b4C0`
- Vault deployer: `0x25744661F5863DcA3101D8F7dc19cf43e607Bfe7`
- Creation fee: `0.005 BNB`
- Required token suffix: `0x5555`
