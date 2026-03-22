import hre from "hardhat";
import { parseEther } from "viem";
import { readFileSync } from "fs";

const ARTICLES = [
  { file: "sample-content/article.md", threshold: 3, price: "0.0002" },
  { file: "sample-content/article-2.md", threshold: 2, price: "0.0002" },
  { file: "sample-content/article-3.md", threshold: 5, price: "0.0002" },
  { file: "sample-content/article-4.md", threshold: 1, price: "0.0002" },
  { file: "sample-content/article-5.md", threshold: 4, price: "0.00025" },
];

function extractMeta(content: string) {
  const lines = content.split("\n").filter(Boolean);
  const title = (lines[0] || "").replace(/^#+\s*/, "").trim();
  let desc = "";
  for (const line of lines.slice(1)) {
    const stripped = line.replace(/^[>#*_\s]+/, "").trim();
    if (stripped.length > 20) { desc = stripped; break; }
  }
  return { title: title || "Untitled", description: desc || title };
}

async function main() {
  const publicClient = await hre.viem.getPublicClient();
  const [wallet] = await hre.viem.getWalletClients();
  const factoryAbi = (await hre.artifacts.readArtifact("LockboxFactory")).abi;

  const factoryAddr = process.env.FACTORY_ADDRESS as `0x${string}`;
  if (!factoryAddr) {
    console.error("Set FACTORY_ADDRESS in env");
    process.exit(1);
  }

  console.log(`Factory: ${factoryAddr}`);
  console.log(`Network: ${hre.network.name}`);
  console.log(`Deployer: ${wallet.account.address}\n`);

  for (let i = 0; i < ARTICLES.length; i++) {
    const { file, threshold, price } = ARTICLES[i];
    let content: string;
    try {
      content = readFileSync(file, "utf-8");
    } catch {
      console.log(`Skipping ${file} (not found)`);
      continue;
    }

    const { title, description } = extractMeta(content);
    const cid = "data:text/plain;base64," + Buffer.from(content).toString("base64").slice(0, 100);

    console.log(`--- Article ${i + 1}: "${title}" ---`);
    console.log(`  Threshold: ${threshold}, Price: ${price} ETH`);

    const nonce = await publicClient.getTransactionCount({ address: wallet.account.address });

    const txHash = await wallet.writeContract({
      address: factoryAddr,
      abi: factoryAbi,
      functionName: "createLockbox",
      args: [title, description, "ipfs://metadata-" + (i + 1), cid, BigInt(threshold), parseEther(price), []],
      nonce,
    });

    console.log(`  Tx: ${txHash}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`  Block: ${receipt.blockNumber}`);

    const count = await publicClient.readContract({
      address: factoryAddr, abi: factoryAbi, functionName: "getLockboxCount",
    });
    const lockboxAddr = await publicClient.readContract({
      address: factoryAddr, abi: factoryAbi, functionName: "getLockboxAddress", args: [count - 1n],
    });
    console.log(`  Lockbox: ${lockboxAddr}\n`);
  }

  const total = await publicClient.readContract({
    address: factoryAddr, abi: factoryAbi, functionName: "getLockboxCount",
  });
  console.log(`\nTotal lockboxes on ${hre.network.name}: ${total}`);
}

main().catch(console.error);
