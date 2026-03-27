import { generatePageTitle } from "@/utils/utils";
import { getPageMeta } from "@/utils/seo";
import { renderSEOTags } from "@/utils/seo-tags";
import { CustomPointSystemPage } from "@/components/customOrderlyComponent/CustomPointSystemPage";
import { getSymbol } from "@/utils/storage";
import { useNavigate } from "react-router-dom";
import { RouteOption } from "@orderly.network/types";

export default function PointsIndex() {
  const pageMeta = getPageMeta();
  const pageTitle = generatePageTitle("Points");
  const navigate = useNavigate();

  const onRouteChange = (pathObject: RouteOption) => {
    const path = pathObject.href;
    if (path && path === "/perp") {
      const symbol = getSymbol();
      navigate(`/perp/${symbol}`);
    }
  };

  return (
    <>
      {renderSEOTags(pageMeta, pageTitle)}
      <CustomPointSystemPage onRouteChange={onRouteChange} />
    </>
  );
}
