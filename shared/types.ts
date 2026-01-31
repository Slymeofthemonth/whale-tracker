/**
 * Core types for Whale Tracker
 */

// Supported chains
export type Chain = 'ethereum' | 'solana' | 'base';

// Wallet entity
export interface Wallet {
  address: string;
  chain: Chain;
  label?: string;           // e.g., "Vitalik", "Jump Trading"
  source?: string;          // e.g., "arkham", "nansen", "manual"
  addedAt: number;          // Unix timestamp
  tags?: string[];          // e.g., ["whale", "exchange", "fund"]
}

// Raw transfer from chain
export interface Transfer {
  hash: string;
  chain: Chain;
  from: string;
  to: string;
  value: string;            // Raw value (wei, lamports, etc.)
  valueUsd: number;         // USD value at time of transfer
  token: string;            // Token address or "native"
  tokenSymbol?: string;     // e.g., "ETH", "USDC"
  blockNumber: number;
  timestamp: number;
}

// Whale movement event (normalized)
export interface WhaleEvent {
  id: string;               // Unique event ID
  type: 'transfer_in' | 'transfer_out' | 'swap';
  wallet: string;           // Tracked wallet address
  walletLabel?: string;
  chain: Chain;
  transfer: Transfer;
  significance: 'high' | 'medium' | 'low';
  createdAt: number;
}

// API response for whale moves
export interface WhaleMovesResponse {
  events: WhaleEvent[];
  cursor?: string;          // Pagination cursor
  count: number;
}

// Configuration
export interface Config {
  chains: Chain[];
  thresholds: {
    high: number;           // USD threshold for "high" significance
    medium: number;         // USD threshold for "medium" significance
    low: number;            // USD threshold for "low" (minimum to track)
  };
  pollIntervalMs: number;
}

// Default configuration
export const DEFAULT_CONFIG: Config = {
  chains: ['ethereum'],
  thresholds: {
    high: 1_000_000,        // $1M+
    medium: 100_000,        // $100k+
    low: 10_000,            // $10k+ (minimum)
  },
  pollIntervalMs: 15_000,   // 15 seconds
};
