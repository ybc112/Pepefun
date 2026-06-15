const fs = require('node:fs');
const path = require('node:path');
const solc = require('solc');

const root = process.cwd();
const activeSources = [
  'contracts/AppleLaunchFactory.sol',
  'contracts/AppleLaunchDeployers.sol',
  'contracts/AppleMintVault.sol',
  'contracts/AppleToken.sol',
];

function readSource(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function findImport(importPath) {
  const candidates = [
    path.join(root, importPath),
    path.join(root, 'node_modules', importPath),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return { contents: fs.readFileSync(candidate, 'utf8') };
    }
  }

  return { error: `File not found: ${importPath}` };
}

function writeArtifact(sourceName, contractName, compiled) {
  const artifact = {
    _format: 'hh-sol-artifact-1',
    contractName,
    sourceName,
    abi: compiled.abi,
    bytecode: `0x${compiled.evm.bytecode.object || ''}`,
    deployedBytecode: `0x${compiled.evm.deployedBytecode.object || ''}`,
    linkReferences: compiled.evm.bytecode.linkReferences || {},
    deployedLinkReferences: compiled.evm.deployedBytecode.linkReferences || {},
  };
  const outputDir = path.join(root, 'artifacts', sourceName);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, `${contractName}.json`),
    `${JSON.stringify(artifact, null, 2)}\n`,
  );
}

const input = {
  language: 'Solidity',
  sources: Object.fromEntries(
    activeSources.map((sourceName) => [sourceName, { content: readSource(sourceName) }]),
  ),
  settings: {
    viaIR: true,
    optimizer: {
      enabled: true,
      runs: 1,
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode'],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImport }));
const errors = (output.errors || []).filter((item) => item.severity === 'error');
if (errors.length > 0) {
  for (const error of errors) {
    console.error(error.formattedMessage || error.message);
  }
  process.exitCode = 1;
  return;
}

let count = 0;
for (const [sourceName, contracts] of Object.entries(output.contracts || {})) {
  if (!sourceName.startsWith('contracts/')) continue;
  for (const [contractName, compiled] of Object.entries(contracts)) {
    writeArtifact(sourceName, contractName, compiled);
    count += 1;
  }
}

console.log(`Compiled ${count} Apple/Kaola contract artifacts with solc ${solc.version()}.`);
