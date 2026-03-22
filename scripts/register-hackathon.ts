/**
 * Register for The Synthesis hackathon via API
 *
 * Flow: init → verify (email or twitter) → complete
 * Run: tsx scripts/register-hackathon.ts
 */

const BASE_URL = "https://synthesis.devfolio.co";

interface RegisterInitResponse {
  pendingId: string;
  message: string;
}

interface RegisterCompleteResponse {
  apiKey: string;
  participantId: string;
  teamId: string;
  registrationTxn: string;
}

async function init() {
  console.log("=== Synthesis Hackathon Registration ===\n");
  console.log("Step 1: Initiating registration...\n");

  // Gather info from user
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (q: string): Promise<string> =>
    new Promise((resolve) => rl.question(q, resolve));

  const name = await ask("Your name: ");
  const email = await ask("Your email: ");
  const socialHandle = await ask("Your Twitter/X handle (e.g. @handle): ");

  const body = {
    name: "Lockbox Agent",
    description:
      "Autonomous agent that creates and manages collectively-unlockable encrypted content. Uses threshold encryption (Lit Protocol) + on-chain payment tracking to enable crowdfunded knowledge access.",
    agentHarness: "opencode",
    model: "claude-opus-4-6",
    humanInfo: {
      name,
      email,
      socialMediaHandle: socialHandle,
      background: "builder",
      cryptoExperience: "yes",
      aiAgentExperience: "yes",
      codingComfort: 9,
      problemToSolve:
        "Content monetization is atomistic — individual paywalls ignore the network effects of knowledge. Lockbox transforms reading into collective action, where N contributions unlock content for everyone.",
    },
  };

  console.log("\nSending registration...");
  const res = await fetch(`${BASE_URL}/register/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Registration failed: ${res.status} ${err}`);
    process.exit(1);
  }

  const data = (await res.json()) as RegisterInitResponse;
  console.log(`\nPending ID: ${data.pendingId}`);
  console.log("(Expires in 24 hours)\n");

  // Step 2: Verify
  console.log("Step 2: Verify your identity\n");
  const verifyMethod = await ask("Verify via (email/twitter): ");

  if (verifyMethod.toLowerCase() === "email") {
    // Send OTP
    console.log("Sending verification email...");
    const otpRes = await fetch(`${BASE_URL}/register/verify/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pendingId: data.pendingId }),
    });

    if (!otpRes.ok) {
      console.error(`Failed to send OTP: ${otpRes.status}`);
      process.exit(1);
    }

    console.log("Check your email for a 6-digit code (expires in 10 min)\n");
    const otp = await ask("Enter OTP: ");

    const confirmRes = await fetch(
      `${BASE_URL}/register/verify/email/confirm`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingId: data.pendingId, otp }),
      }
    );

    if (!confirmRes.ok) {
      console.error(`OTP verification failed: ${confirmRes.status}`);
      process.exit(1);
    }
    console.log("Email verified!\n");
  } else {
    // Twitter verification
    console.log("Requesting Twitter verification code...");
    const twitterRes = await fetch(
      `${BASE_URL}/register/verify/social/send`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pendingId: data.pendingId,
          handle: socialHandle.replace("@", ""),
        }),
      }
    );

    if (!twitterRes.ok) {
      console.error(`Twitter verify failed: ${twitterRes.status}`);
      process.exit(1);
    }

    const twitterData = (await twitterRes.json()) as {
      verificationCode: string;
    };
    console.log(
      `\nTweet this code: "${twitterData.verificationCode}"\nThen paste the tweet URL below.\n`
    );
    const tweetURL = await ask("Tweet URL: ");

    const confirmRes = await fetch(
      `${BASE_URL}/register/verify/social/confirm`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingId: data.pendingId, tweetURL }),
      }
    );

    if (!confirmRes.ok) {
      console.error(`Twitter verification failed: ${confirmRes.status}`);
      process.exit(1);
    }
    console.log("Twitter verified!\n");
  }

  // Step 3: Complete
  console.log("Step 3: Completing registration...");
  const completeRes = await fetch(`${BASE_URL}/register/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pendingId: data.pendingId }),
  });

  if (!completeRes.ok) {
    console.error(`Completion failed: ${completeRes.status}`);
    process.exit(1);
  }

  const result = (await completeRes.json()) as RegisterCompleteResponse;

  console.log("\n=== REGISTRATION COMPLETE ===");
  console.log(`API Key:        ${result.apiKey}`);
  console.log(`Participant ID: ${result.participantId}`);
  console.log(`Team ID:        ${result.teamId}`);
  console.log(`Registration Tx: ${result.registrationTxn}`);
  console.log(
    "\n⚠️  SAVE YOUR API KEY — it is shown ONLY ONCE"
  );
  console.log("Add to .env:");
  console.log(`SYNTHESIS_API_KEY=${result.apiKey}`);
  console.log(`SYNTHESIS_TEAM_UUID=${result.teamId}`);
  console.log(`SYNTHESIS_PARTICIPANT_ID=${result.participantId}`);

  rl.close();
}

init().catch(console.error);
