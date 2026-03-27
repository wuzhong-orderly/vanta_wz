import { useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API } from "@orderly.network/types";
import { Box } from "@orderly.network/ui";
import { PositionsModule } from "@orderly.network/portfolio";
import { useTradingLocalStorage } from "@orderly.network/trading";
import { updateSymbol } from "@/utils/storage";
import { generatePageTitle } from "@/utils/utils";
import { useOrderlyConfig } from "@/utils/config";
import { getPageMeta } from "@/utils/seo";
import { renderSEOTags } from "@/utils/seo-tags";

export default function PortfolioPositions() {
  const config = useOrderlyConfig();
  const local = useTradingLocalStorage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const onSymbolChange = useCallback(
    (data: API.Symbol) => {
      const symbol = data.symbol;
      updateSymbol(symbol);
      
      const searchParamsString = searchParams.toString();
      const queryString = searchParamsString ? `?${searchParamsString}` : '';
      
      navigate(`/perp/${symbol}${queryString}`);
    },
    [navigate, searchParams]
  );

  const pageMeta = getPageMeta();
  const pageTitle = generatePageTitle("Positions");

  return (
    <>
      {renderSEOTags(pageMeta, pageTitle)}
      <Box
        p={6}
        pb={0}
        intensity={900}
        r="xl"
        width="100%"
        style={{
          minHeight: 379,
          maxHeight: 2560,
          overflow: "hidden",
          height: "calc(100vh - 48px - 29px - 48px)",
        }}
      >
        <PositionsModule.PositionsPage
          sharePnLConfig={config.tradingPage.sharePnLConfig}
          pnlNotionalDecimalPrecision={local.pnlNotionalDecimalPrecision}
          calcMode={local.unPnlPriceBasis}
          onSymbolChange={onSymbolChange}
        />
      </Box>
    </>
  );
}

