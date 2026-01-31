# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./
COPY shared/package.json ./shared/
COPY packages/wallets/package.json ./packages/wallets/
COPY packages/events/package.json ./packages/events/
COPY packages/indexer/package.json ./packages/indexer/
COPY packages/api/package.json ./packages/api/

# Install dependencies
RUN bun install

# Copy source files
COPY . .

# Build all packages
RUN bun run build

# Production stage
FROM oven/bun:1-slim

WORKDIR /app

# Create data directory for SQLite
RUN mkdir -p /app/data

# Copy built files and dependencies
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/shared/package.json ./shared/
COPY --from=builder /app/packages/wallets/dist ./packages/wallets/dist
COPY --from=builder /app/packages/wallets/src/data ./packages/wallets/src/data
COPY --from=builder /app/packages/wallets/package.json ./packages/wallets/
COPY --from=builder /app/packages/events/dist ./packages/events/dist
COPY --from=builder /app/packages/events/package.json ./packages/events/
COPY --from=builder /app/packages/indexer/dist ./packages/indexer/dist
COPY --from=builder /app/packages/indexer/package.json ./packages/indexer/
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/package.json ./packages/api/

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/whale-events.db

# x402 Payments config (must be set in Railway)
# ENV PAYMENTS_RECEIVABLE_ADDRESS=0xYourAddress
# ENV PAYMENTS_NETWORK=base
# ENV FACILITATOR_URL=https://facilitator.x402.org

EXPOSE 3000

# Run the agent
CMD ["bun", "run", "packages/api/dist/server.js"]
