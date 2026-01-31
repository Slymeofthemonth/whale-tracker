/**
 * Whale Tracker Agent - x402 Paid API
 * 
 * Built with Lucid Agents SDK for proper payment verification.
 */

import { createAgent } from '@lucid-agents/core';
import { http } from '@lucid-agents/http';
import { createAgentApp } from '@lucid-agents/hono';
import { payments, paymentsFromEnv } from '@lucid-agents/payments';
import { z } from 'zod';
import { Indexer } from '@whale-tracker/indexer';
import { SQLiteEventStore } from '@whale-tracker/events';
import { getWallets, getWallet, seedDefaultWallets } from '@whale-tracker/wallets';
import type { Chain } from '@whale-tracker/shared';

const PORT = parseInt(process.env.PORT || '3000');
const DB_PATH = process.env.DB_PATH || './data/whale-events.db';
const ETH_RPC_URL = process.env.ETH_RPC_URL || 'https://eth.drpc.org';

console.log('🔧 Starting Whale Tracker Agent (Lucid Agents SDK v1.0.0)');

// Initialize wallets and event store
seedDefaultWallets();
const eventStore = new SQLiteEventStore(DB_PATH);

async function main() {
  console.log('🐋 Whale Tracker starting...');
  console.log(`📂 Database: ${DB_PATH}`);

  try {
    // Create agent - payments optional if env vars not set
    const agentBuilder = createAgent({
      name: 'whale-tracker',
      version: '1.0.0',
      description: 'Track significant whale wallet movements on Ethereum. Paid API via x402.',
    }).use(http());
    
    // Only add payments if configured
    const paymentsAddr = process.env.PAYMENTS_RECEIVABLE_ADDRESS;
    if (paymentsAddr) {
      console.log(`💰 Payments enabled: ${paymentsAddr}`);
      agentBuilder.use(payments({ config: paymentsFromEnv() }));
    } else {
      console.log('⚠️  No PAYMENTS_RECEIVABLE_ADDRESS - running without x402 payments');
    }
    
    const agent = await agentBuilder.build();
    console.log('✅ Agent built successfully');

    const { app, addEntrypoint } = await createAgentApp(agent);
    console.log('✅ Agent app created with Hono adapter');

  // Free health check endpoint
  addEntrypoint({
    key: 'health',
    description: 'Health check endpoint',
    input: z.object({}),
    handler: async () => ({
      output: {
        name: 'whale-tracker',
        version: '1.0.0',
        status: 'ok',
        db: DB_PATH,
        timestamp: new Date().toISOString(),
      },
    }),
  });

  // Free: List tracked wallets (discovery)
  addEntrypoint({
    key: 'whales',
    description: 'List all tracked whale wallets (free)',
    input: z.object({
      chain: z.enum(['ethereum', 'solana', 'base']).optional(),
    }),
    handler: async (ctx) => {
      const wallets = getWallets(ctx.input.chain as Chain | undefined);
      return {
        output: {
          wallets,
          count: wallets.length,
        },
      };
    },
  });

  // PAID: Get recent whale moves - $0.001 per request
  addEntrypoint({
    key: 'whale-moves',
    description: 'Get recent whale wallet movements',
    input: z.object({
      chain: z.enum(['ethereum', 'solana', 'base']).optional(),
      limit: z.number().min(1).max(100).default(50),
      significance: z.enum(['low', 'medium', 'high']).optional(),
      cursor: z.string().optional(),
    }),
    price: '0.001', // $0.001 per request
    handler: async (ctx) => {
      const { chain, limit, significance, cursor } = ctx.input;
      
      const events = await eventStore.query({
        chain: chain as Chain | undefined,
        limit: limit + 1,
        cursor,
        minSignificance: significance,
      });
      
      const hasMore = events.length > limit;
      const resultEvents = hasMore ? events.slice(0, limit) : events;
      const nextCursor = hasMore && resultEvents.length > 0 
        ? resultEvents[resultEvents.length - 1].createdAt.toString()
        : undefined;
      
      return {
        output: {
          events: resultEvents,
          count: resultEvents.length,
          cursor: nextCursor,
        },
      };
    },
  });

  // PAID: Get moves for specific wallet - $0.0005 per request
  addEntrypoint({
    key: 'wallet-moves',
    description: 'Get movements for a specific wallet',
    input: z.object({
      chain: z.enum(['ethereum', 'solana', 'base']),
      address: z.string(),
      limit: z.number().min(1).max(100).default(50),
    }),
    price: '0.0005', // $0.0005 per request
    handler: async (ctx) => {
      const { chain, address, limit } = ctx.input;
      
      const wallet = getWallet(chain as Chain, address);
      if (!wallet) {
        return {
          output: { error: 'Wallet not tracked', events: [], count: 0 },
        };
      }
      
      const events = await eventStore.getByWallet(address.toLowerCase(), limit);
      
      return {
        output: {
          wallet,
          events,
          count: events.length,
        },
      };
    },
  });

  // PAID: Get stats - $0.0005 per request
  addEntrypoint({
    key: 'stats',
    description: 'Get whale tracking statistics',
    input: z.object({}),
    price: '0.0005', // $0.0005 per request
    handler: async () => {
      const wallets = getWallets();
      const recentEvents = await eventStore.query({ limit: 100 });
      
      const highSignificance = recentEvents.filter((e: { significance: string }) => e.significance === 'high').length;
      const mediumSignificance = recentEvents.filter((e: { significance: string }) => e.significance === 'medium').length;
      
      return {
        output: {
          trackedWallets: wallets.length,
          recentEvents: recentEvents.length,
          breakdown: {
            high: highSignificance,
            medium: mediumSignificance,
            low: recentEvents.length - highSignificance - mediumSignificance,
          },
        },
      };
    },
  });

  // Start the indexer in the background
  console.log(`🔗 RPC URL: ${ETH_RPC_URL}`);
  const indexer = new Indexer({
    chain: 'ethereum',
    dbPath: DB_PATH,
    rpcUrl: ETH_RPC_URL,
  });
  
  indexer.start().catch((err: Error) => {
    console.error('❌ Indexer error:', err);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    indexer.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n👋 Shutting down...');
    indexer.stop();
    process.exit(0);
  });

  // Start server
  console.log(`🌐 API listening on port ${PORT}`);
  Bun.serve({
    port: PORT,
    fetch: app.fetch,
  });
  } catch (err) {
    console.error('❌ Failed to initialize agent:', err);
    throw err;
  }
}

main().catch(console.error);
