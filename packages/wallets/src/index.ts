/**
 * Wallet List Management
 * 
 * Curates and maintains the list of tracked whale wallets.
 * Sources: Arkham, Nansen labels, manual additions.
 */

import { Wallet, Chain } from '@whale-tracker/shared';

// In-memory wallet store (will be backed by file/db later)
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
 * Seed with initial whale wallets
 */
export function seedDefaultWallets(): void {
  // Top ETH whales - well-known addresses
  const defaults: Omit<Wallet, 'addedAt'>[] = [
    {
      address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      chain: 'ethereum',
      label: 'Vitalik Buterin',
      source: 'manual',
      tags: ['founder', 'influencer'],
    },
    {
      address: '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503',
      chain: 'ethereum',
      label: 'Binance',
      source: 'arkham',
      tags: ['exchange', 'cex'],
    },
    {
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f1b5E0',
      chain: 'ethereum',
      label: 'Bitfinex',
      source: 'arkham',
      tags: ['exchange', 'cex'],
    },
    {
      address: '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8',
      chain: 'ethereum',
      label: 'Binance 7',
      source: 'arkham',
      tags: ['exchange', 'cex'],
    },
    {
      address: '0x8315177aB297bA92A06054cE80a67Ed4DBd7ed3a',
      chain: 'ethereum',
      label: 'Arbitrum Bridge',
      source: 'manual',
      tags: ['bridge', 'l2'],
    },
  ];

  for (const wallet of defaults) {
    addWallet(wallet);
  }
}

// Auto-seed on module load
seedDefaultWallets();

// Export types
export type { Wallet, Chain };
