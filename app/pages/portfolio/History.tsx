import { getPageMeta } from "@/utils/seo";
import { generatePageTitle } from "@/utils/utils";
import { HistoryModule } from "@orderly.network/portfolio";
import { renderSEOTags } from "@/utils/seo-tags";

export default function PortfolioHistory() {
  const pageMeta = getPageMeta();
  const pageTitle = generatePageTitle("History");

  return (
    <>
      {renderSEOTags(pageMeta, pageTitle)}
      <div className={"history-page"}>
        <HistoryModule.HistoryPage />
      </div>
    </>
  );
}

