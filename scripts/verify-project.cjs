require("dotenv").config();

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { Contract, JsonRpcProvider, getAddress, isAddress } = require("ethers");

const rootDir = process.cwd();
const factoryArtifact = readJson("artifacts/contracts/AppleLaunchFactory.sol/AppleLaunchFactory.json");
const tokenAbi = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
];

const networkName = process.env.VERIFY_NETWORK || "bsc";
const deployment = readFirstJson(
  [
    "deployments/bsc-AppleLaunchFactory.json",
    "deployments/bsc.json",
    "deployments/hardhat-AppleLaunchFactory.json",
  ],
  {},
);
const factoryAddress = readAddress(
  process.env.FACTORY_ADDRESS ||
    process.env.APPLE_FACTORY_ADDRESS ||
    process.env.VITE_FACTORY_CONTRACT ||
    process.env.VITE_LAUNCHPAD_FACTORY_ADDRESS ||
    deployment.factory ||
    "",
  "FACTORY_ADDRESS or VITE_FACTORY_CONTRACT",
);
const tokenAddress = readTokenAddress();
const rpcUrl =
  process.env.BSC_RPC_URL ||
  process.env.APPLE_RPC_URL ||
  (networkName === "bscTestnet" ? process.env.BSC_TESTNET_RPC_URL : "") ||
  "https://bsc.publicnode.com";
const chainId = Number(process.env.APPLE_CHAIN_ID || process.env.VITE_CHAIN_ID || (networkName === "bscTestnet" ? 97 : 56));
const provider = new JsonRpcProvider(rpcUrl, chainId);
const factory = new Contract(factoryAddress, factoryArtifact.abi, provider);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const project = await factory.getProject(tokenAddress);
  if (String(project.token).toLowerCase() !== tokenAddress.toLowerCase()) {
    throw new Error(`Token ${tokenAddress} is not indexed in Factory ${factoryAddress}.`);
  }

  const liquidityRouter = await factory.liquidityRouter();
  const token = new Contract(tokenAddress, tokenAbi, provider);
  const [name, symbol] = await Promise.all([token.name(), token.symbol()]);
  const tokenConstructorArgs = [
    [
      name,
      symbol,
      project.metadataUri,
      project.templateId,
      project.receiver,
      project.platformFeeReceiver,
      project.paymentToken,
      project.rewardToken,
      project.rewardThreshold,
      project.totalSupply,
    ],
    [
      project.buyTaxBps,
      project.sellTaxBps,
      project.transferTaxBps,
      project.addLiquidityTaxBps,
      project.removeLiquidityTaxBps,
      project.launchProtectionTaxBps,
      project.launchProtectionBlocks,
      project.claimWait,
      project.fundFeeBps,
      project.lpFeeBps,
      project.dividendFeeBps,
      project.burnFeeBps,
    ],
    factoryAddress,
  ];
  const vaultConstructorArgs = [
    tokenAddress,
    liquidityRouter,
    project.paymentToken,
    project.creator,
    project.receiver,
    project.totalSupply,
    project.mintCount,
    project.mintPrice,
    project.maxMintPerWallet || 0n,
    project.whitelistMintCount,
    project.whitelistEnabled,
  ];

  console.log("Verifying project contracts");
  console.log("Network:", networkName);
  console.log("Factory:", factoryAddress);
  console.log("Token:", tokenAddress);
  console.log("Vault:", project.vault);

  const argsDir = path.join(rootDir, "work", "verify-args", tokenAddress.toLowerCase());
  fs.mkdirSync(argsDir, { recursive: true });
  const tokenArgsPath = path.join(argsDir, "token.cjs");
  const vaultArgsPath = path.join(argsDir, "vault.cjs");
  writeArgsFile(tokenArgsPath, tokenConstructorArgs);
  writeArgsFile(vaultArgsPath, vaultConstructorArgs);

  await verifyOne({
    address: tokenAddress,
    constructorArgsPath: tokenArgsPath,
    contract: "contracts/AppleToken.sol:AppleToken",
    label: "Token",
  });
  await verifyOne({
    address: project.vault,
    constructorArgsPath: vaultArgsPath,
    contract: "contracts/AppleMintVault.sol:AppleMintVault",
    label: "Vault",
  });
}

function readTokenAddress() {
  const cliValue = process.argv.find((arg) => isAddress(arg));
  return readAddress(process.env.PROJECT_TOKEN || cliValue || "", "PROJECT_TOKEN");
}

async function verifyOne({ address, constructorArgsPath, contract, label }) {
  console.log(`Verifying ${label}: ${address}`);
  await runCommand("npx", [
    "hardhat",
    "verify",
    "--network",
    networkName,
    "--contract",
    contract,
    "--constructor-args",
    constructorArgsPath,
    address,
  ]);
}

function writeArgsFile(filePath, args) {
  const normalized = JSON.stringify(args, (_key, value) => (typeof value === "bigint" ? value.toString() : value));
  fs.writeFileSync(filePath, `module.exports = ${normalized};\n`);
}

function readAddress(value, label) {
  if (!isAddress(String(value || ""))) {
    throw new Error(`${label} is invalid: ${value}`);
  }
  return getAddress(value);
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(rootDir, filePath), "utf8"));
  } catch {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error(`Missing ${filePath}. Run npm run hardhat:compile first.`);
  }
}

function readFirstJson(filePaths, fallback) {
  for (const filePath of filePaths) {
    const value = readJson(filePath, null);
    if (value) {
      return value;
    }
  }
  return fallback;
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const logs = [];
    const child = spawn(command, args, {
      cwd: rootDir,
      env: process.env,
      shell: process.platform === "win32",
    });

    child.stdout.on("data", (chunk) => {
      const text = String(chunk);
      logs.push(text);
      process.stdout.write(text);
    });
    child.stderr.on("data", (chunk) => {
      const text = String(chunk);
      logs.push(text);
      process.stderr.write(text);
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      const output = logs.join("");
      if (/already verified|already been verified|contract source code already verified/i.test(output)) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}
