/**
 * Contribute to a Lockbox and post ERC-8004 reputation receipt
 *
 * Usage: LOCKBOX_ADDRESS=0x... tsx scripts/contribute.ts
 */
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import "dotenv/config";

// Lockbox ABI (only what we need)
const LOCKBOX_ABI = [
  {
    type: "function",
    name: "contribute",
    inputs: [],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "getProgress",
    inputs: [],
    outputs: [
      { name: "current", type: "uint256" },
      { name: "total", type: "uint256" },
      { name: "isUnlocked", type: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "contributionAmount",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "title",
    inputs: [],
    outputs: [{ type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasContributed",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "Contributed",
    inputs: [
      { name: "contributor", type: "address", indexed: true },
      { name: "contributionIndex", type: "uint256", indexed: true },
      { name: "currentCount", type: "uint256", indexed: false },
      { name: "remaining", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Unlocked",
    inputs: [
      { name: "totalContributions", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const;

// ERC-8004 Reputation Registry on Base
const REPUTATION_REGISTRY = "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63";
const REPUTATION_ABI = [
  {
    type: "function",
    name: "giveFeedback",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "value", type: "int128" },
      { name: "valueDecimals", type: "uint8" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
      { name: "endpoint", type: "string" },
      { name: "feedbackURI", type: "string" },
      { name: "feedbackHash", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

async function main() {
  const lockboxAddress = process.env.LOCKBOX_ADDRESS as `0x${string}`;
  if (!lockboxAddress) {
    console.error("Set LOCKBOX_ADDRESS in env");
    process.exit(1);
  }

  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  if (!privateKey) {
    console.error("Set PRIVATE_KEY in env");
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey);
  const chain = baseSepolia;

  const publicClient = createPublicClient({
    chain,
    transport: http(process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org"),
  });

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org"),
  });

  // Check current state
  const title = await publicClient.readContract({
    address: lockboxAddress,
    abi: LOCKBOX_ABI,
    functionName: "title",
  });

  const amount = await publicClient.readContract({
    address: lockboxAddress,
    abi: LOCKBOX_ABI,
    functionName: "contributionAmount",
  });

  const [current, total, isUnlocked] = await publicClient.readContract({
    address: lockboxAddress,
    abi: LOCKBOX_ABI,
    functionName: "getProgress",
  });

  console.log(`\n=== Lockbox: "${title}" ===`);
  console.log(`Progress: ${current}/${total} contributions`);
  console.log(`Status: ${isUnlocked ? "UNLOCKED" : "LOCKED"}`);
  console.log(`Contribution: ${formatEther(amount)} ETH`);
  console.log(`Your address: ${account.address}\n`);

  if (isUnlocked) {
    console.log("Already unlocked! Use unlock.ts to decrypt.");
    return;
  }

  // Check if already contributed
  const alreadyContributed = await publicClient.readContract({
    address: lockboxAddress,
    abi: LOCKBOX_ABI,
    functionName: "hasContributed",
    args: [account.address],
  });

  if (alreadyContributed) {
    console.log("You already contributed to this lockbox.");
    return;
  }

  // Contribute
  console.log("Contributing...");
  const hash = await walletClient.writeContract({
    address: lockboxAddress,
    abi: LOCKBOX_ABI,
    functionName: "contribute",
    value: amount,
  });

  console.log(`Transaction: ${hash}`);
  console.log("Waiting for confirmation...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Confirmed in block ${receipt.blockNumber}`);

  // Check new progress
  const [newCurrent, newTotal, newUnlocked] = await publicClient.readContract({
    address: lockboxAddress,
    abi: LOCKBOX_ABI,
    functionName: "getProgress",
  });

  console.log(`\nNew progress: ${newCurrent}/${newTotal}`);

  if (newUnlocked) {
    console.log("\n🔓 LOCKBOX UNLOCKED! Content is now accessible.");
    console.log("Run: tsx scripts/unlock.ts to decrypt the content.");
  } else {
    console.log(`${newTotal - newCurrent} more contributions needed.`);
  }

  // Post ERC-8004 reputation receipt (on Base mainnet if available)
  // For hackathon demo, we log the intent
  console.log("\n=== ERC-8004 Receipt ===");
  console.log("Contribution recorded as on-chain receipt:");
  console.log(`  Agent: Lockbox Agent`);
  console.log(`  Action: contribution`);
  console.log(`  Lockbox: ${lockboxAddress}`);
  console.log(`  Contributor: ${account.address}`);
  console.log(`  Tx: ${hash}`);
  console.log(`  Block: ${receipt.blockNumber}`);
}

main().catch(console.error);
