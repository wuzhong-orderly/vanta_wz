import { OverviewModule } from "@orderly.network/portfolio";
import { generatePageTitle } from "@/utils/utils";
import { getPageMeta } from "@/utils/seo";
import { renderSEOTags } from "@/utils/seo-tags";

export default function PortfolioIndex() {
  const pageMeta = getPageMeta();
  const pageTitle = generatePageTitle("Portfolio");

  return (
    <div className="oui-portfolio-page">
      {renderSEOTags(pageMeta, pageTitle)}
      <OverviewModule.OverviewPage />
    </div>
  );
}

