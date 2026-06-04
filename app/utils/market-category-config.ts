import type { API } from "@orderly.network/types";
import type { MarketCategoryConfig, MarketTabConfig } from "@orderly.network/hooks";
import { i18n } from "@orderly.network/i18n";

type RwaMarketRecord = API.MarketInfoExt & {
  isRwa?: boolean;
  rwaCategory?: string;
};

function getRwaTabLabel(category: "stocks" | "indices" | "commodities" | "others"): string {
  return i18n.t(`markets.rwaCategory.${category}`, {
    defaultValue:
      category === "stocks"
        ? "Stocks"
        : category === "indices"
          ? "Indices"
          : category === "commodities"
            ? "Commodities"
            : "Others",
  }) as string;
}

function createCustomRwaTabs(): MarketTabConfig[] {
  return [
    {
      id: "rwa-stocks",
      name: getRwaTabLabel("stocks"),
      match: (market) => {
        const record = market as RwaMarketRecord;
        return !!record.isRwa && record.rwaCategory === "stocks";
      },
    },
    {
      id: "rwa-indices",
      name: getRwaTabLabel("indices"),
      match: (market) => {
        const record = market as RwaMarketRecord;
        return !!record.isRwa && record.rwaCategory === "indices";
      },
    },
    {
      id: "rwa-commodities",
      name: getRwaTabLabel("commodities"),
      match: (market) => {
        const record = market as RwaMarketRecord;
        return !!record.isRwa && record.rwaCategory === "commodities";
      },
    },
    {
      id: "rwa-unclassified",
      name: getRwaTabLabel("others"),
      match: (market) => {
        const record = market as RwaMarketRecord;
        return !!record.isRwa && record.rwaCategory === "unclassified";
      },
    },
  ];
}

export const marketCategoryConfig: MarketCategoryConfig = (original) => {
  const result: MarketTabConfig[] = [];
  const customRwaTabs = createCustomRwaTabs();
  const tradFiLabel = i18n.t("common.rwa", { defaultValue: "TradFi" }) as string;

  for (const tab of original) {
    if ("type" in tab && tab.type === "rwa") {
      result.push({ ...tab, name: tradFiLabel }, ...customRwaTabs);
      continue;
    }
    result.push(tab);
  }

  return result;
};
