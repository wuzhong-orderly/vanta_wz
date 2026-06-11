import { useEffect, useMemo, useState } from "react";
import { useAccount } from "@orderly.network/hooks";
import { useLocaleCode, useTranslation } from "@orderly.network/i18n";
import {
  AlertCircle,
  CalendarDays,
  Medal,
  RefreshCw,
  Search,
  Sparkles,
  Trophy,
  Wallet
} from "lucide-react";
import { generatePageTitle } from "@/utils/utils";
import { getPageMeta } from "@/utils/seo";
import { renderSEOTags } from "@/utils/seo-tags";
import { getRuntimeConfig } from "@/utils/runtime-config";
import "./points.css";

type CampaignConfig = {
  campaignNumber: number;
  campaignName: string;
  totalVantaPoints: string;
  startTime: string;
  endTime: string;
  distributionCsv: string;
  status?: "DRAFT" | "ACTIVE" | "ENDED" | "SETTLED";
};

type UserPointsResponse = {
  address: string;
  settledPoints: string;
  specialPoints: string;
  currentPoint: string;
  totalPoint: string;
  remark: string;
};

type LeaderboardRow = UserPointsResponse & {
  rank: number;
};

type LoadState = "idle" | "loading" | "error";

const POINTS_API_BASE_URL =
  (getRuntimeConfig("VITE_POINTS_API_BASE_URL") || "").replace(/\/+$/, "");

export default function PointsIndex() {
  const { t } = useTranslation();
  const locale = useLocaleCode();
  const pageMeta = getPageMeta();
  const pageTitle = generatePageTitle(t("points.pageTitle", "Points"));
  const { account } = useAccount();
  const connectedAddress = account.address ?? "";

  const [campaign, setCampaign] = useState<CampaignConfig | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [userPoints, setUserPoints] = useState<UserPointsResponse | null>(null);
  const [addressInput, setAddressInput] = useState("");
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState("");

  const lookupAddress = addressInput.trim() || connectedAddress;

  useEffect(() => {
    void loadPageData(connectedAddress);
  }, [connectedAddress]);

  const topThree = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);
  const tableRows = useMemo(() => leaderboard.slice(0, 100), [leaderboard]);
  const userRank = useMemo(() => {
    if (!lookupAddress) {
      return null;
    }

    return (
      leaderboard.find(
        (row) => row.address.toLowerCase() === lookupAddress.toLowerCase()
      )?.rank ?? null
    );
  }, [leaderboard, lookupAddress]);

  async function loadPageData(address = lookupAddress) {
    try {
      setLoadState("loading");
      setError("");

      const [campaignResponse, leaderboardResponse] = await Promise.all([
        fetchJson<{ campaign: CampaignConfig | null }>("/points-api/campaign/latest"),
        fetchJson<{ items: LeaderboardRow[] }>("/points-api/leaderboard/total")
      ]);

      setCampaign(campaignResponse.campaign);
      setLeaderboard(leaderboardResponse.items);

      if (address) {
        setUserPoints(await fetchJson<UserPointsResponse>(`/points-api/points/${address}`));
      } else {
        setUserPoints(null);
      }

      setLoadState("idle");
    } catch (nextError) {
      setLoadState("error");
      setError(
        nextError instanceof Error
          ? nextError.message
          : t("points.errors.loadPoints", "Failed to load points")
      );
    }
  }

  async function lookupUser() {
    if (!lookupAddress) {
      setUserPoints(null);
      return;
    }

    try {
      setLoadState("loading");
      setError("");
      setUserPoints(await fetchJson<UserPointsResponse>(`/points-api/points/${lookupAddress}`));
      setLoadState("idle");
    } catch (nextError) {
      setLoadState("error");
      setError(
        nextError instanceof Error
          ? nextError.message
          : t("points.errors.loadUserPoints", "Failed to load user points")
      );
    }
  }

  return (
    <>
      {renderSEOTags(pageMeta, pageTitle)}
      <div className="points-page">
        <section className="points-header">
          <div>
            <div className="points-eyebrow">
              <Sparkles size={16} />
              {t("points.eyebrow", "Vanta Genesis Points")}
            </div>
            <h1>{campaign?.campaignName ?? t("points.fallbackCampaign", "Points Campaign")}</h1>
            <div className="points-campaign-meta">
              <span className={`points-status-badge ${statusClassName(campaign?.status)}`}>
                {t("points.latestCampaign", "Latest Campaign")}:{" "}
                {formatCampaignStatus(campaign?.status)}
              </span>
              <span>
                <Trophy size={16} />
                {t("points.currentPointPool", "Current Point Pool")}{" "}
                {formatPoints(campaign?.totalVantaPoints ?? "0", locale)}
              </span>
              <span>
                <CalendarDays size={16} />
                {campaign
                  ? formatDateRange(campaign.startTime, campaign.endTime, locale)
                  : t("common.loading", "Loading")}
              </span>
            </div>
          </div>

          <button
            className="points-icon-button"
            onClick={() => void loadPageData()}
            title={t("points.refresh", "Refresh points")}
          >
            <RefreshCw size={18} />
          </button>
        </section>

        {error ? (
          <div className="points-alert">
            <AlertCircle size={18} />
            {error}
          </div>
        ) : null}

        <section className="points-summary-grid">
          <PointMetric
            label={t("points.totalPoints", "Total Points")}
            value={userPoints?.totalPoint ?? "0"}
            subLabel={
              userRank
                ? `${t("points.rank", "Rank")} #${userRank}`
                : t("points.noRankYet", "No rank yet")
            }
            locale={locale}
          />
          <PointMetric
            label={t("points.currentCampaign", "My Current Points")}
            value={userPoints?.currentPoint ?? "0"}
            subLabel={t("points.vantaPoints", "Vanta points")}
            locale={locale}
          />
          <PointMetric
            label={t("points.pastCampaigns", "Past Campaigns")}
            value={userPoints?.settledPoints ?? "0"}
            subLabel={t("points.accumulated", "Accumulated")}
            locale={locale}
          />
          <PointMetric
            label={t("points.specialPoints", "Special Points")}
            value={userPoints?.specialPoints ?? "0"}
            subLabel={t("points.settled", "Settled")}
            locale={locale}
          />
        </section>

        <section className="points-leaderboard">
          <div className="points-section-title">
            <div>
              <h2>{t("points.totalPointsLeaderboard", "Total Points Leaderboard")}</h2>
              <p>
                {t(
                  "points.leaderboardDescription",
                  "Ranked by past plus current Vanta points."
                )}
              </p>
            </div>
            <span>
              {loadState === "loading"
                ? t("common.loading", "Loading")
                : `${leaderboard.length} ${t("points.users", "users")}`}
            </span>
          </div>

          <div className="points-podium">
            {topThree.map((row) => (
              <div className="points-podium-item" key={row.address}>
                <Medal size={22} />
                <span>#{row.rank}</span>
                <strong>{formatPoints(row.totalPoint, locale)}</strong>
                <small>{formatAddress(row.address)}</small>
              </div>
            ))}
          </div>

          <div className="points-table-wrap">
            <table className="points-table">
              <thead>
                <tr>
                  <th>{t("points.rank", "Rank")}</th>
                  <th>{t("points.address", "Address")}</th>
                  <th>{t("points.totalPoints", "Total Points")}</th>
                  <th>{t("points.current", "Current")}</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr
                    className={
                      lookupAddress &&
                      row.address.toLowerCase() === lookupAddress.toLowerCase()
                        ? "is-current-user"
                        : undefined
                    }
                    key={`${row.rank}-${row.address}`}
                  >
                    <td>#{row.rank}</td>
                    <td>{formatAddress(row.address)}</td>
                    <td>{formatPoints(row.totalPoint, locale)}</td>
                    <td>{formatPoints(row.currentPoint, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

function PointMetric({
  label,
  value,
  subLabel,
  locale
}: {
  label: string;
  value: string;
  subLabel: string;
  locale: string;
}) {
  return (
    <div className="points-metric">
      <span>{label}</span>
      <strong>{formatPoints(value, locale)}</strong>
      <small>{subLabel}</small>
    </div>
  );
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(resolvePointsApiUrl(url));

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<T>;
}

function resolvePointsApiUrl(url: string) {
  if (!POINTS_API_BASE_URL) {
    return url;
  }

  const normalizedPath = url.startsWith("/points-api/")
    ? `/api/${url.slice("/points-api/".length)}`
    : url.startsWith("/")
      ? url
      : `/${url}`;

  return `${POINTS_API_BASE_URL}${normalizedPath}`;
}

function formatPoints(value: string, locale = "en") {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return value;
  }

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 4
  }).format(number);
}

function formatAddress(address: string) {
  if (!address) {
    return "-";
  }

  if (address.length <= 12) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDateRange(startTime: string, endTime: string, locale = "en") {
  const formatter = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  return `${formatter.format(new Date(startTime))} - ${formatter.format(new Date(endTime))}`;
}

function formatCampaignStatus(status?: "DRAFT" | "ACTIVE" | "ENDED" | "SETTLED") {
  return status ?? "UNKNOWN";
}

function statusClassName(status?: "DRAFT" | "ACTIVE" | "ENDED" | "SETTLED") {
  if (!status) {
    return "is-unknown";
  }

  return `is-${status.toLowerCase()}`;
}
