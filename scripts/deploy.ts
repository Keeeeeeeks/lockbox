import hre from "hardhat";
import { parseEther } from "viem";

async function main() {
  const publicClient = await hre.viem.getPublicClient();

  console.log("Deploying LockboxFactory...\n");

  const factory = await hre.viem.deployContract("LockboxFactory");
  console.log(`LockboxFactory deployed to: ${factory.address}`);

  const title = "The Collective Intelligence Paradox";
  const description =
    "What if the most valuable knowledge could only be accessed through coordination?";
  const metadataURI = process.env.METADATA_CID || "ipfs://placeholder-metadata";
  const encryptedContentCID = process.env.ENCRYPTED_CID || "ipfs://placeholder-encrypted";
  const threshold = 5n;
  const contributionAmount = parseEther("0.001");
  const teaserCIDs: string[] = [];

  console.log("\nCreating sample Lockbox...");
  const txHash = await factory.write.createLockbox([
    title,
    description,
    metadataURI,
    encryptedContentCID,
    threshold,
    contributionAmount,
    teaserCIDs,
  ]);

  console.log(`Transaction hash: ${txHash}`);
  console.log("Waiting for confirmation...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log(`Confirmed in block ${receipt.blockNumber}`);

  const lockboxCount = await factory.read.getLockboxCount();
  const lastIndex = lockboxCount > 0n ? lockboxCount - 1n : 0n;
  const lockboxAddress = await factory.read.getLockboxAddress([lastIndex]);
  console.log(`\nLockbox #0 deployed to: ${lockboxAddress}`);

  console.log("\n=== Deployment Summary ===");
  console.log(`Factory:  ${factory.address}`);
  console.log(`Lockbox:  ${lockboxAddress}`);
  console.log(`Threshold: ${threshold} contributions`);
  console.log(`Price:    0.001 ETH per contribution`);
  console.log(`Network:  ${hre.network.name}`);

  const deploymentInfo = {
    network: hre.network.name,
    factory: factory.address,
    lockbox: lockboxAddress,
    threshold: Number(threshold),
    contributionAmount: "0.001",
    deployedAt: new Date().toISOString(),
  };

  const fs = await import("fs");
  fs.writeFileSync(
    `deployment-${hre.network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`\nDeployment info saved to deployment-${hre.network.name}.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
