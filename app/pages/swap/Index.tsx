import { generatePageTitle } from "@/utils/utils";
import { getPageMeta } from "@/utils/seo";
import { renderSEOTags } from "@/utils/seo-tags";
import { lazy, Suspense } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const WooFiWidget = lazy(() => import("@/components/WooFiWidget"));

export default function SwapIndex() {
  const pageMeta = getPageMeta();
  const pageTitle = generatePageTitle("Swap");

  return (
    <>
      {renderSEOTags(pageMeta, pageTitle)}
      <div className="w-full h-full flex items-center justify-center p-4 pt-8">
        <Suspense fallback={<LoadingSpinner />}>
          <WooFiWidget />
        </Suspense>
      </div>
    </>
  );
}

