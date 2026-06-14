import { Outlet } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { MarketCategoriesConfigProvider } from "@orderly.network/hooks";
import OrderlyProvider from "@/components/orderlyProvider";
import { HttpsRequiredWarning } from "@/components/HttpsRequiredWarning";
import { withBasePath } from "./utils/base-path";
import { getSEOConfig, getUserLanguage } from "./utils/seo";
import { marketCategoryConfig } from "./utils/market-category-config";

export default function App() {
  const seoConfig = getSEOConfig();
  const defaultLanguage = getUserLanguage();
  
  return (
    <>
      <Helmet>
        <html lang={seoConfig.language || defaultLanguage} />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/webp" href={withBasePath("/favicon.webp")} />
      </Helmet>
      <HttpsRequiredWarning />
      <OrderlyProvider>
        <MarketCategoriesConfigProvider value={marketCategoryConfig}>
          <Outlet />
        </MarketCategoriesConfigProvider>
      </OrderlyProvider>
    </>
  );
}
