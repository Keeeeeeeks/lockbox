import hre from "hardhat";

async function main() {
  console.log("Deploying LockboxFactory...\n");

  const factory = await hre.viem.deployContract("LockboxFactory");
  console.log(`LockboxFactory deployed to: ${factory.address}`);

  // Deploy a sample lockbox through the factory
  const title = "The Collective Intelligence Paradox";
  const description =
    "What if the most valuable knowledge could only be accessed through coordination?";
  const metadataURI = process.env.METADATA_CID || "ipfs://placeholder-metadata";
  const encryptedContentCID = process.env.ENCRYPTED_CID || "ipfs://placeholder-encrypted";
  const threshold = 5n; // 5 contributions to unlock
  const contributionAmount = hre.ethers.parseEther("0.001"); // 0.001 ETH per contribution
  const teaserCIDs: string[] = []; // Progressive reveals (can add later)

  console.log("\nCreating sample Lockbox...");
  const tx = await factory.write.createLockbox([
    title,
    description,
    metadataURI,
    encryptedContentCID,
    threshold,
    contributionAmount,
    teaserCIDs,
  ]);

  console.log(`Transaction hash: ${tx}`);

  // Read back the created lockbox
  const lockboxCount = await factory.read.getLockboxCount();
  const lockboxAddress = await factory.read.getLockboxAddress([lockboxCount - 1n]);
  console.log(`\nLockbox #0 deployed to: ${lockboxAddress}`);

  console.log("\n=== Deployment Summary ===");
  console.log(`Factory:  ${factory.address}`);
  console.log(`Lockbox:  ${lockboxAddress}`);
  console.log(`Threshold: ${threshold} contributions`);
  console.log(`Price:    0.001 ETH per contribution`);
  console.log(`Network:  ${hre.network.name}`);

  // Save deployment info
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
