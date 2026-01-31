/**
 * On-Chain Indexer
 * 
 * Polls/streams wallet activity and detects transfers above threshold.
 * 
 * Owner: Jock
 * 
 * TODO:
 * - Connect to Alchemy/Infura for ETH
 * - Poll tracked wallet addresses from @whale-tracker/wallets
 * - Detect transfers above threshold
 * - Emit events to @whale-tracker/events
 */

import { getAddresses } from '@whale-tracker/wallets';
import { DEFAULT_CONFIG, Transfer, Chain } from '@whale-tracker/shared';

export interface IndexerConfig {
  chain: Chain;
  rpcUrl: string;
  pollIntervalMs: number;
}

export class Indexer {
  private config: IndexerConfig;
  private running = false;

  constructor(config: IndexerConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    this.running = true;
    console.log(`🔍 Indexer starting for ${this.config.chain}`);
    
    // Get tracked addresses
    const addresses = getAddresses(this.config.chain);
    console.log(`📋 Tracking ${addresses.length} wallets`);

    // TODO: Implement polling loop
    // while (this.running) {
    //   await this.poll(addresses);
    //   await sleep(this.config.pollIntervalMs);
    // }
  }

  stop(): void {
    this.running = false;
    console.log('🛑 Indexer stopped');
  }

  private async poll(addresses: string[]): Promise<Transfer[]> {
    // TODO: Implement chain-specific polling
    // - Use ethers.js / Alchemy SDK for ETH
    // - Batch getTransactionsByAddress calls
    // - Filter by threshold
    // - Return normalized Transfer objects
    return [];
  }
}

// Export for use
export { getAddresses };
