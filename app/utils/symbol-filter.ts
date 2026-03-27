import { getRuntimeConfigArray } from "./runtime-config";
import type { API } from "@orderly.network/types";
import type { ConfigProviderProps } from "@orderly.network/hooks";

/**
 * Create a dataAdapter with symbolList function for filtering symbols
 * based on runtime configuration.
 *
 * Format: Comma-separated list of full symbol names (e.g., "PERP_BTC_USDC,PERP_ETH_USDC")
 * - Only symbols in the list will be included
 * - If empty, all symbols are returned
 */
export function createSymbolDataAdapter(): NonNullable<
  ConfigProviderProps["dataAdapter"]
> {
  const symbolList = getRuntimeConfigArray("VITE_SYMBOL_LIST");

  return {
    symbolList: (original: API.MarketInfoExt[]) => {
      if (symbolList.length === 0) {
        return original;
      }

      const symbolSet = new Set(symbolList);
      return original.filter((item) => symbolSet.has(item.symbol));
    },
  };
}
