/**
 * Wallet List Management
 * 
 * Curates and maintains the list of tracked whale wallets.
 * Sources: Arkham, Nansen labels, manual additions.
 */

import { Wallet, Chain } from '@whale-tracker/shared';
import ethWhalesData from './data/eth-whales.json' with { type: 'json' };

// In-memory wallet store
const wallets: Map<string, Wallet> = new Map();

/**
 * Add a wallet to the tracking list
 */
export function addWallet(wallet: Omit<Wallet, 'addedAt'>): Wallet {
  const full: Wallet = {
    ...wallet,
    addedAt: Date.now(),
  };
  const key = `${wallet.chain}:${wallet.address.toLowerCase()}`;
  wallets.set(key, full);
  return full;
}

/**
 * Remove a wallet from tracking
 */
export function removeWallet(chain: Chain, address: string): boolean {
  const key = `${chain}:${address.toLowerCase()}`;
  return wallets.delete(key);
}

/**
 * Get all wallets, optionally filtered by chain
 */
export function getWallets(chain?: Chain): Wallet[] {
  const all = Array.from(wallets.values());
  if (chain) {
    return all.filter(w => w.chain === chain);
  }
  return all;
}

/**
 * Get a specific wallet
 */
export function getWallet(chain: Chain, address: string): Wallet | undefined {
  const key = `${chain}:${address.toLowerCase()}`;
  return wallets.get(key);
}

/**
 * Check if a wallet is being tracked
 */
export function isTracked(chain: Chain, address: string): boolean {
  const key = `${chain}:${address.toLowerCase()}`;
  return wallets.has(key);
}

/**
 * Get wallet addresses as a simple array (for indexer consumption)
 */
export function getAddresses(chain: Chain): string[] {
  return getWallets(chain).map(w => w.address.toLowerCase());
}

/**
 * Seed with whale wallets from data files
 */
export function seedDefaultWallets(): void {
  // Load ETH whales from JSON
  for (const whale of ethWhalesData) {
    addWallet({
      address: whale.address,
      chain: 'ethereum',
      label: whale.label,
      source: whale.source,
      tags: whale.tags,
    });
  }
  
  console.log(`📋 Loaded ${ethWhalesData.length} ETH whale wallets`);
}

// Auto-seed on module load
seedDefaultWallets();

// Export types
export type { Wallet, Chain };
