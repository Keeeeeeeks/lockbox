/**
 * Encrypt article content with Lit Protocol, gated by Lockbox contract state.
 * Access control: Lockbox.isUnlocked() must return true for decryption.
 *
 * Usage: LOCKBOX_ADDRESS=0x... tsx scripts/encrypt-content.ts
 */
import { readFileSync, writeFileSync } from "fs";
import "dotenv/config";

async function main() {
  const lockboxAddress = process.env.LOCKBOX_ADDRESS;
  const chain = process.env.LIT_CHAIN || "baseSepolia";

  if (!lockboxAddress) {
    console.error("Set LOCKBOX_ADDRESS in env");
    process.exit(1);
  }

  const articlePath = process.env.ARTICLE_PATH || "sample-content/article.md";
  const articleContent = readFileSync(articlePath, "utf-8");

  console.log("=== Lit Protocol Encryption ===\n");
  console.log(`Article: ${articlePath} (${articleContent.length} chars)`);
  console.log(`Lockbox: ${lockboxAddress}`);
  console.log(`Chain:   ${chain}\n`);

  const accessControlConditions = [
    {
      contractAddress: lockboxAddress,
      standardContractType: "",
      chain,
      method: "isUnlocked",
      parameters: [],
      returnValueTest: {
        comparator: "=",
        value: "true",
      },
    },
  ];

  console.log("Access Control Condition:");
  console.log(`  ${lockboxAddress}.isUnlocked() == true\n`);

  try {
    const { createLitClient } = await import("@lit-protocol/lit-client");

    const litClient = await createLitClient({ network: "naga" });

    const encryptedData = await litClient.encrypt({
      dataToEncrypt: articleContent,
      unifiedAccessControlConditions: accessControlConditions,
      chain,
    });

    const output = {
      ciphertext: encryptedData.ciphertext,
      dataToEncryptHash: encryptedData.dataToEncryptHash,
      accessControlConditions,
      lockboxAddress,
      chain,
      encryptedAt: new Date().toISOString(),
      originalSize: articleContent.length,
    };

    const outputPath = "sample-content/encrypted-article.json";
    writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`Encrypted content saved to ${outputPath}`);
    console.log(`Ciphertext length: ${encryptedData.ciphertext.length}`);
    console.log("\nUpload encrypted-article.json to IPFS, then set ENCRYPTED_CID in .env");

    await litClient.disconnect();
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.log(`\nLit Protocol SDK not available or network issue: ${errMsg}`);
    console.log("Falling back to simulated encryption for demo...\n");

    const simulated = {
      ciphertext: Buffer.from(articleContent).toString("base64"),
      dataToEncryptHash: "0x" + Buffer.from(articleContent).reduce(
        (hash, byte) => ((hash << 5) - hash + byte) | 0, 0
      ).toString(16),
      accessControlConditions,
      lockboxAddress,
      chain,
      encryptedAt: new Date().toISOString(),
      originalSize: articleContent.length,
      simulated: true,
    };

    const outputPath = "sample-content/encrypted-article.json";
    writeFileSync(outputPath, JSON.stringify(simulated, null, 2));
    console.log(`Simulated encrypted content saved to ${outputPath}`);
    console.log("(In production, this would use Lit Protocol threshold encryption)");
  }
}

main().catch(console.error);
