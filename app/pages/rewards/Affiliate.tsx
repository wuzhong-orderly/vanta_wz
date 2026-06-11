import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useAccount } from "@orderly.network/hooks";
import { useTranslation } from "@orderly.network/i18n";
import { generatePageTitle } from "@/utils/utils";
import { Dashboard, ReferralProvider } from "@orderly.network/affiliate";
import { getRuntimeConfig } from "@/utils/runtime-config";
import { fetchPointsJson } from "@/utils/points-api";

type UserPointsResponse = {
  address: string;
  specialPoints: string;
};

export default function RewardsAffiliate() {
  const { t } = useTranslation();
  const { account } = useAccount();
  const address = account.address ?? "";
  const brokerName = getRuntimeConfig("VITE_ORDERLY_BROKER_NAME");
  const referralLinkUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://orderly.network";
  const [specialPoints, setSpecialPoints] = useState("0");
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    if (!address) {
      setSpecialPoints("0");
      setLoadState("idle");
      return;
    }

    let isMounted = true;
    setLoadState("loading");

    fetchPointsJson<UserPointsResponse>(`/points-api/points/${address}`)
      .then((payload) => {
        if (!isMounted) {
          return;
        }

        setSpecialPoints(payload.specialPoints || "0");
        setLoadState("idle");
      })
      .catch(() => {
        if (isMounted) {
          setLoadState("error");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [address]);

  return (
    <>
      <Helmet>
        <title>{generatePageTitle(t("common.affiliate"))}</title>
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
        <div className="affiliate-special-points-wrap">
          <section className="affiliate-special-points">
            <div>
              <span>{t("points.specialPoints", "Special Points")}</span>
              <strong>{formatPoints(specialPoints)}</strong>
            </div>
            <small>
              {!address
                ? t("points.connectWalletToView", "Connect wallet to view")
                : loadState === "loading"
                  ? t("common.loading", "Loading")
                  : loadState === "error"
                    ? t("points.errors.loadPoints", "Failed to load points")
                    : formatAddress(address)}
            </small>
          </section>
        </div>
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

function formatPoints(value: string) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return value;
  }

  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1
  }).format(number);
}

function formatAddress(address: string) {
  if (address.length <= 12) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
