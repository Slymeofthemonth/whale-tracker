/**
 * Unified Server Entry Point
 * 
 * Runs both the API and the Indexer in a single process.
 * For Railway deployment where we want simplicity.
 */

import { serve } from '@hono/node-server';
import app from './index';
import { Indexer } from '@whale-tracker/indexer';

const PORT = parseInt(process.env.PORT || '3000');
const DB_PATH = process.env.DB_PATH || './data/whale-events.db';

async function main() {
  console.log('🐋 Whale Tracker starting...');
  console.log(`📂 Database: ${DB_PATH}`);
  
  // Start the indexer in the background
  const indexer = new Indexer({
    chain: 'ethereum',
    dbPath: DB_PATH,
  });
  
  // Don't await - let it run in background
  indexer.start().catch(err => {
    console.error('❌ Indexer error:', err);
  });
  
  // Start the API server
  console.log(`🌐 API listening on port ${PORT}`);
  serve({
    fetch: app.fetch,
    port: PORT,
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
}

main().catch(console.error);
