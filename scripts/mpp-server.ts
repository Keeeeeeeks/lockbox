import * as http from "node:http";
import { readFileSync } from "node:fs";
import { Mppx, tempo } from "mppx/server";
import "dotenv/config";

const PORT = Number(process.env.MPP_PORT) || 4402;
const RECIPIENT = process.env.WALLET_ADDRESS || "0x3D2f1015D63C1fB4bC8F36c009E3D95B1D6C9d8c";
const SECRET_KEY = process.env.MPP_SECRET_KEY || "lockbox-hackathon-secret-key-2026";

const PATHUSD_TESTNET = "0x20c0000000000000000000000000000000000000";

const mppx = Mppx.create({
  methods: [
    tempo.charge({
      currency: PATHUSD_TESTNET,
      recipient: RECIPIENT as `0x${string}`,
      testnet: true,
    }),
  ],
  secretKey: SECRET_KEY,
  realm: "lockbox.local",
});

let articleContent: string;
try {
  articleContent = readFileSync("sample-content/article.md", "utf-8");
} catch {
  articleContent = "# Lockbox Content\n\nThis is the unlocked content.";
}

const lockboxMetadata = {
  title: "The Collective Intelligence Paradox",
  description: "What if the most valuable knowledge could only be accessed through coordination?",
  author: RECIPIENT,
  sections: ["The Problem with Paywalls", "The Lockbox Primitive", "Mechanism Design", "The Cryptographic Foundation"],
  wordCount: articleContent.split(/\s+/).length,
  price: "0.01 pathUSD",
  protocol: "MPP (Machine Payments Protocol)",
  network: "Tempo Testnet (Moderato)",
};

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Expose-Headers", "WWW-Authenticate, Payment-Receipt");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/" || req.url === "/metadata") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(lockboxMetadata, null, 2));
    return;
  }

  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", protocol: "MPP", network: "tempo-testnet" }));
    return;
  }

  if (req.url === "/content") {
    const result = await Mppx.toNodeListener(
      mppx.charge({
        amount: "0.01",
        description: "Read 'The Collective Intelligence Paradox' via Lockbox",
      }),
    )(req, res);

    if (result.status === 402) return;

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      content: articleContent,
      metadata: lockboxMetadata,
      accessedAt: new Date().toISOString(),
      paidVia: "MPP/Tempo",
    }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    error: "Not found",
    routes: {
      "/": "Public metadata (free)",
      "/content": "Full article (0.01 pathUSD via MPP)",
      "/health": "Server status",
    },
  }));
});

server.listen(PORT, () => {
  console.log(`\n=== Lockbox MPP Server ===`);
  console.log(`Listening on http://localhost:${PORT}`);
  console.log(`\nRoutes:`);
  console.log(`  GET /           Free metadata`);
  console.log(`  GET /content    Full article (0.01 pathUSD via MPP 402 flow)`);
  console.log(`  GET /health     Server status`);
  console.log(`\nPayment config:`);
  console.log(`  Network:    Tempo Testnet (Moderato)`);
  console.log(`  Currency:   pathUSD (${PATHUSD_TESTNET})`);
  console.log(`  Recipient:  ${RECIPIENT}`);
  console.log(`  Price:      0.01 pathUSD per read`);
  console.log(`\nTest with:`);
  console.log(`  curl http://localhost:${PORT}/             # Free metadata`);
  console.log(`  curl http://localhost:${PORT}/content      # 402 Payment Required`);
  console.log(`  tsx scripts/mpp-client.ts                  # Pay + read`);
});
