import { useCallback, useEffect, useState, useMemo } from "react";
import { useAccount, useLocalStorage } from "@orderly.network/hooks";
import { useAppContext } from "@orderly.network/react-app";
import { AccountStatusEnum, OrderEntrySortKeys } from "@orderly.network/types";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { API } from "@orderly.network/types";
import { TradingPage } from "@/components/customOrderlyComponent/trading";
import { useFirstTimeDeposit } from "@/components/customOrderlyComponent/trading/pages/trading/hooks/useFirstTimeDeposit";
import { updateSymbol } from "@/utils/storage";
import { formatSymbol, generatePageTitle } from "@/utils/utils";
import { useOrderlyConfig } from "@/utils/config";
import { getPageMeta } from "@/utils/seo";
import { renderSEOTags } from "@/utils/seo-tags";

export default function PerpSymbol() {
  const params = useParams();
  const [symbol, setSymbol] = useState(params.symbol!);
  const config = useOrderlyConfig();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 账户面板顺序逻辑（连接状态+首次充值判断）
  const { state, isMainAccount } = useAccount();
  const { wrongNetwork, disabledConnect } = useAppContext();
  const isConnected = state.status >= AccountStatusEnum.Connected;
  const isFirstTimeDeposit = useFirstTimeDeposit();
  const isSubAccount = isConnected && !isMainAccount;
  const shouldOrderEntryFirst = isSubAccount || (isConnected && !isFirstTimeDeposit);
  const canTrade = useMemo(() => {
    return (
      !wrongNetwork &&
      !disabledConnect &&
      (
        state.status === AccountStatusEnum.EnableTrading ||
        state.status === AccountStatusEnum.EnableTradingWithoutConnected
      )
    );
  }, [state.status, wrongNetwork, disabledConnect]);

  // 已连接且非首次充值时，账户在下，否则在上
  const defaultSortItems = shouldOrderEntryFirst
    ? ["orderEntry", "assets"]   // 账户在下
    : ["assets", "orderEntry"];   // 账户在上
  const [sortableItems, setSortableItems] = useLocalStorage<string[]>(
    OrderEntrySortKeys,
    defaultSortItems
  );

  // 当连接状态或首次充值状态变化时，动态更新面板顺序
  useEffect(() => {
    if (shouldOrderEntryFirst) {
      setSortableItems(["orderEntry", "assets"]);
    } else {
      setSortableItems(["assets", "orderEntry"]);
    }
  }, [shouldOrderEntryFirst]);

  useEffect(() => {
    updateSymbol(symbol);
  }, [symbol]);

  const onSymbolChange = useCallback(
    (data: API.Symbol) => {
      const symbol = data.symbol;
      setSymbol(symbol);

      const searchParamsString = searchParams.toString();
      const queryString = searchParamsString ? `?${searchParamsString}` : "";

      navigate(`/perp/${symbol}${queryString}`);
    },
    [navigate, searchParams]
  );

  const pageMeta = getPageMeta();
  const pageTitle = generatePageTitle(formatSymbol(params.symbol!));

  return (
    <div className="h-full">
      {renderSEOTags(pageMeta, pageTitle)}
      <TradingPage
        symbol={symbol}
        onSymbolChange={onSymbolChange}
        tradingViewConfig={config.tradingPage.tradingViewConfig}
        sharePnLConfig={config.tradingPage.sharePnLConfig}
      />
      <div className="md:hidden pb-2 pt-8 text-center">
        <span className="oui-text-2xs oui-text-base-contrast-54">
          Charts powered by{" "}
          <a
            href="https://tradingview.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            TradingView
          </a>
        </span>
      </div>
    </div>
  );
}
