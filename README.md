# Lockbox

**Collectively-unlockable encrypted content — crowdfunding for knowledge.**

Content is encrypted and stored publicly. N people must each contribute before anyone can read it. Each contribution is an on-chain receipt. Progressive reveals at 25/50/75% build collective confidence before full unlock.

## How It Works

```
Author encrypts article → stores on IPFS → deploys Lockbox contract
                                                    ↓
                                           Public metadata visible
                                           (title, abstract, tags)
                                                    ↓
                                    Contributors pay to collectively unlock
                                                    ↓
                                ┌─── 25%: Section headers revealed
                                ├─── 50%: Opening paragraphs
                                ├─── 75%: Thesis statements
                                └─── 100%: Full content decrypted via Lit Protocol
```

**The question isn't "is this article worth $5 to me?" but "is this article worth $5 to 10 of us?"**

## Architecture

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Smart Contract | Solidity (Lockbox + LockboxFactory) | Payment tracking, threshold logic, progressive reveals |
| Encryption | Lit Protocol (threshold encryption) | Access control tied to contract state |
| Storage | IPFS / Filecoin | Encrypted content + public metadata |
| Identity | ERC-8004 | Agent identity + reputation receipts per contribution |
| Chain | Base, Tempo, Status Sepolia | Multi-network deployment |
| Payments | MPP (Machine Payments Protocol) | HTTP 402 content gating via Tempo |

## Quick Start

```bash
# Install
npm install

# Compile contracts
npm run compile

# Run full demo (local Hardhat network)
npx hardhat run scripts/demo.ts --network hardhat
```

## Deploy to Base Sepolia

```bash
# 1. Set up .env
cp .env.example .env
# Fill in PRIVATE_KEY (generate with: cast wallet new)

# 2. Get Base Sepolia ETH
# https://www.alchemy.com/faucets/base-sepolia

# 3. Deploy
npm run deploy:base-sepolia

# 4. Encrypt content (set LOCKBOX_ADDRESS from deploy output)
LOCKBOX_ADDRESS=0x... npm run encrypt

# 5. Contribute
LOCKBOX_ADDRESS=0x... npm run contribute

# 6. Unlock (after threshold reached)
LOCKBOX_ADDRESS=0x... npm run unlock
```

## Hackathon Submission

```bash
# Register for The Synthesis
npm run register

# After registration, set API key in .env, then:
npm run submit
```

## Contract Interface

### Lockbox.sol

| Function | Description |
|----------|------------|
| `contribute()` | Pay to contribute toward unlock threshold |
| `getProgress()` | Returns (current, total, unlocked) |
| `getRevealLevel()` | Returns 0-4 based on % progress |
| `getTeaserCID(level)` | Get progressive reveal content CID |
| `isUnlocked()` | Boolean check for Lit Protocol ACC |
| `withdraw()` | Author withdraws funds after unlock |

### LockboxFactory.sol

| Function | Description |
|----------|------------|
| `createLockbox(...)` | Deploy a new Lockbox instance |
| `getLockboxCount()` | Total lockboxes created |
| `getLockboxAddress(id)` | Get lockbox address by ID |
| `getLockboxProgress(id)` | Check progress for any lockbox |

## Deployed Contracts

| Network | Factory | Lockbox |
|---|---|---|
| **Base Mainnet** | `0xbdf727a...906f` | `0x2f6104E...D861` |
| **Tempo Mainnet** | `0xef8e019...6f58` | `0xD1a6cea...5995` |
| **Base Sepolia** | `0xbdf727a...906f` | `0x2f6104E...D861` |
| **Status Sepolia** | `0xa309ebe...4e2` | `0x069b29d...4b3` |
| **Tempo Testnet** | `0xBdF727A...906F` | `0x2f6104E...D861` |

## MPP Integration

Lockbox content can be gated behind HTTP 402 payments via MPP (Machine Payments Protocol) on Tempo:

```bash
npm run mpp:server   # Start MPP server (0.01 pathUSD per read)
npm run mpp:client   # Pay and retrieve content
```

## Bounty Targets

- **Synthesis Open Track** — Collective unlock as a content primitive
- **Protocol Labs "Agents With Receipts"** — ERC-8004 reputation receipts for each contribution
- **Filecoin** — Encrypted content stored on IPFS/Filecoin
- **Venice** — Private content with trusted collective unlock
- **Base** — Deployed on Base mainnet + testnet
- **Tempo** — Deployed on Tempo mainnet + testnet with MPP integration
- **Status Network** — Deployed on Status Sepolia

## License

MIT
