/**
 * Decrypt Lockbox content after threshold is reached.
 * Checks on-chain state, then decrypts via Lit Protocol.
 *
 * Usage: LOCKBOX_ADDRESS=0x... tsx scripts/unlock.ts
 */
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { readFileSync } from "fs";
import "dotenv/config";

const LOCKBOX_ABI = [
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
    name: "title",
    inputs: [],
    outputs: [{ type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isUnlocked",
    inputs: [],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
] as const;

async function main() {
  const lockboxAddress = process.env.LOCKBOX_ADDRESS as `0x${string}`;
  if (!lockboxAddress) {
    console.error("Set LOCKBOX_ADDRESS in env");
    process.exit(1);
  }

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org"),
  });

  const title = await publicClient.readContract({
    address: lockboxAddress,
    abi: LOCKBOX_ABI,
    functionName: "title",
  });

  const [current, total, isUnlocked] = await publicClient.readContract({
    address: lockboxAddress,
    abi: LOCKBOX_ABI,
    functionName: "getProgress",
  });

  console.log(`\n=== Lockbox: "${title}" ===`);
  console.log(`Progress: ${current}/${total}`);
  console.log(`Status: ${isUnlocked ? "UNLOCKED" : "LOCKED"}\n`);

  if (!isUnlocked) {
    console.log(`Content is still locked. ${total - current} more contributions needed.`);
    return;
  }

  console.log("Content is unlocked! Attempting decryption...\n");

  const encryptedPath = process.env.ENCRYPTED_PATH || "sample-content/encrypted-article.json";
  let encryptedData: {
    ciphertext: string;
    dataToEncryptHash: string;
    accessControlConditions: unknown[];
    simulated?: boolean;
  };

  try {
    encryptedData = JSON.parse(readFileSync(encryptedPath, "utf-8"));
  } catch {
    console.error(`Could not read encrypted data from ${encryptedPath}`);
    process.exit(1);
  }

  if (encryptedData.simulated) {
    console.log("(Demo mode — using simulated decryption)\n");
    const decrypted = Buffer.from(encryptedData.ciphertext, "base64").toString("utf-8");
    console.log("━━━ Decrypted Content ━━━\n");
    console.log(decrypted);
    console.log("\n━━━ End of Content ━━━");
    return;
  }

  try {
    const { createLitClient } = await import("@lit-protocol/lit-client");
    const { createAuthManager, storagePlugins } = await import("@lit-protocol/auth");
    const { privateKeyToAccount } = await import("viem/accounts");

    const litClient = await createLitClient({ network: "naga" });

    const authManager = createAuthManager({
      storage: storagePlugins.localStorageNode({
        appName: "lockbox",
        networkName: "naga",
      }),
    });

    const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
    const account = privateKeyToAccount(privateKey);

    const authContext = await authManager.createEoaAuthContext({
      config: { account },
      authConfig: {
        domain: "localhost",
        statement: "Decrypt lockbox content",
        expiration: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        resources: [["access-control-condition-decryption", "*"]],
      },
      litClient,
    });

    const decryptedResponse = await litClient.decrypt({
      data: encryptedData,
      unifiedAccessControlConditions: encryptedData.accessControlConditions,
      authContext,
      chain: "baseSepolia",
    });

    console.log("━━━ Decrypted Content ━━━\n");
    console.log(decryptedResponse);
    console.log("\n━━━ End of Content ━━━");

    await litClient.disconnect();
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.log(`Lit Protocol decryption failed: ${errMsg}`);
    console.log("Ensure Lit network is accessible and wallet has proper auth.");
  }
}

main().catch(console.error);
