/**
 * Price Oracle
 * 
 * Fetches live cryptocurrency prices from CoinGecko.
 * Caches prices to avoid rate limiting.
 */

export interface PriceOracle {
  getPrice(symbol: string): Promise<number>;
  getPrices(symbols: string[]): Promise<Map<string, number>>;
}

interface CoinGeckoPrice {
  [id: string]: {
    usd: number;
  };
}

// Map common symbols to CoinGecko IDs
const SYMBOL_TO_COINGECKO: Record<string, string> = {
  ETH: 'ethereum',
  WETH: 'ethereum',
  BTC: 'bitcoin',
  WBTC: 'wrapped-bitcoin',
  USDC: 'usd-coin',
  USDT: 'tether',
  DAI: 'dai',
  LINK: 'chainlink',
  UNI: 'uniswap',
  AAVE: 'aave',
  MKR: 'maker',
  SNX: 'synthetix-network-token',
  COMP: 'compound-governance-token',
  CRV: 'curve-dao-token',
  LDO: 'lido-dao',
  RPL: 'rocket-pool',
  ARB: 'arbitrum',
  OP: 'optimism',
  MATIC: 'matic-network',
  SOL: 'solana',
};

// Stablecoins always ~$1
const STABLECOINS = new Set(['USDC', 'USDT', 'DAI', 'BUSD', 'TUSD', 'FRAX']);

export class CoinGeckoPriceOracle implements PriceOracle {
  private cache: Map<string, { price: number; timestamp: number }> = new Map();
  private cacheTtlMs: number;
  private baseUrl = 'https://api.coingecko.com/api/v3';

  constructor(cacheTtlMs = 60_000) { // 1 minute default cache
    this.cacheTtlMs = cacheTtlMs;
  }

  async getPrice(symbol: string): Promise<number> {
    const prices = await this.getPrices([symbol]);
    return prices.get(symbol.toUpperCase()) ?? 0;
  }

  async getPrices(symbols: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    const now = Date.now();
    const symbolsToFetch: string[] = [];

    // Check cache and handle stablecoins
    for (const symbol of symbols) {
      const upperSymbol = symbol.toUpperCase();
      
      // Stablecoins are always ~$1
      if (STABLECOINS.has(upperSymbol)) {
        result.set(upperSymbol, 1);
        continue;
      }

      // Check cache
      const cached = this.cache.get(upperSymbol);
      if (cached && (now - cached.timestamp) < this.cacheTtlMs) {
        result.set(upperSymbol, cached.price);
        continue;
      }

      // Need to fetch
      if (SYMBOL_TO_COINGECKO[upperSymbol]) {
        symbolsToFetch.push(upperSymbol);
      } else {
        // Unknown token, default to 0
        result.set(upperSymbol, 0);
      }
    }

    if (symbolsToFetch.length === 0) {
      return result;
    }

    // Fetch from CoinGecko
    const coingeckoIds = symbolsToFetch.map(s => SYMBOL_TO_COINGECKO[s]);
    const uniqueIds = [...new Set(coingeckoIds)];

    try {
      const url = `${this.baseUrl}/simple/price?ids=${uniqueIds.join(',')}&vs_currencies=usd`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn(`CoinGecko API error: ${response.status}`);
        // Return cached values or 0 on error
        for (const symbol of symbolsToFetch) {
          const cached = this.cache.get(symbol);
          result.set(symbol, cached?.price ?? 0);
        }
        return result;
      }

      const data: CoinGeckoPrice = await response.json();

      // Map results back to symbols and cache
      for (const symbol of symbolsToFetch) {
        const coingeckoId = SYMBOL_TO_COINGECKO[symbol];
        const price = data[coingeckoId]?.usd ?? 0;
        
        result.set(symbol, price);
        this.cache.set(symbol, { price, timestamp: now });
      }
    } catch (err) {
      console.warn('CoinGecko fetch error:', err);
      // Return cached values or 0 on error
      for (const symbol of symbolsToFetch) {
        const cached = this.cache.get(symbol);
        result.set(symbol, cached?.price ?? 0);
      }
    }

    return result;
  }

  /**
   * Get ETH price specifically (convenience method)
   */
  async getEthPrice(): Promise<number> {
    return this.getPrice('ETH');
  }

  /**
   * Clear the price cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance for shared use
let defaultOracle: CoinGeckoPriceOracle | null = null;

export function getPriceOracle(): CoinGeckoPriceOracle {
  if (!defaultOracle) {
    defaultOracle = new CoinGeckoPriceOracle();
  }
  return defaultOracle;
}
