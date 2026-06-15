import { BarChart3, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import type {
  BrokerMarketStats,
  BrokerOverviewStats,
  BrokerRiskStats,
  BrokerUserStats
} from "../types";
import { formatNumber } from "../utils";

type StatsView = "broker" | "markets" | "users";

export function BrokerStatsPage({
  brokerId,
  startDate,
  endDate,
  overview,
  markets,
  risk,
  users,
  onRefresh,
  loading
}: {
  brokerId: string;
  startDate: string;
  endDate: string;
  overview: BrokerOverviewStats | null;
  markets: BrokerMarketStats | null;
  risk: BrokerRiskStats | null;
  users: BrokerUserStats | null;
  onRefresh: (brokerId: string, startDate: string, endDate: string) => Promise<void>;
  loading: boolean;
}) {
  const [inputBrokerId, setInputBrokerId] = useState(brokerId);
  const [inputStartDate, setInputStartDate] = useState(startDate);
  const [inputEndDate, setInputEndDate] = useState(endDate);
  const [activeStatsView, setActiveStatsView] = useState<StatsView>("broker");

  const generatedAtText = useMemo(() => {
    const source =
      users?.generatedAt ?? risk?.generatedAt ?? markets?.generatedAt ?? overview?.generatedAt;

    if (!source) {
      return "-";
    }

    return new Date(source).toLocaleString();
  }, [markets?.generatedAt, overview?.generatedAt, risk?.generatedAt, users?.generatedAt]);

  const tvlUpdatedAtText = useMemo(() => {
    if (!overview?.tvlUpdatedAt) {
      return "-";
    }

    return new Date(overview.tvlUpdatedAt).toLocaleString();
  }, [overview?.tvlUpdatedAt]);

  return (
    <div className="panel stats-page">
      <div className="panel-actions stats-toolbar">
        <div className="panel-title">
          <BarChart3 size={18} />
          <span>Broker Stats Dashboard</span>
          <strong>{markets?.rows.length ?? 0} markets</strong>
        </div>
        <label className="stats-broker-input">
          <span>Broker ID</span>
          <input
            onChange={(event) => setInputBrokerId(event.target.value)}
            placeholder="e.g. vanta_exchange"
            value={inputBrokerId}
          />
        </label>
        <label className="stats-date-input">
          <span>Start date</span>
          <input
            onChange={(event) => setInputStartDate(event.target.value)}
            type="date"
            value={inputStartDate}
          />
        </label>
        <label className="stats-date-input">
          <span>End date</span>
          <input
            onChange={(event) => setInputEndDate(event.target.value)}
            type="date"
            value={inputEndDate}
          />
        </label>
        <button
          className="secondary-button"
          disabled={loading || !inputBrokerId.trim() || !inputStartDate || !inputEndDate}
          onClick={() => void onRefresh(inputBrokerId.trim(), inputStartDate, inputEndDate)}
        >
          <RefreshCw className={loading ? "spin-icon" : ""} size={16} />
          Refresh
        </button>
      </div>

      <div className="sub-tabs stats-tabs">
        <button
          className={activeStatsView === "broker" ? "active" : ""}
          onClick={() => setActiveStatsView("broker")}
        >
          Broker Scope
        </button>
        <button
          className={activeStatsView === "markets" ? "active" : ""}
          onClick={() => setActiveStatsView("markets")}
        >
          Market Aggregation
        </button>
        <button
          className={activeStatsView === "users" ? "active" : ""}
          onClick={() => setActiveStatsView("users")}
        >
          User Aggregation
        </button>
      </div>

      <div className="inline-message">
        Range: <span className="mono">{inputStartDate || "-"} to {inputEndDate || "-"}</span>
        <span className="stats-message-divider" />
        Snapshot time: <span className="mono">{generatedAtText}</span>
        <span className="stats-message-divider" />
        TVL update: <span className="mono">{tvlUpdatedAtText}</span>
      </div>

      {activeStatsView === "broker" ? (
        <BrokerScopeView overview={overview} risk={risk} users={users} />
      ) : null}

      {activeStatsView === "markets" ? <MarketAggregationView markets={markets} /> : null}

      {activeStatsView === "users" ? <UserAggregationView risk={risk} users={users} /> : null}
    </div>
  );
}

function BrokerScopeView({
  overview,
  risk,
  users
}: {
  overview: BrokerOverviewStats | null;
  risk: BrokerRiskStats | null;
  users: BrokerUserStats | null;
}) {
  return (
    <>
      <div className="stats-section-title">Overview</div>
      <div className="metrics-grid stats-metrics-grid stats-metrics-wide">
        <Metric label="Connected users" value={overview?.connectedUsers ?? 0} />
        <Metric label="Leaderboard users" value={users?.totalUsers || users?.returnedUsers || 0} />
        <Metric label="TVL" value={overview?.totalTvl ?? 0} />
        <Metric label="Unsettled PnL" value={overview?.totalUnsettledBalance ?? 0} />
      </div>

      <div className="stats-section-title">Volume</div>
      <div className="metrics-grid stats-metrics-grid stats-metrics-wide">
        <Metric label="Today volume" value={overview?.volumeToday ?? 0} />
        <Metric label="24h volume" value={overview?.volume24h ?? 0} />
        <Metric label="7d volume" value={overview?.volume7d ?? 0} />
        <Metric label="30d volume" value={overview?.volume30d ?? 0} />
        <Metric label="YTD volume" value={overview?.volumeYtd ?? 0} />
        <Metric label="LTD volume" value={overview?.volumeLtd ?? 0} />
      </div>

      <div className="stats-section-title">Broker Fee</div>
      <div className="metrics-grid stats-metrics-grid stats-metrics-wide">
        <Metric label="Broker fee" value={users?.brokerFee ?? 0} />
        <Metric label="Total fee" value={users?.totalFee ?? 0} />
        <Metric label="Leaderboard volume" value={users?.totalPerpVolume ?? 0} />
        <Metric label="Realized PnL" value={users?.totalRealizedPnl ?? 0} />
      </div>

      <div className="stats-section-title">Position Risk</div>
      <div className="metrics-grid stats-metrics-grid stats-metrics-wide">
        <Metric label="Open positions" value={risk?.totalPositions ?? 0} />
        <Metric label="Long notional" value={risk?.totalLongNotional ?? 0} />
        <Metric label="Short notional" value={risk?.totalShortNotional ?? 0} />
        <article className="metric">
          <span>Long/short skew</span>
          <strong>{formatPercent(risk?.longShortSkew ?? 0)}</strong>
        </article>
      </div>
    </>
  );
}

function MarketAggregationView({ markets }: { markets: BrokerMarketStats | null }) {
  return (
    <>
      <div className="stats-section-title">Broker Markets</div>
      <div className="table-wrap stats-table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Symbol</th>
              <th>24h Volume</th>
              <th>24h Amount</th>
              <th>Open Interest</th>
            </tr>
          </thead>
          <tbody>
            {(markets?.rows ?? []).map((row, index) => (
              <tr key={row.symbol}>
                <td>{index + 1}</td>
                <td className="mono">{row.symbol}</td>
                <td>{formatNumber(row.volume24h)}</td>
                <td>{formatNumber(row.amount24h)}</td>
                <td>{formatNumber(row.openInterest)}</td>
              </tr>
            ))}
            {markets?.rows.length === 0 ? (
              <tr>
                <td className="empty-table-cell" colSpan={5}>
                  No market rows returned for this broker.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

function UserAggregationView({
  risk,
  users
}: {
  risk: BrokerRiskStats | null;
  users: BrokerUserStats | null;
}) {
  return (
    <>
      {users?.error ? <div className="inline-message error">{users.error}</div> : null}

      <div className="stats-section-title">Leaderboard Summary</div>
      <div className="metrics-grid stats-metrics-grid stats-metrics-wide">
        <Metric label="Returned users" value={users?.returnedUsers ?? 0} />
        <Metric label="Perp volume" value={users?.totalPerpVolume ?? 0} />
        <Metric label="Maker volume" value={users?.totalMakerVolume ?? 0} />
        <Metric label="Taker volume" value={users?.totalTakerVolume ?? 0} />
        <Metric label="Realized PnL" value={users?.totalRealizedPnl ?? 0} />
        <Metric label="Broker fee" value={users?.brokerFee ?? 0} />
      </div>

      <div className="stats-section-title">Builder Leaderboard</div>
      <div className="table-wrap stats-table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Address</th>
              <th>Account</th>
              <th>Perp Volume</th>
              <th>Maker Volume</th>
              <th>Taker Volume</th>
              <th>Realized PnL</th>
              <th>Total Fee</th>
              <th>Broker Fee</th>
            </tr>
          </thead>
          <tbody>
            {(users?.rows ?? []).map((row) => (
              <tr key={`${row.accountId}-${row.address}-${row.rank}`}>
                <td>{row.rank}</td>
                <td className="mono">{shortAddress(row.address)}</td>
                <td className="mono">{shortAddress(row.accountId)}</td>
                <td>{formatNumber(row.perpVolume)}</td>
                <td>{formatNumber(row.perpMakerVolume)}</td>
                <td>{formatNumber(row.perpTakerVolume)}</td>
                <td>{formatNumber(row.realizedPnl)}</td>
                <td>{formatNumber(row.totalFee)}</td>
                <td>{formatNumber(row.brokerFee)}</td>
              </tr>
            ))}
            {users?.rows.length === 0 ? (
              <tr>
                <td className="empty-table-cell" colSpan={9}>
                  No leaderboard rows returned for this broker and date range.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="stats-section-title">Top Open Positions</div>
      <div className="table-wrap stats-table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Symbol</th>
              <th>Side</th>
              <th>Notional</th>
              <th>Unrealized PnL</th>
              <th>Leverage</th>
              <th>Margin</th>
              <th>Mark</th>
              <th>Est. Liq</th>
              <th>Address</th>
            </tr>
          </thead>
          <tbody>
            {(risk?.rows ?? []).map((row, index) => (
              <tr key={`${row.accountId}-${row.symbol}-${row.side}-${index}`}>
                <td>{index + 1}</td>
                <td className="mono">{row.symbol}</td>
                <td>
                  <span className={`side-chip ${row.side.toLowerCase()}`}>{row.side || "-"}</span>
                </td>
                <td>{formatNumber(row.notional)}</td>
                <td>{formatNumber(row.unrealizedPnl)}</td>
                <td>{formatNumber(row.leverage)}x</td>
                <td>{row.marginMode || "-"}</td>
                <td>{formatNumber(row.markPrice)}</td>
                <td>{formatNumber(row.estimatedLiquidationPrice)}</td>
                <td className="mono">{shortAddress(row.address)}</td>
              </tr>
            ))}
            {risk?.rows.length === 0 ? (
              <tr>
                <td className="empty-table-cell" colSpan={10}>
                  No open positions returned for this broker.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
    </article>
  );
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function shortAddress(address: string) {
  if (address.length <= 12) {
    return address || "-";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
