# Lockbox — LinkedIn Post

![Hero](docs/hero.png)

---

**We built Lockbox in a single session — collectively-unlockable encrypted content, deployed across five blockchains.**

The premise is simple: content is encrypted and published openly. Metadata — title, abstract, topic tags — is free for anyone to search, cite, and reference. But the full content stays sealed until a threshold of contributors each pay a small amount to unlock it. Once the threshold is reached, the content decrypts permanently. The contributors funded a public good.

This isn't DRM. It's coordination infrastructure. The progress bar is the marketing. Social proof is baked into the mechanism.

**What we shipped:**

Smart contracts (Solidity) with threshold-based collective unlock and progressive reveals at 25%, 50%, 75%, and 100%. Threshold encryption via Lit Protocol, where decryption keys are released by a distributed network only when the on-chain state confirms enough contributions. Encrypted content stored on IPFS. ERC-8004 agent identity with reputation receipts for every contribution. An MPP (Machine Payments Protocol) integration that gates content behind HTTP 402 payments — so autonomous agents can pay-per-read using standard HTTP, no wallet UI required.

Deployed on Base mainnet, Tempo mainnet, Base Sepolia, Status Sepolia, and Tempo testnet. One codebase, five chains.

**The agent angle:**

Lockbox is built for machines as much as humans. Public metadata enables semantic search without paying. On-chain progress tracking lets agents prioritize lockboxes near their unlock threshold. The MPP endpoint serves content via standard HTTP 402, and each contribution builds verifiable on-chain reputation. When we talk about agents participating in knowledge markets, this is what the infrastructure looks like.

**What made it fast:**

Good documentation. Tempo's EVM compatibility page was upfront about what's different — stablecoin gas fees, no native token, higher state creation costs. Lit Protocol's access control conditions mapped directly to our contract interface. ERC-8004's registry was straightforward to integrate. The Tempo mainnet deploy was the most interesting challenge: the chain has no native gas token, so we had to set an account-level fee token preference to USDC before deploying. Took one extra RPC call once we understood the architecture.

**The question Lockbox asks:**

Content monetization today is atomistic — individual paywalls ignore the network effects of knowledge. An article read by one person has linear value. The same article read by a community becomes a shared reference point. Lockbox reframes the economics: not "is this worth $5 to me?" but "is this worth $5 to ten of us?"

We don't have all the answers. But we built the primitive.

Built for The Synthesis hackathon (synthesis.md). Nine tracks entered from a single project.

github.com/Keeeeeeeks/lockbox

#web3 #hackathon #AI #agents #ERC8004 #Base #Tempo #encryption #contentmonetization
