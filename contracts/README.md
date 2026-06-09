# PEPE Launch Factory

This folder contains the self-service launch factory contracts for BSC.

## Contracts

- `PepeLaunchFactory`
  - Deploys tokens from approved templates through `deployFromTemplate`.
  - Deploys whitelist-first fair mint launches through `deployFairMintLaunch`.
  - Exposes a guarded `deployToken(bytes32 salt, bytes tokenCreationCode, ...)` path for approved creation-code hashes.
  - Predicts CREATE2 token addresses and supports suffix checks for vanity tails.
  - Records launches on-chain with paginated `getDeployments`, `getCreatorTokens`, `getLaunchedTokens`, and `getTemplateDeployments`.
  - Collects a configurable creation fee.
  - Forces direct-launch liquidity through PancakeSwap V2 and sends LP tokens directly to `0x...dEaD`.
  - Uses clone implementations for fair mint pools and dividend tokens so the factory stays deployable and template logic stays separated.
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
  - Supports Dragon-style method names such as `launchWhitelist`, `launch`, and `excludeMultipleAccountsFromFees`.
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
   - `fairMintPoolImplementation`: deployed `FairMintPool` implementation
   - `dividendTokenImplementation`: deployed `DividendMemeToken` implementation
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

## Mainnet Deployment

- Factory: `0x6B5319A16aB6dBD153675e3f7267ea5Ee00B9554`
- FairMintPool implementation: `0x6A8a2A44da07bEe7AB0a833890F2397E4bA39973`
- DividendMemeToken implementation: `0x0DAd4A4F8165D8c941025262Ab5d96c590B28594`
- Creation fee: `0.005 BNB`
- Factory BscScan: `https://bscscan.com/address/0x6B5319A16aB6dBD153675e3f7267ea5Ee00B9554#code`
