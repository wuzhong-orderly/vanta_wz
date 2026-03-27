import { FC } from "react";
import { PointSystemPage } from "@orderly.network/trading-points";
import { RouteOption } from "@orderly.network/types";

type CustomPointSystemPageProps = {
    onRouteChange: (option: RouteOption) => void;
};

/**
 * Custom PointSystemPage wrapper that limits the ranking to top 100.
 *
 * The actual pageSize and pagination total are patched via the
 * `limitPointsRankingTop100Plugin` Vite plugin in vite.config.ts,
 * which transforms the @orderly.network/trading-points module at build time:
 * - pageSize: 10 → 100 (fetches top 100 in a single page)
 * - pagination total capped at 100 (no navigation beyond first page)
 */
export const CustomPointSystemPage: FC<CustomPointSystemPageProps> = (
    props
) => {
    return <PointSystemPage onRouteChange={props.onRouteChange} />;
};
