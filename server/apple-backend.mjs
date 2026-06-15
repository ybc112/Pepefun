import "dotenv/config";

import { createServer } from "node:http";
import fs from "node:fs";
import path from "node:path";
import {
  Contract,
  ContractFactory,
  JsonRpcProvider,
  ZeroAddress,
  getAddress,
  getCreate2Address,
  hexlify,
  id,
  isAddress,
  keccak256,
  randomBytes,
  solidityPackedKeccak256,
} from "ethers";

const rootDir = process.cwd();
const deployment = readFirstJson(
  [
    "deployments/bsc-AppleLaunchFactory.json",
    "deployments/bsc.json",
    "deployments/hardhat-AppleLaunchFactory.json",
  ],
  {},
);
const factoryArtifact = readJson("artifacts/contracts/AppleLaunchFactory.sol/AppleLaunchFactory.json");
const tokenArtifact = readJson("artifacts/contracts/AppleToken.sol/AppleToken.json");
const factorySource =
  process.env.APPLE_FACTORY_ADDRESS ||
  process.env.VITE_FACTORY_CONTRACT ||
  process.env.FACTORY_ADDRESS ||
  deployment.factory ||
  "";

if (!isAddress(factorySource)) {
  throw new Error("Missing APPLE_FACTORY_ADDRESS or VITE_FACTORY_CONTRACT for vanity backend.");
}

const chainId = Number(process.env.APPLE_CHAIN_ID || process.env.VITE_CHAIN_ID || 56);
const rpcUrl = process.env.APPLE_RPC_URL || process.env.BSC_RPC_URL || "https://bsc.publicnode.com";
const factoryAddress = getAddress(factorySource);
const provider = new JsonRpcProvider(rpcUrl, chainId);
const factory = new Contract(factoryAddress, factoryArtifact.abi, provider);
const port = Number(process.env.APPLE_BACKEND_PORT || 8787);
const backendToken = process.env.APPLE_BACKEND_TOKEN || "";
const rateWindowMs = Number(process.env.APPLE_RATE_WINDOW_MS || 60000);
const vanityRateLimit = Number(process.env.APPLE_VANITY_RATE_LIMIT || 8);
const rateBuckets = new Map();

const server = createServer(async (request, response) => {
  try {
    setCors(response);
    if (request.method === "OPTIONS") {
      sendJson(response, 204, {});
      return;
    }

    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(response, 200, {
        ok: true,
        chainId,
        factory: factoryAddress,
        requiredTokenSuffix: await readFactoryRequiredSuffix(),
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/vanity-salt") {
      limitRequest(request, "vanity", vanityRateLimit);
      requireToken(request);
      const body = await readBody(request);
      sendJson(response, 200, await findVanitySalt(body));
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(port, () => {
  console.log(`Apple vanity backend listening on :${port}`);
  console.log(`Factory: ${factoryAddress}`);
  console.log(`RPC: ${rpcUrl}`);
});

async function findVanitySalt(body) {
  const requestedSuffix = String(body.suffix || process.env.VITE_VANITY_SUFFIX || "eeee")
    .toLowerCase()
    .replace(/^0x/, "");
  const factoryRequiredSuffix = await readFactoryRequiredSuffix();
  const suffix = factoryRequiredSuffix || requestedSuffix;
  if (!/^[0-9a-f]{1,4}$/.test(suffix)) {
    throw new Error("suffix must be 1-4 hex characters.");
  }
  if (factoryRequiredSuffix && requestedSuffix.padStart(4, "0") !== factoryRequiredSuffix) {
    throw new Error(`factory requires token suffix ${factoryRequiredSuffix}.`);
  }

  const creator = normalizeAddress(body.creator);
  const params = normalizeLaunchParams(body.params || {});
  const maxIterations = clampIterations(body.maxIterations);
  const tokenFactory = new ContractFactory(tokenArtifact.abi, tokenArtifact.bytecode);
  const rewardToken =
    params.rewardToken === ZeroAddress
      ? process.env.DEFAULT_REWARD_TOKEN || "0x55d398326f99059fF775485246999027B3197955"
      : params.rewardToken;
  const [platformFeeReceiver, tokenDeployer] = await Promise.all([
    factory.feeRecipient().then((value) => getAddress(value)),
    factory.tokenDeployer().then((value) => getAddress(value)),
  ]);
  const deployTx = await tokenFactory.getDeployTransaction(
    {
      name: params.name,
      symbol: params.symbol,
      projectUri: params.metadataUri,
      templateId: params.templateId,
      receiver: params.receiver,
      platformFeeReceiver,
      paymentToken: params.paymentToken,
      rewardToken,
      rewardThreshold: params.rewardThreshold,
      totalSupply: params.totalSupply,
    },
    {
      buyTaxBps: params.buyTaxBps,
      sellTaxBps: params.sellTaxBps,
      transferTaxBps: params.transferTaxBps,
      addLiquidityTaxBps: params.addLiquidityTaxBps,
      removeLiquidityTaxBps: params.removeLiquidityTaxBps,
      launchProtectionTaxBps: params.launchProtectionTaxBps,
      launchProtectionBlocks: params.launchProtectionBlocks,
      claimWait: params.claimWait,
      fundFeeBps: params.fundFeeBps,
      lpFeeBps: params.lpFeeBps,
      dividendFeeBps: params.dividendFeeBps,
      burnFeeBps: params.burnFeeBps,
    },
    factoryAddress,
  );
  if (!deployTx.data) {
    throw new Error("AppleToken init code is empty.");
  }

  const initCodeHash = keccak256(deployTx.data);
  const startedAt = Date.now();

  for (let attempts = 1; attempts <= maxIterations; attempts += 1) {
    const salt = hexlify(randomBytes(32));
    const tokenSalt = solidityPackedKeccak256(
      ["address", "bytes32", "string", "string", "uint256"],
      [creator, salt, params.name, params.symbol, chainId],
    );
    const tokenAddress = getCreate2Address(tokenDeployer, tokenSalt, initCodeHash);
    if (tokenAddress.toLowerCase().endsWith(suffix)) {
      return {
        ok: true,
        suffix,
        salt,
        tokenSalt,
        tokenAddress,
        factory: factoryAddress,
        chainId,
        attempts,
        elapsedMs: Date.now() - startedAt,
      };
    }
  }

  return {
    ok: false,
    suffix,
    factory: factoryAddress,
    chainId,
    attempts: maxIterations,
    elapsedMs: Date.now() - startedAt,
  };
}

async function readFactoryRequiredSuffix() {
  try {
    const suffix = Number(await factory.requiredTokenSuffix());
    return suffix > 0 ? suffix.toString(16).padStart(4, "0") : "";
  } catch {
    return "";
  }
}

function normalizeLaunchParams(params) {
  return {
    name: requiredString(params.name, "params.name"),
    symbol: requiredString(params.symbol, "params.symbol"),
    metadataUri: String(params.metadataUri || ""),
    totalSupply: requiredBigInt(params.totalSupply, "params.totalSupply"),
    mintCount: requiredBigInt(params.mintCount, "params.mintCount"),
    mintPrice: requiredBigInt(params.mintPrice, "params.mintPrice"),
    maxMintPerWallet: BigInt(params.maxMintPerWallet || 0),
    paymentToken: normalizeAddress(params.paymentToken || ZeroAddress),
    rewardToken: normalizeAddress(params.rewardToken || ZeroAddress),
    rewardThreshold: BigInt(params.rewardThreshold || 0),
    receiver: normalizeAddress(params.receiver),
    templateId: normalizeTemplateId(params.templateId || "standard"),
    buyTaxBps: Number(params.buyTaxBps || 0),
    sellTaxBps: Number(params.sellTaxBps || 0),
    transferTaxBps: Number(params.transferTaxBps || 0),
    addLiquidityTaxBps: Number(params.addLiquidityTaxBps || 0),
    removeLiquidityTaxBps: Number(params.removeLiquidityTaxBps || 0),
    launchProtectionTaxBps: Number(params.launchProtectionTaxBps || 0),
    launchProtectionBlocks: Number(params.launchProtectionBlocks || 0),
    claimWait: Number(params.claimWait || 0),
    fundFeeBps: Number(params.fundFeeBps || 0),
    lpFeeBps: Number(params.lpFeeBps || 0),
    dividendFeeBps: Number(params.dividendFeeBps || 0),
    burnFeeBps: Number(params.burnFeeBps || 0),
    whitelistMintCount: BigInt(params.whitelistMintCount || 0),
    whitelistEnabled: Boolean(params.whitelistEnabled),
  };
}

function clampIterations(value) {
  const nextValue = Number(value || 500000);
  if (!Number.isFinite(nextValue) || nextValue <= 0) {
    return 500000;
  }
  return Math.min(Math.floor(nextValue), 2000000);
}

function normalizeAddress(value) {
  if (!isAddress(String(value || ""))) {
    throw new Error(`Invalid address: ${value}`);
  }
  return getAddress(value);
}

function requiredString(value, label) {
  const text = String(value || "").trim();
  if (!text) {
    throw new Error(`${label} is required.`);
  }
  return text;
}

function requiredBigInt(value, label) {
  const nextValue = BigInt(value || 0);
  if (nextValue <= 0n) {
    throw new Error(`${label} must be greater than 0.`);
  }
  return nextValue;
}

function normalizeTemplateId(value) {
  const text = String(value || "standard");
  return /^0x[0-9a-fA-F]{64}$/.test(text) ? text : id(text);
}

function requireToken(request) {
  if (!backendToken) {
    return;
  }
  const header = request.headers.authorization || "";
  if (header !== `Bearer ${backendToken}`) {
    throw new Error("Unauthorized.");
  }
}

function limitRequest(request, scope, maxRequests) {
  if (!Number.isFinite(maxRequests) || maxRequests <= 0) {
    return;
  }

  const forwardedFor = String(request.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const ip = forwardedFor || request.socket.remoteAddress || "unknown";
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const current = rateBuckets.get(key);

  if (!current || now - current.startedAt > rateWindowMs) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return;
  }

  current.count += 1;
  if (current.count > maxRequests) {
    throw new Error("Rate limit exceeded. Try again later.");
  }
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error("Request body too large."));
      }
    });
    request.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  if (statusCode === 204) {
    response.end();
    return;
  }
  response.end(JSON.stringify(payload, jsonReplacer));
}

function setCors(response) {
  response.setHeader("access-control-allow-origin", process.env.APPLE_CORS_ORIGIN || "*");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type,authorization");
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

function jsonReplacer(_key, value) {
  return typeof value === "bigint" ? value.toString() : value;
}
