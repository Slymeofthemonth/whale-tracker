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
COPY --from=builder /app/dist ./dist

# Copy wallet data JSON (needed at runtime)
COPY --from=builder /app/packages/wallets/src/data ./packages/wallets/src/data

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/whale-events.db

EXPOSE 3000

# Run the unified server
CMD ["node", "dist/packages/api/src/server.js"]
