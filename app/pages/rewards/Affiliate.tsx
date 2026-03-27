import { Helmet } from "react-helmet-async";
import { generatePageTitle } from "@/utils/utils";
import { Dashboard, ReferralProvider } from "@orderly.network/affiliate";
import { getRuntimeConfig } from "@/utils/runtime-config";

export default function RewardsAffiliate() {
  const brokerName = getRuntimeConfig("VITE_ORDERLY_BROKER_NAME");
  const referralLinkUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://orderly.network";

  return (
    <>
      <Helmet>
        <title>{generatePageTitle("Affiliate")}</title>
      </Helmet>
      <ReferralProvider
        becomeAnAffiliateUrl="https://orderly.network"
        learnAffiliateUrl="https://orderly.network"
        referralLinkUrl={referralLinkUrl}
        overwrite={{
          shortBrokerName: brokerName,
          brokerName: brokerName,
        }}
      >
        <Dashboard.DashboardPage
          classNames={{
            root: "oui-flex oui-justify-center",
            home: "oui-py-6 oui-px-4 lg:oui-px-6 lg:oui-py-12 xl:oui-pl-4 xl:oui-pr-6 oui-w-full",
            dashboard: "oui-py-6 oui-px-4 lg:oui-px-6 xl:oui-pl-3 xl:oui-pr-6",
          }}
        />
      </ReferralProvider>
    </>
  );
}
