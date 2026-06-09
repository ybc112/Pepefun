# PEPE Launch Factory

This folder contains the first self-service launch factory draft for BSC.

## Contracts

- `PepeLaunchFactory`
  - Creates a fixed-supply BEP20 token.
  - Creates a fixed-supply BEP20 token plus a `FairMintPool`.
  - Collects a configurable creation fee.
  - Adds optional PancakeSwap V2 liquidity and sends LP tokens directly to `0x...dEaD`.
  - Emits token and launch-pool addresses for the frontend.

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
3. Verify the source code on BscScan.
4. Connect the deployed factory address to the frontend.
5. Add frontend ABI encoding for:
   - `createFixedSupplyToken`
   - `createFairMintLaunch`

## Hardhat Deployment

Create a local `.env` file from `.env.example`. Keep the private key only in `.env`.

```env
PRIVATE_KEY=
BSC_RPC_URL=https://bsc-dataseed.binance.org/
BSCSCAN_API_KEY=
FACTORY_FEE_RECEIVER=0xF007f8Dd9037e9DD56B2953D8dA60cBc4B7FA939
FACTORY_CREATION_FEE_BNB=0.05
PANCAKE_ROUTER=0x10ED43C718714eb63d5aA57B78B54704E256024E
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

This is a factory blueprint, not yet audited production bytecode. The frontend already encodes `createFixedSupplyToken` for the current factory draft and prevents fake token-deployment transactions until a reviewed factory address is configured.
