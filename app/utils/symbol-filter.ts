import { getRuntimeConfigArray } from "./runtime-config";
import type { API } from "@orderly.network/types";
import type { ConfigProviderProps } from "@orderly.network/hooks";
import {
  getMappedRwaDisplayCategory,
  getRwaDisplayCategory,
} from "./rwa-category";

type RwaInfoRecord = Record<string, unknown>;
type SymbolListFn = NonNullable<
  NonNullable<ConfigProviderProps["dataAdapter"]>["symbolList"]
>;

function getRwaInfoBySymbol(
  symbolKey: string | undefined,
  context?: Parameters<SymbolListFn>[1],
): RwaInfoRecord | undefined {
  if (!symbolKey || !context || !context.rwaSymbolsInfo) {
    return undefined;
  }

  const rawValue = context.rwaSymbolsInfo[
    symbolKey as keyof typeof context.rwaSymbolsInfo
  ] as unknown;

  // dataAdapter context can be either:
  // 1) a plain record: Record<string, API.RwaSymbol>
  // 2) a getter proxy from createGetter where each key is a function
  if (rawValue && typeof rawValue === "object") {
    return rawValue as RwaInfoRecord;
  }

  if (typeof rawValue !== "function") {
    return undefined;
  }

  const result = rawValue();
  return result && typeof result === "object"
    ? (result as RwaInfoRecord)
    : undefined;
}

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
    symbolList: (original: API.MarketInfoExt[], context) => {
      const symbolSet = new Set(symbolList);

      const filtered =
        symbolList.length === 0
          ? original
          : original.filter((item) => symbolSet.has(item.symbol));

      const mappedList = filtered.map((item) => {
        const rwaInfo = getRwaInfoBySymbol(item.symbol, context);
        const isRwaByContext = !!rwaInfo;

        if (!isRwaByContext) {
          return item;
        }

        const mappedCategory = getMappedRwaDisplayCategory(item);
        const rwaCategory = mappedCategory || getRwaDisplayCategory(item);

        return {
          ...item,
          isRwa: true,
          rwaCategory,
        };
      });

      return mappedList;
    },
  };
}
