# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY shared/package.json ./shared/
COPY packages/wallets/package.json ./packages/wallets/
COPY packages/events/package.json ./packages/events/
COPY packages/indexer/package.json ./packages/indexer/
COPY packages/api/package.json ./packages/api/

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Build all packages
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Create data directory for SQLite
RUN mkdir -p /app/data

# Copy built files and dependencies
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Shared
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/shared/package.json ./shared/

# Wallets (including data files)
COPY --from=builder /app/packages/wallets/dist ./packages/wallets/dist
COPY --from=builder /app/packages/wallets/package.json ./packages/wallets/

# Events
COPY --from=builder /app/packages/events/dist ./packages/events/dist
COPY --from=builder /app/packages/events/package.json ./packages/events/

# Indexer
COPY --from=builder /app/packages/indexer/dist ./packages/indexer/dist
COPY --from=builder /app/packages/indexer/package.json ./packages/indexer/

# API
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/package.json ./packages/api/

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/whale-events.db

EXPOSE 3000

# Run the unified server
CMD ["node", "packages/api/dist/server.js"]
