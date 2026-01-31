/**
 * Event Pipeline & Storage
 * 
 * Normalizes and stores whale movement events.
 * 
 * Owner: Jock
 * 
 * TODO:
 * - SQLite storage for events
 * - Event normalization from raw transfers
 * - Query interface for API consumption
 * - Significance classification (high/medium/low)
 */

import { WhaleEvent, Transfer, DEFAULT_CONFIG } from '@whale-tracker/shared';

// Event store interface
export interface EventStore {
  insert(event: WhaleEvent): Promise<void>;
  query(options: QueryOptions): Promise<WhaleEvent[]>;
  getByWallet(wallet: string, limit?: number): Promise<WhaleEvent[]>;
}

export interface QueryOptions {
  chain?: string;
  minSignificance?: 'low' | 'medium' | 'high';
  limit?: number;
  cursor?: string;
}

/**
 * Classify transfer significance based on USD value
 */
export function classifySignificance(
  valueUsd: number,
  thresholds = DEFAULT_CONFIG.thresholds
): 'high' | 'medium' | 'low' {
  if (valueUsd >= thresholds.high) return 'high';
  if (valueUsd >= thresholds.medium) return 'medium';
  return 'low';
}

/**
 * Generate unique event ID
 */
export function generateEventId(transfer: Transfer, wallet: string): string {
  return `${transfer.chain}:${transfer.hash}:${wallet}`;
}

/**
 * Create a WhaleEvent from a raw Transfer
 */
export function createEvent(
  transfer: Transfer,
  wallet: string,
  walletLabel?: string
): WhaleEvent {
  const isIncoming = transfer.to.toLowerCase() === wallet.toLowerCase();
  
  return {
    id: generateEventId(transfer, wallet),
    type: isIncoming ? 'transfer_in' : 'transfer_out',
    wallet,
    walletLabel,
    chain: transfer.chain,
    transfer,
    significance: classifySignificance(transfer.valueUsd),
    createdAt: Date.now(),
  };
}

// TODO: Implement SQLite-backed EventStore
// export class SQLiteEventStore implements EventStore { ... }
