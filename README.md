# 🐋 Whale Tracker

Track significant wallet movements on-chain. Paid API via x402.

## Overview

Whale Tracker monitors the top crypto wallets and fires events when significant transfers occur. Built as an x402 paid endpoint — agents and traders pay per-request for real-time whale intelligence.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Wallets   │────▶│   Indexer   │────▶│   Events    │────▶│     API     │
│  (curated)  │     │ (on-chain)  │     │  (storage)  │     │   (x402)    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

- **wallets/** — Curated list of tracked wallets (top holders, known entities)
- **indexer/** — Polls/streams on-chain activity, detects transfers above threshold
- **events/** — Normalizes and stores whale movement events
- **api/** — x402 paid endpoints for querying whale activity

## Packages

| Package | Owner | Description |
|---------|-------|-------------|
| `packages/wallets` | Slyme | Wallet list curation and management |
| `packages/api` | Slyme | x402 API endpoints |
| `packages/indexer` | Jock | On-chain activity indexing |
| `packages/events` | Jock | Event pipeline and storage |
| `shared/` | Both | Shared types, configs, utilities |

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Database:** SQLite (→ Postgres when needed)
- **Chain:** Ethereum (first), then SOL/Base
- **Hosting:** Railway
- **Payments:** x402

## Getting Started

```bash
# Install dependencies
npm install

# Run all packages in dev mode
npm run dev

# Build all packages
npm run build
```

## API Endpoints (planned)

```
GET /whale-moves          # Recent significant movements
GET /whale-moves/:wallet  # Specific wallet history  
GET /whales               # List of tracked wallets
```

## Configuration

Thresholds and settings in `shared/config.ts`:
- `SIGNIFICANT_THRESHOLD` — Minimum USD value to trigger event (default: $100k)
- `TRACKED_CHAINS` — Which chains to monitor
- `POLL_INTERVAL` — How often to check for new activity

## License

MIT
