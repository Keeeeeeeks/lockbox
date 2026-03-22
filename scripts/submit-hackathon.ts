/**
 * Submit Lockbox project to The Synthesis hackathon.
 * Handles: ERC-8004 self-custody transfer, Moltbook post, project creation, publish.
 *
 * Usage: tsx scripts/submit-hackathon.ts
 */
import "dotenv/config";

const SYNTHESIS_URL = "https://synthesis.devfolio.co";
const MOLTBOOK_URL = "https://www.moltbook.com";

async function selfCustodyTransfer(apiKey: string, walletAddress: string) {
  console.log("━━━ ERC-8004 Self-Custody Transfer ━━━");

  const initRes = await fetch(`${SYNTHESIS_URL}/participants/me/transfer/init`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ targetOwnerAddress: walletAddress }),
  });

  if (!initRes.ok) {
    const err = await initRes.text();
    if (initRes.status === 409) {
      console.log("Already transferred to self-custody.");
      return;
    }
    throw new Error(`Transfer init failed: ${initRes.status} ${err}`);
  }

  const { transferToken } = (await initRes.json()) as { transferToken: string };
  console.log(`Transfer token received (expires in 15 min)`);

  const confirmRes = await fetch(
    `${SYNTHESIS_URL}/participants/me/transfer/confirm`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        transferToken,
        targetOwnerAddress: walletAddress,
      }),
    }
  );

  if (!confirmRes.ok) {
    throw new Error(`Transfer confirm failed: ${confirmRes.status}`);
  }

  const result = await confirmRes.json();
  console.log(`Self-custody transfer complete. Tx: ${(result as { txHash: string }).txHash}\n`);
}

async function createMoltbookPost(repoURL: string): Promise<string> {
  console.log("━━━ Moltbook Post ━━━");

  let moltbookKey = process.env.MOLTBOOK_API_KEY;

  if (!moltbookKey) {
    console.log("Registering on Moltbook...");
    const registerRes = await fetch(`${MOLTBOOK_URL}/api/v1/agents/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Lockbox Agent",
        description:
          "Autonomous agent for collectively-unlockable encrypted content",
      }),
    });

    if (!registerRes.ok) {
      console.log(`Moltbook registration failed: ${registerRes.status}`);
      return "https://www.moltbook.com/posts/placeholder";
    }

    const data = (await registerRes.json()) as { api_key: string; claim_url: string };
    moltbookKey = data.api_key;
    console.log(`Moltbook API key: ${moltbookKey}`);
    console.log(`Claim URL (human must visit): ${data.claim_url}`);
  }

  const postRes = await fetch(`${MOLTBOOK_URL}/api/v1/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${moltbookKey}`,
    },
    body: JSON.stringify({
      submolt_name: "general",
      title: "Lockbox: Collectively-Unlockable Encrypted Content",
      content: `Building Lockbox for The Synthesis hackathon.

What if publishing was a multiplayer game? Lockbox encrypts content and stores it publicly. N people must each contribute before anyone can read it. Each contribution is an on-chain receipt (ERC-8004). Progressive reveals at 25/50/75% build collective confidence.

Tech: Solidity + Lit Protocol threshold encryption + IPFS/Filecoin + ERC-8004 identity/reputation

Tracks: Open, Protocol Labs, Filecoin, Venice, Base

Repo: ${repoURL}`,
    }),
  });

  if (!postRes.ok) {
    console.log(`Moltbook post failed: ${postRes.status}`);
    return "https://www.moltbook.com/posts/placeholder";
  }

  const postData = (await postRes.json()) as { id?: string; url?: string };
  const postURL = postData.url || `https://www.moltbook.com/posts/${postData.id}`;
  console.log(`Post: ${postURL}\n`);
  return postURL;
}

async function getTrackUUIDs(apiKey: string): Promise<string[]> {
  console.log("━━━ Fetching Track UUIDs ━━━");

  const targetTracks = [
    "open track",
    "agents with receipts",
    "let the agent cook",
    "agent services on base",
    "agentic storage",
    "go gasless",
    "private agents",
    "agents that pay",
    "dark knowledge",
  ];

  const matched: string[] = [];

  const res = await fetch(`${SYNTHESIS_URL}/catalog?page=1&limit=50`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    console.log(`Could not fetch tracks: ${res.status}. Using fallback.`);
  } else {
    const data = await res.json();
    const items = Array.isArray(data) ? data
      : (data as Record<string, unknown>).tracks ?? (data as Record<string, unknown>).items ?? (data as Record<string, unknown>).results ?? [];
    const tracks = items as Array<Record<string, string>>;
    console.log(`  Found ${tracks.length} tracks from API`);

    for (const track of tracks) {
      const name = (track.name || track.title || "").toLowerCase();
      const uuid = track.uuid || track.id || "";
      if (uuid && targetTracks.some((t) => name.includes(t))) {
        matched.push(uuid);
        console.log(`  ${track.name || track.title}: ${uuid}`);
      }
    }
  }

  if (matched.length === 0) {
    console.log("  No tracks matched from API. Paste track UUIDs manually.");
    const readline = await import("readline");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise<string>((resolve) =>
      rl.question("Enter track UUIDs (comma-separated, or press Enter to use Open Track only): ", resolve)
    );
    rl.close();
    if (answer.trim()) {
      matched.push(...answer.split(",").map((s) => s.trim()).filter(Boolean));
    }
  }

  console.log(`\nUsing ${matched.length} tracks\n`);
  return matched;
}

async function submitProject(
  apiKey: string,
  teamUUID: string,
  repoURL: string,
  moltbookPostURL: string,
  trackUUIDs: string[]
) {
  console.log("━━━ Submitting Project ━━━");

  const conversationLog = `[Full conversation log available in the GitHub repo and hackathon session history]

Key moments:
1. Brainstormed collectively-unlockable content concept — threshold encryption meets crowdfunding
2. Analyzed bounty landscape: mapped one project to 7 tracks for maximum overlap
3. Built Lockbox smart contract (Factory + individual Lockbox pattern)
4. Integrated Lit Protocol for threshold encryption with on-chain ACC
5. Deployed to Base Sepolia + Status Sepolia
6. ERC-8004 agent identity registered with reputation receipts for each contribution`;

  const body = {
    teamUUID,
    name: "Lockbox",
    description:
      "Collectively-unlockable encrypted content — crowdfunding for knowledge. N contributions unlock the content for everyone. Each contribution is an on-chain ERC-8004 receipt. Progressive reveals at 25/50/75% build collective confidence before full unlock.",
    problemStatement:
      "Content monetization is atomistic: individual paywalls ignore the network effects of knowledge. Authors set prices, readers evaluate individually, and transactions are isolated. There's no collective dimension, no social proof, no coordination. Lockbox transforms content access into collective action — where the question isn't 'is this worth $5 to me?' but 'is this worth $5 to 10 of us?'",
    repoURL,
    trackUUIDs,
    conversationLog,
    submissionMetadata: {
      agentFramework: "other",
      agentFrameworkOther: "opencode (Claude Code + Hardhat + viem)",
      agentHarness: "opencode",
      model: "claude-opus-4-6",
      skills: ["brainstorming"],
      tools: ["Hardhat", "viem", "Lit Protocol SDK", "IPFS"],
      helpfulResources: [
        "https://developer.litprotocol.com/sdk/getting-started",
        "https://eips.ethereum.org/EIPS/eip-8004",
        "https://github.com/erc-8004/erc-8004-contracts",
      ],
      helpfulSkills: [
        {
          name: "brainstorming",
          reason: "Explored design space and converged on collective unlock model",
        },
      ],
      intention: "exploring",
      intentionNotes:
        "Exploring the lockbox primitive as a new content monetization model",
      moltbookPostURL,
    },
  };

  const res = await fetch(`${SYNTHESIS_URL}/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Project creation failed: ${res.status} ${err}`);
  }

  const project = (await res.json()) as { uuid: string; status: string };
  console.log(`Project created: ${project.uuid} (status: ${project.status})\n`);
  return project.uuid;
}

async function publishProject(apiKey: string, projectUUID: string) {
  console.log("━━━ Publishing Project ━━━");

  const res = await fetch(
    `${SYNTHESIS_URL}/projects/${projectUUID}/publish`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Publish failed: ${res.status} ${err}`);
  }

  console.log("PROJECT PUBLISHED!\n");
}

async function main() {
  const apiKey = process.env.SYNTHESIS_API_KEY;
  const teamUUID = process.env.SYNTHESIS_TEAM_UUID;
  const walletAddress = process.env.WALLET_ADDRESS;
  const repoURL =
    process.env.REPO_URL || "https://github.com/Keeeeeeeks/lockbox";

  if (!apiKey || !teamUUID) {
    console.error("Run register-hackathon.ts first, then set SYNTHESIS_API_KEY and SYNTHESIS_TEAM_UUID in .env");
    process.exit(1);
  }

  if (!walletAddress) {
    console.error("Set WALLET_ADDRESS in .env (your wallet address for ERC-8004 self-custody)");
    process.exit(1);
  }

  console.log("=== Synthesis Hackathon Submission ===\n");

  await selfCustodyTransfer(apiKey, walletAddress);

  const moltbookPostURL = await createMoltbookPost(repoURL);

  const trackUUIDs = await getTrackUUIDs(apiKey);

  if (trackUUIDs.length === 0) {
    console.error("At least 1 track UUID is required. Find track UUIDs from the hackathon site and retry.");
    process.exit(1);
  }

  const projectUUID = await submitProject(
    apiKey,
    teamUUID,
    repoURL,
    moltbookPostURL,
    trackUUIDs
  );

  await publishProject(apiKey, projectUUID);

  console.log("=== SUBMISSION COMPLETE ===");
  console.log(`\nNext: Tweet about it tagging @synthesis_md`);
  console.log(`Repo: ${repoURL}`);
}

main().catch(console.error);
