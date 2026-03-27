import { FeeTierModule } from "@orderly.network/portfolio";
import { generatePageTitle } from "@/utils/utils";
import { getPageMeta } from "@/utils/seo";
import { renderSEOTags } from "@/utils/seo-tags";

export default function PortfolioFee() {
  const pageMeta = getPageMeta();
  const pageTitle = generatePageTitle("Fee");

  return (
    <>
      {renderSEOTags(pageMeta, pageTitle)}
      <FeeTierModule.FeeTierPage dataAdapter={() => ({
        columns: [],
        dataSource: [],
      })} />
    </>
  );
}

