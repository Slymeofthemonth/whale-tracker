/**
 * Whale Tracker API
 * 
 * x402 paid endpoints for querying whale activity.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getWallets, getWallet, seedDefaultWallets } from '@whale-tracker/wallets';
import { WhaleEvent, WhaleMovesResponse, Chain } from '@whale-tracker/shared';

const app = new Hono();

// Middleware
app.use('*', cors());

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'whale-tracker',
    version: '0.1.0',
    status: 'ok',
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

// Get recent whale moves (TODO: integrate with events package)
app.get('/whale-moves', (c) => {
  const chain = c.req.query('chain') as Chain | undefined;
  const limit = parseInt(c.req.query('limit') || '50');
  const cursor = c.req.query('cursor');
  
  // TODO: Query from events package
  // For now, return empty placeholder
  const response: WhaleMovesResponse = {
    events: [],
    count: 0,
    cursor: undefined,
  };
  
  return c.json(response);
});

// Get moves for specific wallet (TODO: integrate with events package)
app.get('/whale-moves/:chain/:address', (c) => {
  const chain = c.req.param('chain') as Chain;
  const address = c.req.param('address');
  const limit = parseInt(c.req.query('limit') || '50');
  
  // TODO: Query from events package filtered by wallet
  const response: WhaleMovesResponse = {
    events: [],
    count: 0,
  };
  
  return c.json(response);
});

// x402 payment info endpoint
app.get('/.well-known/x402', (c) => {
  return c.json({
    accepts: ['lightning', 'ethereum'],
    endpoints: {
      '/whale-moves': {
        price: '100',  // sats
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

export default {
  port,
  fetch: app.fetch,
};
