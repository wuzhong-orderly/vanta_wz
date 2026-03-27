import { GeneralLeaderboardWidget } from "@orderly.network/trading-leaderboard";
import { generatePageTitle } from "@/utils/utils";
import { getPageMeta } from "@/utils/seo";
import { renderSEOTags } from "@/utils/seo-tags";

export default function LeaderboardIndex() {
  const pageMeta = getPageMeta();
  const pageTitle = generatePageTitle("Leaderboard");

  return (
    <>
      {renderSEOTags(pageMeta, pageTitle)}
      <div className="oui-py-6 oui-px-4 lg:oui-px-6 xl:oui-pl-4 lx:oui-pr-6">
        <GeneralLeaderboardWidget />
      </div>
    </>
  );
}

