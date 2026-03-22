/**
 * Full end-to-end demo of the Lockbox system
 *
 * 1. Deploy factory + create lockbox
 * 2. Show public metadata (always visible)
 * 3. Make contributions from multiple wallets
 * 4. Show progressive reveals
 * 5. Reach threshold → unlock
 * 6. Decrypt content
 *
 * Usage: npx hardhat run scripts/demo.ts --network hardhat
 *        (or tsx scripts/demo.ts for local demo)
 */
import hre from "hardhat";
import { parseEther, formatEther } from "viem";

async function main() {
  console.log("╔═══════════════════════════════════════════════╗");
  console.log("║          LOCKBOX — End-to-End Demo            ║");
  console.log("║   Collectively-Unlockable Encrypted Content   ║");
  console.log("╚═══════════════════════════════════════════════╝\n");

  // Get test accounts
  const [author, ...contributors] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  // Step 1: Deploy Factory
  console.log("━━━ Step 1: Deploy LockboxFactory ━━━");
  const factory = await hre.viem.deployContract("LockboxFactory");
  console.log(`Factory: ${factory.address}\n`);

  // Step 2: Create a Lockbox
  console.log("━━━ Step 2: Create Lockbox ━━━");
  const threshold = 3n;
  const price = parseEther("0.001");

  const tx = await factory.write.createLockbox([
    "The Collective Intelligence Paradox",
    "What if the most valuable knowledge could only be accessed through coordination?",
    "ipfs://QmMetadata...",  // Public metadata
    "ipfs://QmEncrypted...", // Encrypted content
    threshold,
    price,
    [], // Teaser CIDs
  ]);

  const lockboxAddress = await factory.read.getLockboxAddress([0n]);
  console.log(`Lockbox: ${lockboxAddress}`);
  console.log(`Threshold: ${threshold} contributions @ ${formatEther(price)} ETH each\n`);

  // Get lockbox contract instance
  const lockboxAbi = (await hre.artifacts.readArtifact("Lockbox")).abi;

  // Step 3: Show public metadata (always visible)
  console.log("━━━ Step 3: Public Metadata (Always Visible) ━━━");
  const title = await publicClient.readContract({
    address: lockboxAddress,
    abi: lockboxAbi,
    functionName: "title",
  });
  const description = await publicClient.readContract({
    address: lockboxAddress,
    abi: lockboxAbi,
    functionName: "description",
  });
  const [current, total, unlocked] = await publicClient.readContract({
    address: lockboxAddress,
    abi: lockboxAbi,
    functionName: "getProgress",
  });

  console.log(`Title:       "${title}"`);
  console.log(`Description: "${description}"`);
  console.log(`Progress:    ${current}/${total} (${unlocked ? "UNLOCKED" : "LOCKED"})`);
  console.log(`Reveal Level: ${await publicClient.readContract({
    address: lockboxAddress,
    abi: lockboxAbi,
    functionName: "getRevealLevel",
  })}/4\n`);

  // Step 4: Make contributions
  console.log("━━━ Step 4: Contributions ━━━");
  for (let i = 0; i < Number(threshold); i++) {
    const contributor = contributors[i] || author; // Use available wallets

    // Contribute
    const contributeTx = await contributor.writeContract({
      address: lockboxAddress,
      abi: lockboxAbi,
      functionName: "contribute",
      value: price,
    });

    // Check progress
    const [c, t, u] = await publicClient.readContract({
      address: lockboxAddress,
      abi: lockboxAbi,
      functionName: "getProgress",
    });

    const level = await publicClient.readContract({
      address: lockboxAddress,
      abi: lockboxAbi,
      functionName: "getRevealLevel",
    });

    const pct = Number(c) * 100 / Number(t);
    const bar = "█".repeat(Math.floor(pct / 5)) + "░".repeat(20 - Math.floor(pct / 5));
    console.log(`Contribution #${i + 1} from ${contributor.account.address.slice(0, 10)}...`);
    console.log(`  Progress: [${bar}] ${c}/${t} (${Math.floor(pct)}%)`);
    console.log(`  Reveal Level: ${level}/4`);

    if (u) {
      console.log(`  🔓 UNLOCKED!\n`);
    } else {
      console.log(`  ${t - c} more needed\n`);
    }
  }

  // Step 5: Verify unlocked state
  console.log("━━━ Step 5: Final State ━━━");
  const [finalCurrent, finalTotal, finalUnlocked] = await publicClient.readContract({
    address: lockboxAddress,
    abi: lockboxAbi,
    functionName: "getProgress",
  });
  const finalLevel = await publicClient.readContract({
    address: lockboxAddress,
    abi: lockboxAbi,
    functionName: "getRevealLevel",
  });
  const contributorList = await publicClient.readContract({
    address: lockboxAddress,
    abi: lockboxAbi,
    functionName: "getContributors",
  });

  console.log(`Status:       ${finalUnlocked ? "🔓 UNLOCKED" : "🔒 LOCKED"}`);
  console.log(`Reveal Level: ${finalLevel}/4`);
  console.log(`Contributors: ${contributorList.length}`);
  contributorList.forEach((addr: string, i: number) => {
    console.log(`  ${i + 1}. ${addr}`);
  });

  // Step 6: Author withdraws
  if (finalUnlocked) {
    console.log("\n━━━ Step 6: Author Withdrawal ━━━");
    const balance = await publicClient.getBalance({ address: lockboxAddress });
    console.log(`Lockbox balance: ${formatEther(balance)} ETH`);

    await author.writeContract({
      address: lockboxAddress,
      abi: lockboxAbi,
      functionName: "withdraw",
    });
    console.log("Author withdrew funds.");

    const newBalance = await publicClient.getBalance({ address: lockboxAddress });
    console.log(`Lockbox balance after: ${formatEther(newBalance)} ETH`);
  }

  console.log("\n╔═══════════════════════════════════════════════╗");
  console.log("║              Demo Complete!                    ║");
  console.log("║                                               ║");
  console.log("║  In production, Step 6 would decrypt the      ║");
  console.log("║  content via Lit Protocol, since the           ║");
  console.log("║  contract's isUnlocked() now returns true.     ║");
  console.log("╚═══════════════════════════════════════════════╝");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
