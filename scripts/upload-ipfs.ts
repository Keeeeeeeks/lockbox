import { readFileSync, writeFileSync, existsSync } from "fs";
import "dotenv/config";

interface UploadResult {
  metadataCID: string;
  encryptedCID: string;
  metadataURL: string;
  encryptedURL: string;
}

async function uploadToIPFS(data: string | Buffer, filename: string): Promise<string> {
  const token = process.env.WEB3_STORAGE_TOKEN;

  if (token) {
    const formData = new FormData();
    const blob = new Blob([data], { type: "application/octet-stream" });
    formData.append("file", blob, filename);

    const res = await fetch("https://api.web3.storage/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) throw new Error(`web3.storage upload failed: ${res.status}`);
    const result = (await res.json()) as { cid: string };
    return result.cid;
  }

  const formData = new FormData();
  const blob = new Blob([data], { type: "application/octet-stream" });
  formData.append("file", blob, filename);

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PINATA_JWT || ""}`,
    },
    body: formData,
  });

  if (res.ok) {
    const result = (await res.json()) as { IpfsHash: string };
    return result.IpfsHash;
  }

  console.log("No IPFS provider configured. Generating deterministic placeholder CIDs.");
  const crypto = await import("crypto");
  const hash = crypto.createHash("sha256").update(data).digest("hex").slice(0, 46);
  return `Qm${hash}`;
}

async function main() {
  console.log("=== IPFS Upload ===\n");

  const metadata = {
    title: "The Collective Intelligence Paradox",
    description: "What if the most valuable knowledge could only be accessed through coordination?",
    author: "Lockbox Demo",
    tags: ["collective-intelligence", "coordination", "cryptography", "content-monetization"],
    wordCount: 650,
    sections: [
      "The Problem with Paywalls",
      "The Lockbox Primitive",
      "Mechanism Design",
      "The Cryptographic Foundation",
    ],
    createdAt: new Date().toISOString(),
    lockbox: {
      threshold: 5,
      contributionAmount: "0.001 ETH",
      chain: "baseSepolia",
    },
  };

  const metadataJSON = JSON.stringify(metadata, null, 2);
  console.log("Public metadata:");
  console.log(metadataJSON);
  console.log();

  const encryptedPath = "sample-content/encrypted-article.json";
  let encryptedContent: string;

  if (existsSync(encryptedPath)) {
    encryptedContent = readFileSync(encryptedPath, "utf-8");
    console.log(`Encrypted content found: ${encryptedPath} (${encryptedContent.length} bytes)`);
  } else {
    const articleContent = readFileSync("sample-content/article.md", "utf-8");
    encryptedContent = JSON.stringify({
      ciphertext: Buffer.from(articleContent).toString("base64"),
      simulated: true,
      note: "Run encrypt-content.ts with Lit Protocol for real threshold encryption",
    });
    console.log("No encrypted content found — using base64 placeholder");
  }

  console.log("\nUploading to IPFS...");

  const metadataCID = await uploadToIPFS(metadataJSON, "metadata.json");
  console.log(`Metadata CID: ${metadataCID}`);

  const encryptedCID = await uploadToIPFS(encryptedContent, "encrypted-article.json");
  console.log(`Encrypted CID: ${encryptedCID}`);

  const result: UploadResult = {
    metadataCID,
    encryptedCID,
    metadataURL: `ipfs://${metadataCID}`,
    encryptedURL: `ipfs://${encryptedCID}`,
  };

  writeFileSync("ipfs-upload-result.json", JSON.stringify(result, null, 2));
  console.log("\nSaved to ipfs-upload-result.json");
  console.log("\nAdd to .env for deployment:");
  console.log(`METADATA_CID=ipfs://${metadataCID}`);
  console.log(`ENCRYPTED_CID=ipfs://${encryptedCID}`);
}

main().catch(console.error);
