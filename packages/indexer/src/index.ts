/**
 * On-Chain Indexer
 * 
 * Polls wallet activity and detects transfers above threshold.
 * 
 * Owner: Jock
 */

import { ethers } from 'ethers';
import { getAddresses, getWallets } from '@whale-tracker/wallets';
import { SQLiteEventStore, createEvent } from '@whale-tracker/events';
import { DEFAULT_CONFIG, Transfer, Chain, Wallet } from '@whale-tracker/shared';

export interface IndexerConfig {
  chain: Chain;
  rpcUrl: string;
  pollIntervalMs: number;
  dbPath?: string;
  minValueUsd: number;
}

const DEFAULT_RPC_URLS: Record<Chain, string> = {
  ethereum: 'https://eth.llamarpc.com',
  solana: '', // Not implemented yet
  base: 'https://mainnet.base.org',
};

// Rough ETH price for USD conversion (in prod, fetch from oracle)
const ETH_PRICE_USD = 3200;

export class Indexer {
  private config: IndexerConfig;
  private provider: ethers.JsonRpcProvider;
  private eventStore: SQLiteEventStore;
  private running = false;
  private lastBlock: number = 0;
  private walletMap: Map<string, Wallet> = new Map();

  constructor(config: Partial<IndexerConfig> = {}) {
    this.config = {
      chain: config.chain ?? 'ethereum',
      rpcUrl: config.rpcUrl ?? DEFAULT_RPC_URLS[config.chain ?? 'ethereum'],
      pollIntervalMs: config.pollIntervalMs ?? DEFAULT_CONFIG.pollIntervalMs,
      dbPath: config.dbPath ?? './whale-events.db',
      minValueUsd: config.minValueUsd ?? DEFAULT_CONFIG.thresholds.low,
    };
    
    this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
    this.eventStore = new SQLiteEventStore(this.config.dbPath);
  }

  async start(): Promise<void> {
    this.running = true;
    console.log(`🔍 Indexer starting for ${this.config.chain}`);
    
    // Build wallet lookup map
    const wallets = getWallets(this.config.chain);
    for (const w of wallets) {
      this.walletMap.set(w.address.toLowerCase(), w);
    }
    console.log(`📋 Tracking ${wallets.length} wallets`);

    // Get starting block
    this.lastBlock = await this.provider.getBlockNumber();
    console.log(`📦 Starting from block ${this.lastBlock}`);

    // Start polling loop
    while (this.running) {
      try {
        await this.poll();
      } catch (err) {
        console.error('❌ Poll error:', err);
      }
      await this.sleep(this.config.pollIntervalMs);
    }
  }

  stop(): void {
    this.running = false;
    this.eventStore.close();
    console.log('🛑 Indexer stopped');
  }

  getEventStore(): SQLiteEventStore {
    return this.eventStore;
  }

  private async poll(): Promise<void> {
    const currentBlock = await this.provider.getBlockNumber();
    
    if (currentBlock <= this.lastBlock) {
      return; // No new blocks
    }

    console.log(`🔄 Checking blocks ${this.lastBlock + 1} to ${currentBlock}`);
    
    // Get tracked addresses
    const addresses = Array.from(this.walletMap.keys());
    
    // For each new block, check for transfers involving our wallets
    for (let blockNum = this.lastBlock + 1; blockNum <= currentBlock; blockNum++) {
      const block = await this.provider.getBlock(blockNum, true);
      if (!block || !block.prefetchedTransactions) continue;
      
      for (const tx of block.prefetchedTransactions) {
        await this.processTransaction(tx, block.timestamp);
      }
    }

    this.lastBlock = currentBlock;
  }

  private async processTransaction(
    tx: ethers.TransactionResponse,
    timestamp: number
  ): Promise<void> {
    const from = tx.from?.toLowerCase();
    const to = tx.to?.toLowerCase();
    
    // Check if either party is a tracked wallet
    const fromWallet = from ? this.walletMap.get(from) : undefined;
    const toWallet = to ? this.walletMap.get(to) : undefined;
    
    if (!fromWallet && !toWallet) {
      return; // Neither party is tracked
    }

    // Calculate USD value (ETH only for now)
    const valueEth = parseFloat(ethers.formatEther(tx.value));
    const valueUsd = valueEth * ETH_PRICE_USD;
    
    if (valueUsd < this.config.minValueUsd) {
      return; // Below threshold
    }

    const transfer: Transfer = {
      hash: tx.hash,
      chain: this.config.chain,
      from: tx.from ?? '',
      to: tx.to ?? '',
      value: tx.value.toString(),
      valueUsd,
      token: 'native',
      tokenSymbol: 'ETH',
      blockNumber: tx.blockNumber ?? 0,
      timestamp,
    };

    // Create events for tracked wallets
    if (fromWallet) {
      const event = createEvent(transfer, fromWallet.address, fromWallet.label);
      await this.eventStore.insert(event);
      console.log(`🐋 ${fromWallet.label ?? fromWallet.address} sent ${valueEth.toFixed(2)} ETH ($${valueUsd.toLocaleString()})`);
    }
    
    if (toWallet) {
      const event = createEvent(transfer, toWallet.address, toWallet.label);
      await this.eventStore.insert(event);
      console.log(`🐋 ${toWallet.label ?? toWallet.address} received ${valueEth.toFixed(2)} ETH ($${valueUsd.toLocaleString()})`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI entry point
if (require.main === module) {
  const indexer = new Indexer({
    chain: 'ethereum',
    dbPath: './data/whale-events.db',
  });

  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    indexer.stop();
    process.exit(0);
  });

  indexer.start().catch(console.error);
}

export { getAddresses, getWallets } from '@whale-tracker/wallets';
