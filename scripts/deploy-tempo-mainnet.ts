import { createPublicClient, createWalletClient, http, parseUnits } from "viem";
import { tempo } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync, writeFileSync } from "fs";
import "dotenv/config";

const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
if (!PRIVATE_KEY) { console.error("Set PRIVATE_KEY in .env"); process.exit(1); }

const USDC = "0x20c000000000000000000000b9537d11c60e8b50" as `0x${string}`;

const account = privateKeyToAccount(PRIVATE_KEY);

// Use the chain's built-in RPC and formatters (handles Tempo tx types)
const publicClient = createPublicClient({ chain: tempo, transport: http() });
const walletClient = createWalletClient({ account, chain: tempo, transport: http() });

function getArtifact(name: string) {
  const path = `artifacts/contracts/${name}.sol/${name}.json`;
  return JSON.parse(readFileSync(path, "utf-8"));
}

async function main() {
  console.log(`Deployer: ${account.address}`);
  console.log(`Network:  Tempo Mainnet (${tempo.id})\n`);

  const factoryArtifact = getArtifact("LockboxFactory");

  console.log("Deploying LockboxFactory...");
  const factoryHash = await walletClient.deployContract({
    abi: factoryArtifact.abi,
    bytecode: factoryArtifact.bytecode as `0x${string}`,
    feeCurrency: USDC,
  } as any);

  console.log(`Deploy tx: ${factoryHash}`);
  console.log("Waiting for confirmation...");
  const factoryReceipt = await publicClient.waitForTransactionReceipt({ hash: factoryHash });
  const factoryAddr = factoryReceipt.contractAddress!;
  console.log(`LockboxFactory: ${factoryAddr}\n`);

  console.log("Creating sample Lockbox...");
  const createHash = await walletClient.writeContract({
    address: factoryAddr,
    abi: factoryArtifact.abi,
    functionName: "createLockbox",
    feeCurrency: USDC,
    args: [
      "The Collective Intelligence Paradox",
      "What if the most valuable knowledge could only be accessed through coordination?",
      "ipfs://placeholder-metadata",
      "ipfs://placeholder-encrypted",
      5n,
      parseUnits("1", 6),
      [],
    ],
  });

  console.log(`Create tx: ${createHash}`);
  const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createHash });
  console.log(`Confirmed in block ${createReceipt.blockNumber}`);

  const lockboxAddr = await publicClient.readContract({
    address: factoryAddr,
    abi: factoryArtifact.abi,
    functionName: "getLockboxAddress",
    args: [0n],
  });

  console.log(`\nLockbox: ${lockboxAddr}`);

  console.log("\n=== Deployment Summary ===");
  console.log(`Factory:  ${factoryAddr}`);
  console.log(`Lockbox:  ${lockboxAddr}`);
  console.log(`Network:  Tempo Mainnet (${tempo.id})`);
  console.log(`Explorer: https://explore.tempo.xyz/address/${lockboxAddr}`);

  writeFileSync("deployment-tempo.json", JSON.stringify({
    network: "tempo",
    chainId: tempo.id,
    factory: factoryAddr,
    lockbox: lockboxAddr,
    threshold: 5,
    contributionAmount: "1 pathUSD",
    deployedAt: new Date().toISOString(),
  }, null, 2));
  console.log("\nSaved to deployment-tempo.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
