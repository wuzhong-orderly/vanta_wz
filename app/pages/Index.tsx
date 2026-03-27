import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { DEFAULT_SYMBOL } from "@/utils/storage";
import { getPageMeta } from "@/utils/seo";
import { getRuntimeConfig } from "@/utils/runtime-config";
import { renderSEOTags } from "@/utils/seo-tags";

export default function Index() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const searchParamsString = searchParams.toString();
    const redirectPath = `/perp/${DEFAULT_SYMBOL}${searchParamsString ? `?${searchParamsString}` : ''}`;
    navigate(redirectPath);
  }, [navigate, searchParams]);

  const pageMeta = getPageMeta();
  const appName = getRuntimeConfig("VITE_APP_NAME");
  const appDescription = getRuntimeConfig("VITE_APP_DESCRIPTION");

  return (
    <>
      {renderSEOTags(pageMeta, appName || undefined)}
      {appDescription && (
        <Helmet>
          <meta name="description" content={appDescription} />
        </Helmet>
      )}
    </>
  );
}

