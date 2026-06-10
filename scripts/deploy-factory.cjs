const fs = require('node:fs');
const path = require('node:path');
const hre = require('hardhat');

const DEFAULT_FEE_RECEIVER = '0xF007f8Dd9037e9DD56B2953D8dA60cBc4B7FA939';
const DEFAULT_PANCAKE_ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
const DEFAULT_REWARD_TOKEN = '0xb3b2afb0de33d4d80a20839662bc99c6b360eeee';

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

async function maybeVerify(address, constructorArguments, contract) {
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

  const verifyArgs = {
    address,
    constructorArguments,
  };
  if (contract) verifyArgs.contract = contract;
  await hre.run('verify:verify', verifyArgs);
}

async function main() {
  ensureDeployAccount();

  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) throw new Error('No deployer account available.');

  const feeReceiver = readAddress('FACTORY_FEE_RECEIVER', DEFAULT_FEE_RECEIVER);
  const pancakeRouter = readAddress('PANCAKE_ROUTER', DEFAULT_PANCAKE_ROUTER);
  const defaultRewardToken = readAddress('DEFAULT_REWARD_TOKEN', DEFAULT_REWARD_TOKEN);
  const creationFeeBnb = process.env.FACTORY_CREATION_FEE_BNB || '0.005';
  const creationFeeWei = hre.ethers.parseEther(creationFeeBnb);
  const whitelistCreationFeeBnb = process.env.FACTORY_WHITELIST_CREATION_FEE_BNB || '';
  const whitelistCreationFeeWei = whitelistCreationFeeBnb ? hre.ethers.parseEther(whitelistCreationFeeBnb) : creationFeeWei * 2n;

  console.log(`Network: ${hre.network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Fee receiver: ${feeReceiver}`);
  console.log(`Creation fee: ${creationFeeBnb} BNB (${creationFeeWei.toString()} wei)`);
  console.log(`Whitelist creation fee: ${hre.ethers.formatEther(whitelistCreationFeeWei)} BNB (${whitelistCreationFeeWei.toString()} wei)`);
  console.log(`Pancake Router: ${pancakeRouter}`);
  console.log(`Default reward token: ${defaultRewardToken}`);

  const FairMintPool = await hre.ethers.getContractFactory('FairMintPool');
  const fairMintPoolImplementation = await FairMintPool.deploy();
  await fairMintPoolImplementation.waitForDeployment();
  const fairMintPoolImplementationAddress = await fairMintPoolImplementation.getAddress();
  const fairMintDeploymentTx = fairMintPoolImplementation.deploymentTransaction();
  console.log(`FairMintPool implementation deployed: ${fairMintPoolImplementationAddress}`);
  console.log(`FairMintPool tx: ${fairMintDeploymentTx?.hash || ''}`);

  const DividendMemeToken = await hre.ethers.getContractFactory('DividendMemeToken');
  const dividendTokenImplementation = await DividendMemeToken.deploy();
  await dividendTokenImplementation.waitForDeployment();
  const dividendTokenImplementationAddress = await dividendTokenImplementation.getAddress();
  const dividendDeploymentTx = dividendTokenImplementation.deploymentTransaction();
  console.log(`DividendMemeToken implementation deployed: ${dividendTokenImplementationAddress}`);
  console.log(`DividendMemeToken tx: ${dividendDeploymentTx?.hash || ''}`);

  const PepeLaunchFactory = await hre.ethers.getContractFactory('PepeLaunchFactory');
  const factory = await PepeLaunchFactory.deploy(
    feeReceiver,
    creationFeeWei,
    pancakeRouter,
    defaultRewardToken,
    fairMintPoolImplementationAddress,
    dividendTokenImplementationAddress,
  );
  await factory.waitForDeployment();

  const address = await factory.getAddress();
  const deploymentTx = factory.deploymentTransaction();
  console.log(`PepeLaunchFactory deployed: ${address}`);
  console.log(`Deployment tx: ${deploymentTx?.hash || ''}`);

  if (whitelistCreationFeeWei !== creationFeeWei * 2n) {
    const feeTx = await factory.setWhitelistCreationFee(whitelistCreationFeeWei);
    await feeTx.wait();
    console.log(`Whitelist creation fee updated tx: ${feeTx.hash}`);
  }

  const constructorArguments = [
    feeReceiver,
    creationFeeWei.toString(),
    pancakeRouter,
    defaultRewardToken,
    fairMintPoolImplementationAddress,
    dividendTokenImplementationAddress,
  ];
  const deploymentRecord = {
    network: hre.network.name,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    contract: 'PepeLaunchFactory',
    address,
    deploymentTx: deploymentTx?.hash || '',
    implementations: {
      fairMintPool: {
        contract: 'FairMintPool',
        address: fairMintPoolImplementationAddress,
        deploymentTx: fairMintDeploymentTx?.hash || '',
      },
      dividendMemeToken: {
        contract: 'DividendMemeToken',
        address: dividendTokenImplementationAddress,
        deploymentTx: dividendDeploymentTx?.hash || '',
      },
    },
    deployer: deployer.address,
    constructorArguments,
    feeReceiver,
    creationFeeWei: creationFeeWei.toString(),
    whitelistCreationFeeWei: whitelistCreationFeeWei.toString(),
    pancakeRouter,
    defaultRewardToken,
    deployedAt: new Date().toISOString(),
    verifyCommand: `npx hardhat verify --network ${hre.network.name} ${address} ${constructorArguments.join(' ')}`,
  };

  const outputDir = path.join(process.cwd(), 'deployments');
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${hre.network.name}-PepeLaunchFactory.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify(deploymentRecord, null, 2)}\n`);
  console.log(`Saved deployment record: ${outputPath}`);

  await maybeVerify(
    fairMintPoolImplementationAddress,
    [],
    'contracts/templates/FairMintPool.sol:FairMintPool',
  );
  await maybeVerify(
    dividendTokenImplementationAddress,
    [],
    'contracts/templates/DividendMemeToken.sol:DividendMemeToken',
  );
  await maybeVerify(
    address,
    [
      feeReceiver,
      creationFeeWei,
      pancakeRouter,
      defaultRewardToken,
      fairMintPoolImplementationAddress,
      dividendTokenImplementationAddress,
    ],
    'contracts/PepeLaunchFactory.sol:PepeLaunchFactory',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
