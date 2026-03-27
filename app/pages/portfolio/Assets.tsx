import { AssetsModule } from "@orderly.network/portfolio";
import { generatePageTitle } from "@/utils/utils";
import { getPageMeta } from "@/utils/seo";
import { renderSEOTags } from "@/utils/seo-tags";

export default function PortfolioAssets() {
  const pageMeta = getPageMeta();
  const pageTitle = generatePageTitle("Assets");

  return (
    <>
      {renderSEOTags(pageMeta, pageTitle)}
      <AssetsModule.AssetsPage />
    </>
  );
}

