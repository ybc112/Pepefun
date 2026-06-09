# PEPE Launch Factory

This folder contains the self-service launch factory contracts for BSC.

## Contracts

- `PepeLaunchFactory`
  - Deploys tokens from approved templates through `deployFromTemplate`.
  - Exposes a guarded `deployToken(bytes32 salt, bytes tokenCreationCode, ...)` path for approved creation-code hashes.
  - Predicts CREATE2 token addresses and supports suffix checks for vanity tails.
  - Records launches on-chain with paginated `getDeployments`, `getCreatorTokens`, and `getLaunchedTokens`.
  - Collects a configurable creation fee.
  - Adds optional PancakeSwap V2 liquidity and sends LP tokens directly to `0x...dEaD`.
  - Refunds unused BNB after liquidity creation.

- `DividendMemeToken`
  - Fixed-supply BEP20-style token with buy/sell fee support.
  - Maximum buy fee and sell fee are capped at 10%.
  - Swaps collected fees through PancakeSwap into the configured reward token.
  - Uses dividend accounting so holders can claim reward tokens.
  - No blacklist, sell-blocking, hidden owner, or upgrade logic.

- `PepeMemeToken`
  - Minimal fixed-supply BEP20-style token.
  - No mint function after deployment.
  - No owner role after deployment.
  - No tax, blacklist, hidden owner, or upgrade logic.

- `FairMintPool`
  - Receives BNB directly to mint token units.
  - Supports whitelist-first and public mint modes.
  - Supports per-wallet and per-transaction limits.
  - Keeps raised BNB in the pool and creates PancakeSwap liquidity at sellout.
  - Sends LP tokens directly to `0x...dEaD`.
  - Can renounce owner during creation after initial settings and whitelist are written.
  - Lets owner send unsold tokens to the dead address.

## Intended Deployment Flow

1. Review and audit `PepeLaunchFactory.sol`.
2. Deploy `PepeLaunchFactory` on BSC with:
   - `feeReceiver`: platform mint/creation fee wallet (`0xF007f8Dd9037e9DD56B2953D8dA60cBc4B7FA939` by default)
   - `creationFee`: platform creation fee in wei
   - `router`: PancakeSwap V2 Router on BSC (`0x10ED43C718714eb63d5aA57B78B54704E256024E`)
   - `defaultRewardToken`: platform reward token (`0xb3b2afb0de33d4d80a20839662bc99c6b360eeee` by default)
3. Verify the source code on BscScan.
4. Connect the deployed factory address to the frontend.
5. Add frontend ABI encoding for:
   - `deployFromTemplate`
   - `deployToken`
   - `predictTokenAddress`
   - `getDeployments`

## Hardhat Deployment

Create a local `.env` file from `.env.example`. Keep the private key only in `.env`.

```env
PRIVATE_KEY=
BSC_RPC_URL=https://bsc-dataseed.binance.org/
BSCSCAN_API_KEY=
FACTORY_FEE_RECEIVER=0xF007f8Dd9037e9DD56B2953D8dA60cBc4B7FA939
FACTORY_CREATION_FEE_BNB=0.005
PANCAKE_ROUTER=0x10ED43C718714eb63d5aA57B78B54704E256024E
DEFAULT_REWARD_TOKEN=0xb3b2afb0de33d4d80a20839662bc99c6b360eeee
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

The deploy script writes a local file under `deployments/` with the factory address, constructor arguments, and a ready-to-run verify command. `deployments/` is ignored by Git.

To verify automatically after deployment, set:

```env
VERIFY_AFTER_DEPLOY=true
VERIFY_CONFIRMATIONS=5
```

Or verify manually with the command printed in the deployment record.

## Notes

Factory V3 deployed on BSC:

- Address: `0x9c7DA60DfC7E2ef82014b347Db24BcE9fb1faF08`
- BscScan: `https://bscscan.com/address/0x9c7DA60DfC7E2ef82014b347Db24BcE9fb1faF08#code`
- Creation fee: `0.005 BNB`

The frontend encodes `deployFromTemplate` for the deployed V3 factory. The standalone `FairMintPool` source remains in this file for review/reference, while the current V3 frontend path does not deploy new mint pools.
