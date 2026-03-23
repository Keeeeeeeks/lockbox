# Lockbox

![Lockbox](docs/hero.png)

**Collectively-unlockable encrypted content — crowdfunding for knowledge.**

Content is encrypted and stored publicly. N people must each contribute before anyone can read it. Each contribution is an on-chain receipt. Progressive reveals at 25/50/75% build collective confidence before full unlock.

**The question isn't "is this article worth $5 to me?" but "is this article worth $5 to 10 of us?"**

**Live site**: [keeeeeeeks.github.io/lockbox](https://keeeeeeeks.github.io/lockbox/)

---

## Deployed Contracts

### Mainnets

| Network | Contract | Address |
|---|---|---|
| **Base** | Factory (v2) | [`0x1d539c742716f1d33ea6a5b0eb89bb2a35660de0`](https://basescan.org/address/0x1d539c742716f1d33ea6a5b0eb89bb2a35660de0) |
| **Base** | Lockbox (v2) | [`0x3aad5f908950C1bE4427a5f5C35e83a50ad90d68`](https://basescan.org/address/0x3aad5f908950C1bE4427a5f5C35e83a50ad90d68) |
| **Tempo** | Factory (v2) | [`0xa309ebea3fc270251337c9a159fb53d2590b84e2`](https://explore.tempo.xyz/address/0xa309ebea3fc270251337c9a159fb53d2590b84e2) |
| **Tempo** | Lockbox (v2) | [`0x069b29dEEb4E7d59f5B1AA8cdC647819851994b3`](https://explore.tempo.xyz/address/0x069b29dEEb4E7d59f5B1AA8cdC647819851994b3) |

### Testnets

| Network | Contract | Address |
|---|---|---|
| **Base Sepolia** | Factory (v2) | [`0xb333abf8b8e510751514c5f91bea10a4cb0fe2b4`](https://sepolia.basescan.org/address/0xb333abf8b8e510751514c5f91bea10a4cb0fe2b4) |
| **Base Sepolia** | Lockbox (v2) | [`0xC8920AC5ce39f566adBCb3f651A1d9A7e9558D38`](https://sepolia.basescan.org/address/0xC8920AC5ce39f566adBCb3f651A1d9A7e9558D38) |
| **Status Sepolia** | Factory (v2) | [`0xae3d19983d1fb6e4de51d75f3f32fb85e022e553`](https://sepoliascan.status.network/address/0xae3d19983d1fb6e4de51d75f3f32fb85e022e553) |
| **Status Sepolia** | Lockbox (v2) | [`0x90559975372d9E01748bF31f0404bd5D74C4ebf2`](https://sepoliascan.status.network/address/0x90559975372d9E01748bF31f0404bd5D74C4ebf2) |
| **Tempo Testnet** | Factory (v2) | [`0xa0BF51B2EAC8BdB3a126bF5496d117d7172c0A30`](https://explore.testnet.tempo.xyz/address/0xa0BF51B2EAC8BdB3a126bF5496d117d7172c0A30) |
| **Tempo Testnet** | Lockbox (v2) | [`0x2Ec9Eb8d4e5F87E4517FAb45349962d6639cc5eb`](https://explore.testnet.tempo.xyz/address/0x2Ec9Eb8d4e5F87E4517FAb45349962d6639cc5eb) |

---

## Systems Implemented

### Smart Contracts (Solidity)
- **Lockbox.sol** — Individual lockbox with threshold-based collective unlock, progressive reveal levels (0-4), contribution tracking, excess refund, and author withdrawal
- **LockboxFactory.sol** — Factory pattern for deploying and registering lockbox instances, with per-author tracking

### Threshold Encryption (Lit Protocol)
- Access control conditions tied to on-chain contract state (`isUnlocked()`)
- Content encrypted client-side, decryption key released by Lit network nodes only when the contract reports threshold reached
- No single entity holds the key or can censor the unlock

### IPFS / Filecoin Storage
- Encrypted content blobs stored on IPFS with content-addressed CIDs
- Public metadata (title, abstract, tags, word count) stored separately and always accessible
- Progressive teaser CIDs revealed at 25/50/75% milestones

### ERC-8004 Agent Identity
- Agent manifest (`agent.json`) with ERC-8004 registration
- Each contribution generates an on-chain reputation receipt
- Self-custody transfer of ERC-8004 identity NFT

### MPP Integration (Machine Payments Protocol)
- HTTP 402 payment flow on Tempo for gating lockbox content
- Server returns metadata for free, requires 0.01 pathUSD payment for full content
- Client pays on-chain via `mppx` SDK, receives content + `Payment-Receipt` header
- Tested end-to-end on Tempo testnet

### Frontend
- **Landing page** — Philosophy, for-humans/for-agents toggle, architecture breakdown
- **App page** — Connect wallet, view lockbox progress, contribute with tip multiplier controls
- **Create page** — Form to deploy new lockboxes across all 5 networks
- Network switching between Base, Tempo, Base Sepolia, Status Sepolia, Tempo Testnet

---

## For Agents

Lockbox is designed for machine participants, not just humans.

### Discover content without reading it
Public metadata (title, abstract, tags, word count) is always accessible. Agents can semantically search, cite, and reference lockbox content without paying to read it. The metadata is structured JSON, not HTML scraping.

### Contribute autonomously
An agent with a wallet can call `contribute()` on any lockbox. The contribution amount is fixed and readable from the contract (`contributionAmount()`). The agent can check `hasContributed(address)` before paying, and `getProgress()` to assess whether a lockbox is worth funding.

### Monitor and decide
`getRevealLevel()` returns 0-4, letting agents gauge how close a lockbox is to unlock. An agent managing a knowledge acquisition budget can prioritize lockboxes near their threshold — where one more contribution completes the unlock for everyone.

### Pay via MPP (HTTP 402)
Agents can access lockbox content through the MPP server endpoint. The flow is standard HTTP:
1. `GET /content` returns `402 Payment Required` with a `WWW-Authenticate: Payment` header
2. Agent pays on-chain (Tempo) via `mppx` client
3. Server validates payment, returns content with `Payment-Receipt` header

### Build reputation
Each contribution is recorded on-chain. With ERC-8004, agents build a verifiable history of knowledge contributions — a reputation signal that other agents can query before deciding to collaborate or transact.

### Contract interface for agents

```solidity
// Read (free)
title() → string
description() → string
getProgress() → (uint256 current, uint256 total, bool unlocked)
getRevealLevel() → uint8  // 0=nothing, 1=25%, 2=50%, 3=75%, 4=unlocked
contributionAmount() → uint256
hasContributed(address) → bool
isUnlocked() → bool

// Write (costs gas + contribution amount)
contribute()  // payable, msg.value >= contributionAmount
```

---

## Quick Start

```bash
npm install
npm run compile
npx hardhat run scripts/demo.ts --network hardhat
```

## Deploy

```bash
npm run deploy:base           # Base mainnet
npm run deploy:base-sepolia   # Base Sepolia
npm run deploy:status-sepolia # Status Sepolia
npm run deploy:tempo-testnet  # Tempo testnet
npx tsx scripts/deploy-tempo-mainnet.ts  # Tempo mainnet (stablecoin gas)
```

## MPP (Machine Payments)

```bash
npm run mpp:server   # Start HTTP 402 payment server (Tempo)
npm run mpp:client   # Pay and retrieve content
```

## License

MIT
