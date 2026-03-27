import { APIManagerModule } from "@orderly.network/portfolio";
import { generatePageTitle } from "@/utils/utils";
import { getPageMeta } from "@/utils/seo";
import { renderSEOTags } from "@/utils/seo-tags";

export default function PortfolioApiKey() {
  const pageMeta = getPageMeta();
  const pageTitle = generatePageTitle("API Key");

  return (
    <>
      {renderSEOTags(pageMeta, pageTitle)}
      <APIManagerModule.APIManagerPage />
    </>
  );
}

