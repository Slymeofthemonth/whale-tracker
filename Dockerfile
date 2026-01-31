# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules
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

# Bundle with esbuild
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies for native modules
RUN apk add --no-cache python3 make g++

# Create data directory for SQLite
RUN mkdir -p /app/data

# Copy bundled file
COPY --from=builder /app/dist/server.js ./dist/
COPY --from=builder /app/dist/server.js.map ./dist/

# Copy node_modules for native modules (better-sqlite3)
COPY --from=builder /app/node_modules ./node_modules

# Copy package.json for module resolution
COPY --from=builder /app/package.json ./

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/whale-events.db

EXPOSE 3000

# Run the bundled server
CMD ["node", "dist/server.js"]
