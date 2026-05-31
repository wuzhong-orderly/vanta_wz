import { useEffect, useMemo, useState } from "react";
import { useAccount } from "@orderly.network/hooks";
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
import "./points.css";

type CampaignConfig = {
  campaignNumber: number;
  campaignName: string;
  totalVantaPoints: string;
  startTime: string;
  endTime: string;
  distributionCsv: string;
};

type UserPointsResponse = {
  address: string;
  totalAccumulatedPointInPastCampaign: string;
  totalAccumulatedSpecialPointInPastCampaign: string;
  currentPoint: string;
  currentSpecialPoint: string;
  totalPoint: string;
  totalSpecialPoint: string;
  remark: string;
};

type LeaderboardRow = UserPointsResponse & {
  rank: number;
};

type LoadState = "idle" | "loading" | "error";

export default function PointsIndex() {
  const pageMeta = getPageMeta();
  const pageTitle = generatePageTitle("Points");
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
        fetchJson<{ campaign: CampaignConfig }>("/points-api/campaign/current"),
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
      setError(nextError instanceof Error ? nextError.message : "Failed to load points");
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
      setError(nextError instanceof Error ? nextError.message : "Failed to load user points");
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
              Vanta Genesis Points
            </div>
            <h1>{campaign?.campaignName ?? "Points Campaign"}</h1>
            <div className="points-campaign-meta">
              <span>
                <Trophy size={16} />
                Current Point Pool {formatPoints(campaign?.totalVantaPoints ?? "0")}
              </span>
              <span>
                <CalendarDays size={16} />
                {campaign ? formatDateRange(campaign.startTime, campaign.endTime) : "Loading"}
              </span>
            </div>
          </div>

          <button
            className="points-icon-button"
            onClick={() => void loadPageData()}
            title="Refresh points"
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
            label="Total Points"
            value={userPoints?.totalPoint ?? "0"}
            subLabel={userRank ? `Rank #${userRank}` : "No rank yet"}
          />
          <PointMetric
            label="Current Campaign"
            value={userPoints?.currentPoint ?? "0"}
            subLabel="Vanta points"
          />
          <PointMetric
            label="Past Campaigns"
            value={userPoints?.totalAccumulatedPointInPastCampaign ?? "0"}
            subLabel="Accumulated"
          />
          <PointMetric
            label="Special Points"
            value={userPoints?.totalSpecialPoint ?? "0"}
            subLabel={`${formatPoints(userPoints?.currentSpecialPoint ?? "0")} current`}
          />
        </section>

        <section className="points-leaderboard">
          <div className="points-section-title">
            <div>
              <h2>Total Points Leaderboard</h2>
              <p>Ranked by past plus current Vanta points.</p>
            </div>
            <span>{loadState === "loading" ? "Loading" : `${leaderboard.length} users`}</span>
          </div>

          <div className="points-podium">
            {topThree.map((row) => (
              <div className="points-podium-item" key={row.address}>
                <Medal size={22} />
                <span>#{row.rank}</span>
                <strong>{formatPoints(row.totalPoint)}</strong>
                <small>{formatAddress(row.address)}</small>
              </div>
            ))}
          </div>

          <div className="points-table-wrap">
            <table className="points-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Address</th>
                  <th>Total Points</th>
                  <th>Current</th>
                  <th>Special</th>
                  <th>Remark</th>
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
                    <td>{formatPoints(row.totalPoint)}</td>
                    <td>{formatPoints(row.currentPoint)}</td>
                    <td>{formatPoints(row.totalSpecialPoint)}</td>
                    <td>{row.remark || "-"}</td>
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
  subLabel
}: {
  label: string;
  value: string;
  subLabel: string;
}) {
  return (
    <div className="points-metric">
      <span>{label}</span>
      <strong>{formatPoints(value)}</strong>
      <small>{subLabel}</small>
    </div>
  );
}

function BreakdownItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{formatPoints(value)}</strong>
    </div>
  );
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<T>;
}

function formatPoints(value: string) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return value;
  }

  return new Intl.NumberFormat("en-US", {
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

function formatDateRange(startTime: string, endTime: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  return `${formatter.format(new Date(startTime))} - ${formatter.format(new Date(endTime))}`;
}
