const fs = require('node:fs');
const path = require('node:path');
const hre = require('hardhat');

const DEFAULT_FEE_RECEIVER = '0xF007f8Dd9037e9DD56B2953D8dA60cBc4B7FA939';
const DEFAULT_PANCAKE_ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E';

function readAddress(name, fallback) {
  const value = process.env[name] || fallback;
  if (!hre.ethers.isAddress(value)) {
    throw new Error(`${name} is not a valid address: ${value}`);
  }
  return hre.ethers.getAddress(value);
}

function ensureDeployAccount() {
  const needsPrivateKey = !['hardhat', 'localhost'].includes(hre.network.name);
  if (needsPrivateKey && !process.env.PRIVATE_KEY) {
    throw new Error('Missing PRIVATE_KEY in .env for live BSC deployment.');
  }
}

async function maybeVerify(address, constructorArguments) {
  if (process.env.VERIFY_AFTER_DEPLOY !== 'true') return;
  if (!process.env.BSCSCAN_API_KEY) {
    console.log('Skip verify: BSCSCAN_API_KEY is empty.');
    return;
  }

  const confirmations = Number(process.env.VERIFY_CONFIRMATIONS || '5');
  if (confirmations > 0) {
    const provider = hre.ethers.provider;
    const currentBlock = await provider.getBlockNumber();
    const targetBlock = currentBlock + confirmations;
    console.log(`Waiting ${confirmations} blocks before verification...`);
    while ((await provider.getBlockNumber()) < targetBlock) {
      await new Promise((resolve) => setTimeout(resolve, 8000));
    }
  }

  await hre.run('verify:verify', {
    address,
    constructorArguments,
  });
}

async function main() {
  ensureDeployAccount();

  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) throw new Error('No deployer account available.');

  const feeReceiver = readAddress('FACTORY_FEE_RECEIVER', DEFAULT_FEE_RECEIVER);
  const pancakeRouter = readAddress('PANCAKE_ROUTER', DEFAULT_PANCAKE_ROUTER);
  const creationFeeBnb = process.env.FACTORY_CREATION_FEE_BNB || '0.01';
  const creationFeeWei = hre.ethers.parseEther(creationFeeBnb);

  console.log(`Network: ${hre.network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Fee receiver: ${feeReceiver}`);
  console.log(`Creation fee: ${creationFeeBnb} BNB (${creationFeeWei.toString()} wei)`);
  console.log(`Pancake Router: ${pancakeRouter}`);

  const PepeLaunchFactory = await hre.ethers.getContractFactory('PepeLaunchFactory');
  const factory = await PepeLaunchFactory.deploy(feeReceiver, creationFeeWei, pancakeRouter);
  await factory.waitForDeployment();

  const address = await factory.getAddress();
  const deploymentTx = factory.deploymentTransaction();
  console.log(`PepeLaunchFactory deployed: ${address}`);
  console.log(`Deployment tx: ${deploymentTx?.hash || ''}`);

  const constructorArguments = [feeReceiver, creationFeeWei.toString(), pancakeRouter];
  const deploymentRecord = {
    network: hre.network.name,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    contract: 'PepeLaunchFactory',
    address,
    deploymentTx: deploymentTx?.hash || '',
    deployer: deployer.address,
    constructorArguments,
    feeReceiver,
    creationFeeWei: creationFeeWei.toString(),
    pancakeRouter,
    deployedAt: new Date().toISOString(),
    verifyCommand: `npx hardhat verify --network ${hre.network.name} ${address} ${constructorArguments.join(' ')}`,
  };

  const outputDir = path.join(process.cwd(), 'deployments');
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${hre.network.name}-PepeLaunchFactory.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify(deploymentRecord, null, 2)}\n`);
  console.log(`Saved deployment record: ${outputPath}`);

  await maybeVerify(address, [feeReceiver, creationFeeWei, pancakeRouter]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
