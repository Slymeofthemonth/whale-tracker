/**
 * Whale Tracker API
 * 
 * x402 paid endpoints for querying whale activity.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getWallets, getWallet, seedDefaultWallets } from '@whale-tracker/wallets';
import { SQLiteEventStore } from '@whale-tracker/events';
import { WhaleMovesResponse, Chain } from '@whale-tracker/shared';

const app = new Hono();

// Initialize event store (shared with indexer via file)
const DB_PATH = process.env.DB_PATH || './data/whale-events.db';
const eventStore = new SQLiteEventStore(DB_PATH);

// Middleware
app.use('*', cors());

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'whale-tracker',
    version: '0.1.0',
    status: 'ok',
    db: DB_PATH,
  });
});

// List tracked wallets
app.get('/whales', (c) => {
  const chain = c.req.query('chain') as Chain | undefined;
  const wallets = getWallets(chain);
  return c.json({
    wallets,
    count: wallets.length,
  });
});

// Get specific wallet
app.get('/whales/:chain/:address', (c) => {
  const chain = c.req.param('chain') as Chain;
  const address = c.req.param('address');
  const wallet = getWallet(chain, address);
  
  if (!wallet) {
    return c.json({ error: 'Wallet not found' }, 404);
  }
  
  return c.json({ wallet });
});

// Get recent whale moves
app.get('/whale-moves', async (c) => {
  const chain = c.req.query('chain') as Chain | undefined;
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  const cursor = c.req.query('cursor');
  const minSignificance = c.req.query('significance') as 'low' | 'medium' | 'high' | undefined;
  
  const events = await eventStore.query({
    chain,
    limit: limit + 1, // Fetch one extra to check if there's more
    cursor,
    minSignificance,
  });
  
  const hasMore = events.length > limit;
  const resultEvents = hasMore ? events.slice(0, limit) : events;
  const nextCursor = hasMore && resultEvents.length > 0 
    ? resultEvents[resultEvents.length - 1].createdAt.toString()
    : undefined;
  
  const response: WhaleMovesResponse = {
    events: resultEvents,
    count: resultEvents.length,
    cursor: nextCursor,
  };
  
  return c.json(response);
});

// Get moves for specific wallet
app.get('/whale-moves/:chain/:address', async (c) => {
  const chain = c.req.param('chain') as Chain;
  const address = c.req.param('address').toLowerCase();
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  
  // Verify wallet is tracked
  const wallet = getWallet(chain, address);
  if (!wallet) {
    return c.json({ error: 'Wallet not tracked' }, 404);
  }
  
  const events = await eventStore.getByWallet(address, limit);
  
  const response: WhaleMovesResponse = {
    events,
    count: events.length,
  };
  
  return c.json(response);
});

// Stats endpoint
app.get('/stats', async (c) => {
  const wallets = getWallets();
  const recentEvents = await eventStore.query({ limit: 100 });
  
  const highSignificance = recentEvents.filter((e: { significance: string }) => e.significance === 'high').length;
  const mediumSignificance = recentEvents.filter((e: { significance: string }) => e.significance === 'medium').length;
  
  return c.json({
    trackedWallets: wallets.length,
    recentEvents: recentEvents.length,
    breakdown: {
      high: highSignificance,
      medium: mediumSignificance,
      low: recentEvents.length - highSignificance - mediumSignificance,
    },
  });
});

// x402 payment info endpoint
app.get('/.well-known/x402', (c) => {
  return c.json({
    accepts: ['lightning', 'ethereum'],
    endpoints: {
      '/whale-moves': {
        price: '100',
        currency: 'sats',
        description: 'Query recent whale movements',
      },
      '/whale-moves/:chain/:address': {
        price: '50',
        currency: 'sats', 
        description: 'Query specific wallet movements',
      },
    },
  });
});

// Initialize
seedDefaultWallets();

// Start server
const port = parseInt(process.env.PORT || '3000');

console.log(`🐋 Whale Tracker API starting on port ${port}`);
console.log(`📂 Using database: ${DB_PATH}`);

export default {
  port,
  fetch: app.fetch,
};
