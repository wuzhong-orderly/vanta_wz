import { Box } from "@orderly.network/ui";
import { OrdersModule } from "@orderly.network/portfolio";
import { generatePageTitle } from "@/utils/utils";
import { getPageMeta } from "@/utils/seo";
import { renderSEOTags } from "@/utils/seo-tags";

export default function PortfolioOrders() {
  const pageMeta = getPageMeta();
  const pageTitle = generatePageTitle("Orders");

  return (
    <>
      {renderSEOTags(pageMeta, pageTitle)}
      <Box
        p={6}
        pb={0}
        intensity={900}
        r="xl"
        width="100%"
        style={{
          minHeight: 379,
          maxHeight: 2560,
          overflow: "hidden",
          height: "calc(100vh - 48px - 29px - 48px)",
        }}
      >
        <OrdersModule.OrdersPage />
      </Box>
    </>
  );
}

