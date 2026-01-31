/**
 * Event Pipeline & Storage
 * 
 * Normalizes and stores whale movement events.
 * 
 * Owner: Jock
 */

import Database from 'better-sqlite3';
import { WhaleEvent, Transfer, DEFAULT_CONFIG, Chain } from '@whale-tracker/shared';

// Event store interface
export interface EventStore {
  insert(event: WhaleEvent): Promise<void>;
  query(options: QueryOptions): Promise<WhaleEvent[]>;
  getByWallet(wallet: string, limit?: number): Promise<WhaleEvent[]>;
  close(): void;
}

export interface QueryOptions {
  chain?: Chain;
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

const SIGNIFICANCE_ORDER = { low: 1, medium: 2, high: 3 };

/**
 * SQLite-backed EventStore implementation
 */
export class SQLiteEventStore implements EventStore {
  private db: Database.Database;

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath);
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        wallet TEXT NOT NULL,
        wallet_label TEXT,
        chain TEXT NOT NULL,
        transfer_json TEXT NOT NULL,
        significance TEXT NOT NULL,
        significance_order INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_events_wallet ON events(wallet);
      CREATE INDEX IF NOT EXISTS idx_events_chain ON events(chain);
      CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_events_significance ON events(significance_order DESC);
    `);
  }

  async insert(event: WhaleEvent): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO events 
      (id, type, wallet, wallet_label, chain, transfer_json, significance, significance_order, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      event.id,
      event.type,
      event.wallet,
      event.walletLabel ?? null,
      event.chain,
      JSON.stringify(event.transfer),
      event.significance,
      SIGNIFICANCE_ORDER[event.significance],
      event.createdAt
    );
  }

  async query(options: QueryOptions = {}): Promise<WhaleEvent[]> {
    const { chain, minSignificance, limit = 100, cursor } = options;
    
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (chain) {
      conditions.push('chain = ?');
      params.push(chain);
    }

    if (minSignificance) {
      conditions.push('significance_order >= ?');
      params.push(SIGNIFICANCE_ORDER[minSignificance]);
    }

    if (cursor) {
      conditions.push('created_at < ?');
      params.push(parseInt(cursor, 10));
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const stmt = this.db.prepare(`
      SELECT * FROM events 
      ${where}
      ORDER BY created_at DESC 
      LIMIT ?
    `);
    
    params.push(limit);
    const rows = stmt.all(...params) as any[];
    
    return rows.map(row => ({
      id: row.id,
      type: row.type,
      wallet: row.wallet,
      walletLabel: row.wallet_label ?? undefined,
      chain: row.chain as Chain,
      transfer: JSON.parse(row.transfer_json),
      significance: row.significance,
      createdAt: row.created_at,
    }));
  }

  async getByWallet(wallet: string, limit = 50): Promise<WhaleEvent[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM events 
      WHERE wallet = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `);
    
    const rows = stmt.all(wallet.toLowerCase(), limit) as any[];
    
    return rows.map(row => ({
      id: row.id,
      type: row.type,
      wallet: row.wallet,
      walletLabel: row.wallet_label ?? undefined,
      chain: row.chain as Chain,
      transfer: JSON.parse(row.transfer_json),
      significance: row.significance,
      createdAt: row.created_at,
    }));
  }

  close(): void {
    this.db.close();
  }
}
