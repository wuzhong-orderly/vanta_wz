import { VaultsPage as VaultsPageComponent } from "@orderly.network/vaults";
import { generatePageTitle } from "@/utils/utils";
import { getPageMeta } from "@/utils/seo";
import { renderSEOTags } from "@/utils/seo-tags";

export default function VaultsIndex() {
  const pageMeta = getPageMeta();
  const pageTitle = generatePageTitle("Vaults");

  return (
    <>
      {renderSEOTags(pageMeta, pageTitle)}
      <VaultsPageComponent />
    </>
  );
}

