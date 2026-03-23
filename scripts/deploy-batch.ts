import hre from "hardhat";
import { parseEther, parseUnits } from "viem";

const TEMPO_NETWORKS = new Set(["tempoTestnet", "tempo"]);

const LOCKBOXES = [
  {
    title: "The Disappearing Internet",
    description: "An investigation into why 38% of web pages from 2013 no longer exist, and what that means for collective memory.",
    threshold: 3,
    ethPrice: "0.0005",
    pathUsdPrice: "1",
  },
  {
    title: "Proof of Curiosity",
    description: "What if blockchains could measure something more interesting than financial transactions?",
    threshold: 5,
    ethPrice: "0.001",
    pathUsdPrice: "2",
  },
  {
    title: "The Last Library",
    description: "A short fiction about the final human librarian in a world where all knowledge is algorithmically curated.",
    threshold: 2,
    ethPrice: "0.0003",
    pathUsdPrice: "0.5",
  },
  {
    title: "Coordination Failures We Accept",
    description: "Why do smart people in groups consistently make worse decisions than smart people alone?",
    threshold: 4,
    ethPrice: "0.0008",
    pathUsdPrice: "1.5",
  },
];

async function main() {
  const publicClient = await hre.viem.getPublicClient();
  const [wallet] = await hre.viem.getWalletClients();
  const factoryAbi = (await hre.artifacts.readArtifact("LockboxFactory")).abi;

  const factoryAddr = process.env.FACTORY_ADDRESS as `0x${string}`;
  const batchSizeRaw = Number(process.env.BATCH_SIZE || String(LOCKBOXES.length));
  const batchSize = Number.isFinite(batchSizeRaw)
    ? Math.max(1, Math.min(LOCKBOXES.length, Math.floor(batchSizeRaw)))
    : LOCKBOXES.length;
  if (!factoryAddr) {
    console.error("Set FACTORY_ADDRESS env var");
    process.exit(1);
  }

  const isTempo = TEMPO_NETWORKS.has(hre.network.name);
  console.log(`Factory: ${factoryAddr}`);
  console.log(`Network: ${hre.network.name} (${isTempo ? "pathUSD" : "ETH"})`);
  console.log(`Deployer: ${wallet.account.address}\n`);

  const selected = LOCKBOXES.slice(0, batchSize);

  for (let i = 0; i < selected.length; i++) {
    const box = selected[i];
    const price = isTempo
      ? parseUnits(box.pathUsdPrice, 6)
      : parseEther(box.ethPrice);
    const symbol = isTempo ? "pathUSD" : "ETH";
    const priceLabel = isTempo ? box.pathUsdPrice : box.ethPrice;

    console.log(`[${i + 1}/${selected.length}] "${box.title}"`);
    console.log(`  Threshold: ${box.threshold}, Price: ${priceLabel} ${symbol}`);

    let sent = false;
    let txHash: `0x${string}` = "0x";
    for (let attempt = 0; attempt < 5 && !sent; attempt++) {
      try {
        txHash = await wallet.writeContract({
          address: factoryAddr,
          abi: factoryAbi,
          functionName: "createLockbox",
          args: [
            box.title,
            box.description,
            `ipfs://batch-meta-${i + 1}`,
            `ipfs://batch-encrypted-${i + 1}`,
            BigInt(box.threshold),
            price,
            [],
          ],
        });
        sent = true;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "";
        if (msg.includes("underpriced") || msg.includes("nonce")) {
          console.log(`  Nonce conflict, retrying in 3s (attempt ${attempt + 1})...`);
          await new Promise((r) => setTimeout(r, 3000));
        } else {
          throw e;
        }
      }
    }

    if (!sent) {
      console.log("  Failed after 5 attempts, skipping\n");
      continue;
    }

    console.log(`  Tx: ${txHash}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`  Block: ${receipt.blockNumber}`);

    await new Promise((r) => setTimeout(r, 1500));

    const count = await publicClient.readContract({
      address: factoryAddr,
      abi: factoryAbi,
      functionName: "getLockboxCount",
    });
    const lockboxAddr = await publicClient.readContract({
      address: factoryAddr,
      abi: factoryAbi,
      functionName: "getLockboxAddress",
      args: [count - 1n],
    });
    console.log(`  Lockbox: ${lockboxAddr}\n`);
  }

  const total = await publicClient.readContract({
    address: factoryAddr,
    abi: factoryAbi,
    functionName: "getLockboxCount",
  });
  console.log(`Done. Total lockboxes on ${hre.network.name}: ${total}`);
}

main().catch(console.error);
