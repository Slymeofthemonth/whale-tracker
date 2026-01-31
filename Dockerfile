# Whale Tracker Agent - Lucid Agents SDK
FROM node:20-alpine AS builder

WORKDIR /app

# Install build deps for native modules
RUN apk add --no-cache python3 make g++

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

# Cache bust and build
RUN echo "Build v2 - $(date)" && npm run build && ls -la dist/ && echo "Build complete"

# Production stage
FROM node:20-alpine

WORKDIR /app

# Create data directory for SQLite
RUN mkdir -p /app/data

# Copy built server bundle
COPY --from=builder /app/dist/server.js ./dist/
COPY --from=builder /app/dist/server.js.map ./dist/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/whale-events.db

EXPOSE 3000

# Run the bundled server directly with node
CMD ["node", "dist/server.js"]
