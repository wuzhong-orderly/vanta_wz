import { useEffect, useMemo, useState } from "react";
import { useAccount } from "@orderly.network/hooks";
import { useLocaleCode, useTranslation } from "@orderly.network/i18n";
import {
  AlertCircle,
  CalendarDays,
  Medal,
  RefreshCw,
  Trophy
} from "lucide-react";
import { generatePageTitle } from "@/utils/utils";
import { getPageMeta } from "@/utils/seo";
import { renderSEOTags } from "@/utils/seo-tags";
import { resolvePointsApiUrl as resolvePointsApiUrlFromRuntime } from "@/utils/points-api";
import "./points.css";

type CampaignConfig = {
  campaignNumber: number;
  campaignName: string;
  totalVantaPoints: string;
  startTime: string;
  endTime: string;
  distributionCsv: string;
  currentCampaign?: boolean;
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

type CampaignPointsRow = {
  campaignNumber: number;
  campaignName: string;
  status?: CampaignConfig["status"];
  startTime: string;
  endTime: string;
  points: string;
};

type CampaignLeaderboardRow = {
  rank: number;
  address: string;
  campaignNumber: number;
  points: string;
};

type DisplayLeaderboardRow = LeaderboardRow | CampaignLeaderboardRow;
type LeaderboardMode = "total" | `campaign-${number}`;
type LoadState = "idle" | "loading" | "error";

const MAX_LEADERBOARD_ITEMS = 100;
const LEADERBOARD_PAGE_SIZE = 20;

export default function PointsIndex() {
  const { t } = useTranslation();
  const locale = useLocaleCode();
  const pageMeta = getPageMeta();
  const pageTitle = generatePageTitle(t("points.pageTitle", "Points"));
  const { account } = useAccount();
  const connectedAddress = account.address ?? "";

  const [campaign, setCampaign] = useState<CampaignConfig | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignConfig[]>([]);
  const [leaderboard, setLeaderboard] = useState<DisplayLeaderboardRow[]>([]);
  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const [leaderboardMode, setLeaderboardMode] = useState<LeaderboardMode>("total");
  const [userPoints, setUserPoints] = useState<UserPointsResponse | null>(null);
  const [campaignPoints, setCampaignPoints] = useState<CampaignPointsRow[]>([]);
  const [pastPointsMode, setPastPointsMode] = useState<"total" | `campaign-${number}`>("total");
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState("");

  const lookupAddress = connectedAddress;

  useEffect(() => {
    void loadPageData(connectedAddress);
  }, [connectedAddress]);

  useEffect(() => {
    void loadLeaderboard(leaderboardMode);
  }, [leaderboardMode]);

  const topHundredRows = useMemo(
    () => leaderboard.slice(0, MAX_LEADERBOARD_ITEMS),
    [leaderboard]
  );
  const topThree = useMemo(() => topHundredRows.slice(0, 3), [topHundredRows]);
  const leaderboardTotalPages = useMemo(
    () => Math.max(1, Math.ceil(topHundredRows.length / LEADERBOARD_PAGE_SIZE)),
    [topHundredRows.length]
  );
  const tableRows = useMemo(() => {
    const startIndex = (leaderboardPage - 1) * LEADERBOARD_PAGE_SIZE;
    return topHundredRows.slice(startIndex, startIndex + LEADERBOARD_PAGE_SIZE);
  }, [leaderboardPage, topHundredRows]);
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
  const selectedPastPoints = useMemo(() => {
    if (pastPointsMode === "total") {
      return userPoints?.totalPoint ?? "0";
    }

    const campaignNumber = Number(pastPointsMode.replace("campaign-", ""));
    return (
      campaignPoints.find((row) => row.campaignNumber === campaignNumber)?.points ?? "0"
    );
  }, [campaignPoints, pastPointsMode, userPoints?.totalPoint]);
  const isCampaignLeaderboard = leaderboardMode !== "total";

  useEffect(() => {
    setLeaderboardPage(1);
  }, [leaderboardMode, topHundredRows.length]);

  async function loadPageData(address = lookupAddress) {
    try {
      setLoadState("loading");
      setError("");

      const [campaignResponse, campaignsResponse] = await Promise.all([
        fetchJson<{ campaign: CampaignConfig | null }>("/points-api/campaign/current"),
        fetchJson<{ items: CampaignConfig[] }>("/points-api/campaigns")
      ]);
      const defaultLeaderboardMode = campaignResponse.campaign
        ? (`campaign-${campaignResponse.campaign.campaignNumber}` as const)
        : "total";
      const leaderboardResponse =
        defaultLeaderboardMode === "total"
          ? await fetchJson<{ items: LeaderboardRow[] }>("/points-api/leaderboard/total")
          : await fetchJson<{ items: CampaignLeaderboardRow[] }>(
              `/points-api/leaderboard/campaign/${campaignResponse.campaign?.campaignNumber}`
            );

      setCampaign(campaignResponse.campaign);
      setCampaigns(campaignsResponse.items);
      setLeaderboard(leaderboardResponse.items);
      setLeaderboardMode(defaultLeaderboardMode);

      if (address) {
        const [nextUserPoints, nextCampaignPoints] = await Promise.all([
          fetchJson<UserPointsResponse>(`/points-api/points/${address}`),
          fetchJson<{ items: CampaignPointsRow[] }>(`/points-api/points/${address}/campaigns`)
        ]);

        setUserPoints(nextUserPoints);
        setCampaignPoints(nextCampaignPoints.items);
      } else {
        setUserPoints(null);
        setCampaignPoints([]);
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

  async function loadLeaderboard(mode: LeaderboardMode) {
    try {
      setLoadState("loading");
      setError("");

      const response =
        mode === "total"
          ? await fetchJson<{ items: LeaderboardRow[] }>("/points-api/leaderboard/total")
          : await fetchJson<{ items: CampaignLeaderboardRow[] }>(
              `/points-api/leaderboard/campaign/${mode.replace("campaign-", "")}`
            );

      setLeaderboard(response.items);
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

  return (
    <>
      {renderSEOTags(pageMeta, pageTitle)}
      <div className="points-page">
        <section className="points-total-banner">
          <div>
            <span>{t("points.myTotalPoints", "My Total Points")}</span>
            <strong>{formatPoints(userPoints?.totalPoint ?? "0", locale)}</strong>
          </div>
          <div className="points-total-banner-meta">
            <span>
              {userRank
                ? `${t("points.rank", "Rank")} #${userRank}`
                : t("points.noRankYet", "No rank yet")}
            </span>
            <button
              className="points-icon-button"
              onClick={() => void loadPageData()}
              title={t("points.refresh", "Refresh points")}
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </section>

        <section className="points-header">
          <div>
            <h1>{campaign?.campaignName ?? t("points.fallbackCampaign", "Points Campaign")}</h1>
            <div className="points-campaign-meta">
              <span className={`points-status-badge ${statusClassName(campaign?.status)}`}>
                {t("points.currentCampaignLabel", "Current Campaign")}:{" "}
                {formatCampaignStatus(campaign?.status)}
              </span>
              <span>
                <Trophy size={16} />
                {t("points.totalPointsPool", "Total Points Pool")}{" "}
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
            label={t("points.totalPointsPool", "Total Points Pool")}
            value={campaign?.totalVantaPoints ?? "0"}
            subLabel={t("points.campaignPool", "Campaign pool")}
            locale={locale}
          />
          <PointMetric
            label={t("points.currentCampaign", "My Point in Current Campaign")}
            value={userPoints?.currentPoint ?? "0"}
            subLabel={t("points.vantaPoints", "Vanta points")}
            locale={locale}
          />
          <PointMetricWithSelect
            title={t("points.campaignHistory", "Campaign history")}
            value={selectedPastPoints}
            locale={locale}
            selectLabel={t("points.selectPastPoints", "Select past points")}
            valueMode={pastPointsMode}
            onChange={(value) => setPastPointsMode(value)}
            options={[
              {
                value: "total",
                label: t("points.accumulatedVantaPoints", "Accumulated Vanta Points")
              },
              ...campaignPoints.map((row) => ({
                value: `campaign-${row.campaignNumber}` as const,
                label: getCampaignDisplayName(row)
              }))
            ]}
          />
        </section>

        <section className="points-leaderboard">
          <div className="points-section-title">
            <select
              aria-label={t("points.selectLeaderboard", "Select leaderboard")}
              className="points-select points-title-select"
              onChange={(event) => setLeaderboardMode(event.target.value as LeaderboardMode)}
              value={leaderboardMode}
            >
              <option value="total">{t("points.totalPointsLeaderboard", "Total Points Leaderboard")}</option>
              {campaigns.map((item) => (
                <option key={item.campaignNumber} value={`campaign-${item.campaignNumber}`}>
                  {`${getCampaignDisplayName(item)} Leaderboard`}
                </option>
              ))}
            </select>
          </div>

          <div className="points-podium">
            {topThree.map((row) => (
              <div className="points-podium-item" key={row.address}>
                <Medal size={22} />
                <span>#{row.rank}</span>
                <strong>{formatPoints(getLeaderboardPoints(row), locale)}</strong>
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
                  <th>
                    {isCampaignLeaderboard
                      ? t("points.points", "Points")
                      : t("points.totalPoints", "Total Points")}
                  </th>
                  {!isCampaignLeaderboard ? (
                    <th>{t("points.current", "Current Points")}</th>
                  ) : null}
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
                    <td>{formatPoints(getLeaderboardPoints(row), locale)}</td>
                    {!isCampaignLeaderboard ? (
                      <td>{formatPoints((row as LeaderboardRow).currentPoint, locale)}</td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="points-pagination">
            <button
              className="points-icon-button"
              disabled={leaderboardPage <= 1 || loadState === "loading"}
              onClick={() => setLeaderboardPage((prev) => Math.max(1, prev - 1))}
              type="button"
            >
              {t("common.previous", "Previous")}
            </button>
            <span>
              {t("points.page", "Page")} {leaderboardPage} / {leaderboardTotalPages}
            </span>
            <button
              className="points-icon-button"
              disabled={leaderboardPage >= leaderboardTotalPages || loadState === "loading"}
              onClick={() =>
                setLeaderboardPage((prev) => Math.min(leaderboardTotalPages, prev + 1))
              }
              type="button"
            >
              {t("common.next", "Next")}
            </button>
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

function PointMetricWithSelect({
  title,
  value,
  locale,
  selectLabel,
  valueMode,
  onChange,
  options
}: {
  title: string;
  value: string;
  locale: string;
  selectLabel: string;
  valueMode: "total" | `campaign-${number}`;
  onChange: (value: "total" | `campaign-${number}`) => void;
  options: Array<{
    value: "total" | `campaign-${number}`;
    label: string;
  }>;
}) {
  return (
    <div className="points-metric">
      <span>{title}</span>
      <strong>{formatPoints(value, locale)}</strong>
      <div className="points-select-wrap">
        <select
          aria-label={selectLabel}
          className="points-select points-metric-select points-metric-title-select"
          onChange={(event) => onChange(event.target.value as "total" | `campaign-${number}`)}
          value={valueMode}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span aria-hidden="true">{options.find((option) => option.value === valueMode)?.label}</span>
      </div>
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
  return resolvePointsApiUrlFromRuntime(url);
}

function formatPoints(value: string, locale = "en") {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return value;
  }

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1
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
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  return `${formatter.format(new Date(startTime))} UTC+0 - ${formatter.format(
    new Date(endTime)
  )} UTC+0`;
}

function getLeaderboardPoints(row: DisplayLeaderboardRow) {
  return "points" in row ? row.points : row.totalPoint;
}

function getCampaignDisplayName(campaign: Pick<CampaignConfig, "campaignName" | "campaignNumber">) {
  return campaign.campaignName.trim() || `Campaign ${campaign.campaignNumber}`;
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
