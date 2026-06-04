import type { API } from "@orderly.network/types";
import mappingJson from "@/data/rwa-category-mapping.json";

export type RwaDisplayCategory =
  | "stocks"
  | "indices"
  | "commodities"
  | "unclassified";

type MappingTuple = [string, string];

type MarketLike = Pick<
  API.MarketInfoExt,
  "symbol" | "display_symbol_name" | "broker_id"
>;

const RWA_DISPLAY_CATEGORIES = new Set<RwaDisplayCategory>([
  "stocks",
  "indices",
  "commodities",
  "unclassified",
]);

const RAW_CATEGORY_MAP = new Map<string, string>();

for (const [key, category] of mappingJson.entries as MappingTuple[]) {
  const normalizedKey = String(key).trim().toLowerCase();
  if (!normalizedKey) {
    continue;
  }

  if (!RAW_CATEGORY_MAP.has(normalizedKey)) {
    RAW_CATEGORY_MAP.set(normalizedKey, category);
  }

  // Support broker-prefixed keys like "flx:BTC" for feeds where broker_id is absent.
  const colonIndex = normalizedKey.indexOf(":");
  if (colonIndex > 0 && colonIndex < normalizedKey.length - 1) {
    const baseAlias = normalizedKey.slice(colonIndex + 1);
    if (!RAW_CATEGORY_MAP.has(baseAlias)) {
      RAW_CATEGORY_MAP.set(baseAlias, category);
    }
  }
}

function getBaseFromPerpSymbol(symbol: string): string | undefined {
  const parts = symbol.split("_");
  if (parts.length < 3 || parts[0] !== "PERP") {
    return undefined;
  }
  return parts.slice(1, -1).join("_");
}

function getBaseFromGenericSymbol(symbol: string): string | undefined {
  const normalized = symbol.replace(/\s*\(.+\)\s*$/, "").trim();
  if (!normalized) {
    return undefined;
  }

  // Handle common formats like AAPL_USDC / AAPL-USD.
  const underscoreParts = normalized.split("_");
  if (underscoreParts.length >= 2) {
    return underscoreParts[0];
  }

  const dashParts = normalized.split("-");
  if (dashParts.length >= 2) {
    return dashParts[0];
  }

  return normalized;
}

function normalizeCategory(raw: string | undefined): RwaDisplayCategory {
  const normalized = (raw || "").trim().toLowerCase();

  if (normalized === "indeces") {
    return "indices";
  }

  if (RWA_DISPLAY_CATEGORIES.has(normalized as RwaDisplayCategory)) {
    return normalized as RwaDisplayCategory;
  }

  return "unclassified";
}

function getMarketBaseSymbol(market: MarketLike): string | undefined {
  const rawSymbol = market.display_symbol_name || market.symbol;
  const base =
    getBaseFromPerpSymbol(rawSymbol)?.toUpperCase() ||
    getBaseFromGenericSymbol(rawSymbol)?.toUpperCase();
  return base || rawSymbol?.toUpperCase();
}

function getMappingCandidates(market: MarketLike): string[] {
  const base = getMarketBaseSymbol(market);
  if (!base) {
    return [];
  }

  const candidates = [base.toLowerCase()];
  const brokerId = market.broker_id?.trim().toLowerCase();
  if (brokerId) {
    candidates.unshift(`${brokerId}:${base}`.toLowerCase());
  }

  return candidates;
}

function getMappedRawCategory(market: MarketLike): string | undefined {
  return getMappingCandidates(market)
    .map((candidate) => RAW_CATEGORY_MAP.get(candidate))
    .find(Boolean);
}

export function hasRwaCategoryMapping(market: MarketLike): boolean {
  return !!getMappedRawCategory(market);
}

export function getMappedRwaDisplayCategory(
  market: MarketLike,
): RwaDisplayCategory | undefined {
  const rawCategory = getMappedRawCategory(market);
  if (!rawCategory) {
    return undefined;
  }
  return normalizeCategory(rawCategory);
}

export function getRwaDisplayCategory(market: MarketLike): RwaDisplayCategory {
  const rawCategory = getMappedRawCategory(market);
  return normalizeCategory(rawCategory);
}
