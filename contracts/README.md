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
   - `feeReceiver`: platform treasury wallet
   - `creationFee`: platform creation fee in wei
   - `router`: PancakeSwap V2 Router on BSC (`0x10ED43C718714eb63d5aA57B78B54704E256024E`)
3. Verify the source code on BscScan.
4. Connect the deployed factory address to the frontend.
5. Add frontend ABI encoding for:
   - `createFixedSupplyToken`
   - `createFairMintLaunch`

## Notes

This is a factory blueprint, not yet audited production bytecode. The frontend already encodes `createFixedSupplyToken` for the current factory draft and prevents fake token-deployment transactions until a reviewed factory address is configured.
