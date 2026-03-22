import { Mppx, tempo } from "mppx/client";
import { privateKeyToAccount } from "viem/accounts";
import "dotenv/config";

const SERVER_URL = process.env.MPP_SERVER_URL || "http://localhost:4402";
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;

if (!PRIVATE_KEY) {
  console.error("Set PRIVATE_KEY in .env");
  process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY);

const mppx = Mppx.create({
  methods: [
    tempo.charge({
      account,
      testnet: true,
    }),
  ],
  polyfill: false,
});

async function main() {
  console.log("=== Lockbox MPP Client ===");
  console.log(`Server: ${SERVER_URL}`);
  console.log(`Payer:  ${account.address}\n`);

  console.log("--- Step 1: Free metadata ---");
  const metadataRes = await fetch(`${SERVER_URL}/metadata`);
  const metadata = await metadataRes.json();
  console.log(`Title:    ${metadata.title}`);
  console.log(`Sections: ${metadata.sections?.length || 0}`);
  console.log(`Price:    ${metadata.price}`);
  console.log(`Network:  ${metadata.network}\n`);

  console.log("--- Step 2: Request content (triggers 402) ---");
  const probeRes = await fetch(`${SERVER_URL}/content`);
  console.log(`Status: ${probeRes.status}`);

  if (probeRes.status === 402) {
    const wwwAuth = probeRes.headers.get("WWW-Authenticate");
    console.log(`WWW-Authenticate: ${wwwAuth?.substring(0, 80)}...`);
    console.log("Payment required! Paying via MPP...\n");
  }

  console.log("--- Step 3: Pay + fetch content ---");
  try {
    const contentRes = await mppx.fetch(`${SERVER_URL}/content`);

    if (contentRes.status === 200) {
      const receipt = contentRes.headers.get("Payment-Receipt");
      const data = await contentRes.json();

      console.log("Payment successful!");
      console.log(`Payment-Receipt: ${receipt?.substring(0, 60)}...`);
      console.log(`Accessed at: ${data.accessedAt}`);
      console.log(`Paid via: ${data.paidVia}\n`);
      console.log("--- Content Preview ---");
      console.log(data.content.substring(0, 500) + "...\n");
      console.log("--- Full content received ---");
      console.log(`Total length: ${data.content.length} characters`);
    } else {
      console.log(`Unexpected status: ${contentRes.status}`);
      console.log(await contentRes.text());
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.log(`Payment failed: ${errMsg}`);
    console.log("Make sure the server is running and wallet is funded on Tempo testnet.");
    console.log("Fund with: curl -X POST https://rpc.moderato.tempo.xyz -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"method\":\"tempo_fundAddress\",\"params\":[\"" + account.address + "\"],\"id\":1}'");
  }
}

main().catch(console.error);
