/**
 * Symbol precision configuration
 * Defines price and quantity decimal places for each trading pair
 */

export interface SymbolPrecisionConfig {
  price: number; // Price decimal places
  quantity: number; // Quantity decimal places
}

export const SYMBOL_PRECISION: Record<string, SymbolPrecisionConfig> = {
  'BTC/USDT': {
    price: 2,
    quantity: 5,
  },
  'ETH/USDT': {
    price: 2,
    quantity: 4,
  },
  'BNB/USDT': {
    price: 2,
    quantity: 3,
  },
  'SOL/USDT': {
    price: 2,
    quantity: 3,
  },
  'XRP/USDT': {
    price: 4,
    quantity: 2,
  },
  'DOGE/USDT': {
    price: 5,
    quantity: 0,
  },
  'SHIB/USDT': {
    price: 8,
    quantity: 0,
  },
};

/**
 * Default precision for unknown symbols
 */
export const DEFAULT_PRECISION: SymbolPrecisionConfig = {
  price: 2,
  quantity: 4,
};

/**
 * Get precision config for a symbol
 */
export function getSymbolPrecision(symbol: string): SymbolPrecisionConfig {
  return SYMBOL_PRECISION[symbol] || DEFAULT_PRECISION;
}
