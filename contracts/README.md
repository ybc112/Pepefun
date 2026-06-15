# PEPE Launch Contracts

The active contract stack powers the PEPE launchpad flow used by the frontend.

## Active Flow

- Factory
  - Creates one launch Token and one Mint Vault per launch through `createLaunch`.
  - Records projects on-chain with `allTokensLength`, `getProjects`, creator indexes, and template indexes.
  - Collects the platform creation fee.
  - Creates the PancakeSwap pair during launch creation.
  - Supports the required token address suffix configured at factory deployment.

- Launch Token
  - ERC20 launch token with configurable buy, sell, transfer, add-LP, remove-LP, and launch-protection taxes.
  - Supports fund, LP, dividend, and burn tax splits.
  - Supports reward-token dividend accounting.

- Mint Vault
  - Holds the full launch token supply.
  - Sells 50% of supply through BNB minting and reserves 50% for liquidity.
  - Adds PancakeSwap liquidity on each mint and locks LP to `0x...dEaD`.
  - Supports whitelist-enabled launches and owner-managed whitelist lists.
  - Supports refunds after the fixed 24-hour window when the launch is not sold out.

The older Pepe template contracts are kept in `legacy-contracts/pepe/` for reference, but the production launch flow uses the current factory stack.

## Deployment

Create `.env` from `.env.example` and set:

```env
PRIVATE_KEY=
BSC_RPC_URL=https://bsc-rpc.publicnode.com
BSCSCAN_API_KEY=
FACTORY_FEE_RECEIVER=0x8D944D45aa683BCaE0f15c8f1D479fB121aE616c
FACTORY_CREATION_FEE_BNB=0.005
PANCAKE_ROUTER=0x10ED43C718714eb63d5aA57B78B54704E256024E
REQUIRED_TOKEN_SUFFIX=eeee
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

The deployment script writes a deployment record to `deployments/<network>-factory.json`.

## Current Mainnet Factory

- Factory: `0xE2340E4B5242A3DbF6bdC453A2F234d6f132565b`
- Token deployer: `0xf9E47B4f7567C96d15839af157B409544Cd4b4C0`
- Vault deployer: `0x25744661F5863DcA3101D8F7dc19cf43e607Bfe7`
- Creation fee: `0.005 BNB`
- Required token suffix: `0xeeee`
