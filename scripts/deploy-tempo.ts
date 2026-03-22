import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Network: ${hre.network.name}\n`);

  console.log("Deploying LockboxFactory...");
  const Factory = await hre.ethers.getContractFactory("LockboxFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  const factoryAddr = await factory.getAddress();
  console.log(`LockboxFactory: ${factoryAddr}`);

  console.log("\nCreating sample Lockbox...");
  const tx = await factory.createLockbox(
    "The Collective Intelligence Paradox",
    "What if the most valuable knowledge could only be accessed through coordination?",
    "ipfs://placeholder-metadata",
    "ipfs://placeholder-encrypted",
    5,
    hre.ethers.parseEther("0.001"),
    [],
  );
  const receipt = await tx.wait();
  console.log(`Confirmed in block ${receipt?.blockNumber}`);

  const lockboxCount = await factory.getLockboxCount();
  const lockboxAddr = await factory.getLockboxAddress(lockboxCount - 1n);
  console.log(`Lockbox: ${lockboxAddr}`);

  console.log("\n=== Deployment Summary ===");
  console.log(`Factory:  ${factoryAddr}`);
  console.log(`Lockbox:  ${lockboxAddr}`);
  console.log(`Network:  ${hre.network.name}`);

  const fs = await import("fs");
  fs.writeFileSync(
    `deployment-${hre.network.name}.json`,
    JSON.stringify({
      network: hre.network.name,
      factory: factoryAddr,
      lockbox: lockboxAddr,
      threshold: 5,
      contributionAmount: "0.001",
      deployedAt: new Date().toISOString(),
    }, null, 2),
  );
  console.log(`\nSaved to deployment-${hre.network.name}.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
