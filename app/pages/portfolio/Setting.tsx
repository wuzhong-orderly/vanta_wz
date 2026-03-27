import { SettingModule } from "@orderly.network/portfolio";
import { generatePageTitle } from "@/utils/utils";
import { getPageMeta } from "@/utils/seo";
import { renderSEOTags } from "@/utils/seo-tags";

export default function PortfolioSetting() {
  const pageMeta = getPageMeta();
  const pageTitle = generatePageTitle("Setting");

  return (
    <>
      {renderSEOTags(pageMeta, pageTitle)}
      <SettingModule.SettingPage />
    </>
  );
}

