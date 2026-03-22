import { expect } from "chai";
import hre from "hardhat";
import { parseEther } from "viem";

describe("Lockbox", function () {
  async function deployFixture() {
    const [author, c1, c2, c3, outsider] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    const factory = await hre.viem.deployContract("LockboxFactory");

    const threshold = 3n;
    const price = parseEther("0.001");

    await factory.write.createLockbox([
      "Test Article",
      "A test lockbox",
      "ipfs://metadata",
      "ipfs://encrypted",
      threshold,
      price,
      [],
    ]);

    const lockboxAddress = await factory.read.getLockboxAddress([0n]);
    const lockboxAbi = (await hre.artifacts.readArtifact("Lockbox")).abi;

    return { factory, lockboxAddress, lockboxAbi, author, c1, c2, c3, outsider, publicClient, price, threshold };
  }

  it("creates lockbox with correct metadata", async function () {
    const { lockboxAddress, lockboxAbi, publicClient, threshold } = await deployFixture();

    const title = await publicClient.readContract({ address: lockboxAddress, abi: lockboxAbi, functionName: "title" });
    const [current, total, unlocked] = await publicClient.readContract({ address: lockboxAddress, abi: lockboxAbi, functionName: "getProgress" });

    expect(title).to.equal("Test Article");
    expect(current).to.equal(0n);
    expect(total).to.equal(threshold);
    expect(unlocked).to.equal(false);
  });

  it("accepts contributions and tracks progress", async function () {
    const { lockboxAddress, lockboxAbi, publicClient, c1, price } = await deployFixture();

    await c1.writeContract({ address: lockboxAddress, abi: lockboxAbi, functionName: "contribute", value: price });

    const [current] = await publicClient.readContract({ address: lockboxAddress, abi: lockboxAbi, functionName: "getProgress" });
    expect(current).to.equal(1n);
  });

  it("rejects duplicate contributions", async function () {
    const { lockboxAddress, lockboxAbi, c1, price } = await deployFixture();

    await c1.writeContract({ address: lockboxAddress, abi: lockboxAbi, functionName: "contribute", value: price });

    let reverted = false;
    try {
      await c1.writeContract({ address: lockboxAddress, abi: lockboxAbi, functionName: "contribute", value: price });
    } catch {
      reverted = true;
    }
    expect(reverted).to.equal(true);
  });

  it("unlocks at threshold and allows withdrawal", async function () {
    const { lockboxAddress, lockboxAbi, publicClient, author, c1, c2, c3, price } = await deployFixture();

    await c1.writeContract({ address: lockboxAddress, abi: lockboxAbi, functionName: "contribute", value: price });
    await c2.writeContract({ address: lockboxAddress, abi: lockboxAbi, functionName: "contribute", value: price });
    await c3.writeContract({ address: lockboxAddress, abi: lockboxAbi, functionName: "contribute", value: price });

    const [, , unlocked] = await publicClient.readContract({ address: lockboxAddress, abi: lockboxAbi, functionName: "getProgress" });
    expect(unlocked).to.equal(true);

    const isUnlocked = await publicClient.readContract({ address: lockboxAddress, abi: lockboxAbi, functionName: "isUnlocked" });
    expect(isUnlocked).to.equal(true);

    await author.writeContract({ address: lockboxAddress, abi: lockboxAbi, functionName: "withdraw" });

    const balance = await publicClient.getBalance({ address: lockboxAddress });
    expect(balance).to.equal(0n);
  });

  it("tracks reveal levels correctly", async function () {
    const { lockboxAddress, lockboxAbi, publicClient, c1, c2, c3, price } = await deployFixture();

    let level = await publicClient.readContract({ address: lockboxAddress, abi: lockboxAbi, functionName: "getRevealLevel" });
    expect(level).to.equal(0);

    await c1.writeContract({ address: lockboxAddress, abi: lockboxAbi, functionName: "contribute", value: price });
    level = await publicClient.readContract({ address: lockboxAddress, abi: lockboxAbi, functionName: "getRevealLevel" });
    expect(level).to.equal(1);

    await c2.writeContract({ address: lockboxAddress, abi: lockboxAbi, functionName: "contribute", value: price });
    level = await publicClient.readContract({ address: lockboxAddress, abi: lockboxAbi, functionName: "getRevealLevel" });
    expect(level).to.equal(2);

    await c3.writeContract({ address: lockboxAddress, abi: lockboxAbi, functionName: "contribute", value: price });
    level = await publicClient.readContract({ address: lockboxAddress, abi: lockboxAbi, functionName: "getRevealLevel" });
    expect(level).to.equal(4);
  });

  it("prevents withdrawal before unlock", async function () {
    const { lockboxAddress, lockboxAbi, author } = await deployFixture();

    let reverted = false;
    try {
      await author.writeContract({ address: lockboxAddress, abi: lockboxAbi, functionName: "withdraw" });
    } catch {
      reverted = true;
    }
    expect(reverted).to.equal(true);
  });

  it("prevents non-author withdrawal", async function () {
    const { lockboxAddress, lockboxAbi, c1, c2, c3, outsider, price } = await deployFixture();

    await c1.writeContract({ address: lockboxAddress, abi: lockboxAbi, functionName: "contribute", value: price });
    await c2.writeContract({ address: lockboxAddress, abi: lockboxAbi, functionName: "contribute", value: price });
    await c3.writeContract({ address: lockboxAddress, abi: lockboxAbi, functionName: "contribute", value: price });

    let reverted = false;
    try {
      await outsider.writeContract({ address: lockboxAddress, abi: lockboxAbi, functionName: "withdraw" });
    } catch {
      reverted = true;
    }
    expect(reverted).to.equal(true);
  });

  it("factory tracks lockboxes per author", async function () {
    const { factory, author } = await deployFixture();

    const authorLockboxes = await factory.read.getAuthorLockboxes([author.account.address]);
    expect(authorLockboxes.length).to.equal(1);
    expect(authorLockboxes[0]).to.equal(0n);
  });
});
