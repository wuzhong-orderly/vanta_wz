type JsonObject = Record<string, unknown>;

export interface BrokerOverviewStats {
  brokerId: string;
  startDate: string;
  endDate: string;
  connectedUsers: number;
  totalHolding: number;
  totalUnsettledBalance: number;
  totalTvl: number;
  tvlUpdatedAt: number | null;
  volumeToday: number;
  volume24h: number;
  volume7d: number;
  volume30d: number;
  volumeYtd: number;
  volumeLtd: number;
  generatedAt: number;
}

export interface BrokerMarketRow {
  symbol: string;
  volume24h: number;
  amount24h: number;
  openInterest: number;
}

export interface BrokerMarketStats {
  brokerId: string;
  rows: BrokerMarketRow[];
  generatedAt: number;
}

export interface BrokerRiskPositionRow {
  symbol: string;
  side: string;
  address: string;
  accountId: string;
  notional: number;
  quantity: number;
  averageOpenPrice: number;
  markPrice: number;
  estimatedLiquidationPrice: number;
  unrealizedPnl: number;
  leverage: number;
  marginMode: string;
  openedAt: number | null;
}

export interface BrokerRiskStats {
  brokerId: string;
  totalLongNotional: number;
  totalShortNotional: number;
  netNotional: number;
  longShortSkew: number;
  totalPositions: number;
  rows: BrokerRiskPositionRow[];
  generatedAt: number;
}

export interface BrokerLeaderboardRow {
  rank: number;
  address: string;
  accountId: string;
  brokerId: string;
  perpVolume: number;
  perpMakerVolume: number;
  perpTakerVolume: number;
  realizedPnl: number;
  totalFee: number;
  brokerFee: number;
}

export interface BrokerUserStats {
  brokerId: string;
  startDate: string;
  endDate: string;
  totalUsers: number;
  returnedUsers: number;
  totalPerpVolume: number;
  totalMakerVolume: number;
  totalTakerVolume: number;
  totalRealizedPnl: number;
  totalFee: number;
  brokerFee: number;
  snapshotTime: number | null;
  rows: BrokerLeaderboardRow[];
  error: string | null;
  generatedAt: number;
}

export async function getBrokerOverviewStats(
  brokerId: string,
  range: DateRange
): Promise<BrokerOverviewStats> {
  const [builderStats, volumeStats, tvlStats] = await Promise.all([
    fetchOrderlyJson(`/v1/public/broker/stats?broker_id=${encodeURIComponent(brokerId)}`),
    fetchOrderlyJson(`/v1/public/volume/stats?broker_id=${encodeURIComponent(brokerId)}`),
    fetchOrderlyJson(`/v1/public/balance/stats?broker_id=${encodeURIComponent(brokerId)}`)
  ]);

  const builderRows = extractRows(builderStats);
  const builderRow = builderRows[0] ?? extractData(builderStats);
  const volumeData = extractData(volumeStats);
  const tvlData = extractData(tvlStats);
  const totalHolding = toNumber(tvlData.total_holding ?? tvlData.totalHolding);
  const totalUnsettledBalance = toNumber(
    tvlData.total_unsettled_balance ?? tvlData.totalUnsettledBalance
  );

  return {
    brokerId,
    startDate: range.startDate,
    endDate: range.endDate,
    connectedUsers: toNumber(builderRow.connected_user ?? builderRow.connectedUsers),
    totalHolding,
    totalUnsettledBalance,
    totalTvl: totalHolding + totalUnsettledBalance,
    tvlUpdatedAt: toNullableNumber(tvlData.last_update_time ?? tvlData.lastUpdateTime),
    volumeToday: toNumber(volumeData.perp_volume_today ?? volumeData.volume_today),
    volume24h: toNumber(
      volumeData.perp_volume_last_1_day ??
        volumeData.perp_volume_last_24_hours ??
        volumeData.volume_last_1_day ??
        volumeData.volume_24h ??
        volumeData.perp_volume_today
    ),
    volume7d: toNumber(volumeData.perp_volume_last_7_days ?? volumeData.volume_last_7_days),
    volume30d: toNumber(volumeData.perp_volume_last_30_days ?? volumeData.volume_last_30_days),
    volumeYtd: toNumber(volumeData.perp_volume_ytd ?? volumeData.volume_ytd),
    volumeLtd: toNumber(volumeData.perp_volume_ltd ?? volumeData.volume_ltd),
    generatedAt: Date.now()
  };
}

export async function getBrokerMarketStats(brokerId: string): Promise<BrokerMarketStats> {
  const payload = await fetchOrderlyJson(
    `/v1/public/futures_market?broker_id=${encodeURIComponent(brokerId)}`
  );
  const rows = extractRows(payload)
    .map((row) => ({
      symbol: toStringValue(row.symbol),
      volume24h: toNumber(row["24h_volume"] ?? row.volume_24h ?? row.volume24h),
      amount24h: toNumber(row["24h_amount"] ?? row.amount_24h ?? row.amount24h),
      openInterest: toNumber(row.open_interest ?? row.openInterest)
    }))
    .filter((row) => row.symbol)
    .sort((left, right) => right.volume24h - left.volume24h)
    .slice(0, 50);

  return {
    brokerId,
    rows,
    generatedAt: Date.now()
  };
}

export async function getBrokerRiskStats(brokerId: string): Promise<BrokerRiskStats> {
  const payload = await fetchOrderlyJson("/v1/public/query", {
    method: "POST",
    body: JSON.stringify({
      type: "platformPositions",
      broker_id: brokerId,
      limit: 5000
    })
  });
  const data = extractData(payload);
  const totalLongNotional = toNumber(data.total_long_notional ?? data.totalLongNotional);
  const totalShortNotional = toNumber(data.total_short_notional ?? data.totalShortNotional);
  const grossNotional = totalLongNotional + totalShortNotional;
  const rows = extractRows(payload)
    .map((row) => ({
      symbol: toStringValue(row.symbol),
      side: toStringValue(row.side),
      address: toStringValue(row.address),
      accountId: toStringValue(row.account_id ?? row.accountId),
      notional: toNumber(row.notional),
      quantity: toNumber(row.position_qty ?? row.positionQty),
      averageOpenPrice: toNumber(row.average_open_price ?? row.averageOpenPrice),
      markPrice: toNumber(row.mark_price ?? row.markPrice),
      estimatedLiquidationPrice: toNumber(row.est_liq_price ?? row.estimatedLiquidationPrice),
      unrealizedPnl: toNumber(row.unrealized_pnl ?? row.unrealizedPnl),
      leverage: toNumber(row.leverage),
      marginMode: toStringValue(row.margin_mode ?? row.marginMode),
      openedAt: toNullableNumber(row.opened_at ?? row.openedAt)
    }))
    .filter((row) => row.symbol && row.notional > 0)
    .sort((left, right) => right.notional - left.notional)
    .slice(0, 50);

  return {
    brokerId,
    totalLongNotional,
    totalShortNotional,
    netNotional: totalLongNotional - totalShortNotional,
    longShortSkew: grossNotional > 0 ? (totalLongNotional - totalShortNotional) / grossNotional : 0,
    totalPositions: toNumber(data.total_positions ?? data.totalPositions),
    rows,
    generatedAt: Date.now()
  };
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export async function getBrokerUserStats(
  brokerId: string,
  range: DateRange
): Promise<BrokerUserStats> {
  try {
    const params = new URLSearchParams({
      broker_id: brokerId,
      start_date: range.startDate,
      end_date: range.endDate,
      page: "1",
      size: "50",
      sort: "descending_perp_volume",
      aggregateBy: "address"
    });
    const payload = await fetchOrderlyJson(`/v1/broker/leaderboard/daily?${params.toString()}`);
    const data = extractData(payload);
    const meta = extractObject(data.meta);
    const rows = extractRows(payload).map((row, index) => ({
      rank: index + 1,
      address: toStringValue(row.address),
      accountId: toStringValue(row.account_id ?? row.accountId),
      brokerId: toStringValue(row.broker_id ?? row.brokerId) || brokerId,
      perpVolume: toNumber(row.perp_volume ?? row.perpVolume),
      perpMakerVolume: toNumber(row.perp_maker_volume ?? row.perpMakerVolume),
      perpTakerVolume: toNumber(
        row.perp_taker_volume ?? row.perp_taker_volum ?? row.perpTakerVolume
      ),
      realizedPnl: toNumber(row.realized_pnl ?? row.realizedPnl),
      totalFee: toNumber(row.total_fee ?? row.totalFee),
      brokerFee: toNumber(row.broker_fee ?? row.brokerFee)
    }));

    return {
      brokerId,
      startDate: range.startDate,
      endDate: range.endDate,
      totalUsers: toNumber(meta.total),
      returnedUsers: rows.length,
      totalPerpVolume: sumBy(rows, (row) => row.perpVolume),
      totalMakerVolume: sumBy(rows, (row) => row.perpMakerVolume),
      totalTakerVolume: sumBy(rows, (row) => row.perpTakerVolume),
      totalRealizedPnl: sumBy(rows, (row) => row.realizedPnl),
      totalFee: sumBy(rows, (row) => row.totalFee),
      brokerFee: sumBy(rows, (row) => row.brokerFee),
      snapshotTime: toNullableNumber(data.snapshot_time ?? data.snapshotTime),
      rows,
      error: null,
      generatedAt: Date.now()
    };
  } catch (error) {
    return {
      brokerId,
      startDate: range.startDate,
      endDate: range.endDate,
      totalUsers: 0,
      returnedUsers: 0,
      totalPerpVolume: 0,
      totalMakerVolume: 0,
      totalTakerVolume: 0,
      totalRealizedPnl: 0,
      totalFee: 0,
      brokerFee: 0,
      snapshotTime: null,
      rows: [],
      error: error instanceof Error ? error.message : "Failed to load broker leaderboard",
      generatedAt: Date.now()
    };
  }
}

async function fetchOrderlyJson(pathWithQuery: string, init?: RequestInit): Promise<unknown> {
  const baseUrl = process.env.ORDERLY_API_BASE_URL ?? "https://api.orderly.org";
  const url = new URL(pathWithQuery, baseUrl);
  const headers = new Headers(init?.headers);

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    headers
  });

  if (!response.ok) {
    throw new Error(`Orderly API request failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

function extractObject(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as JsonObject;
}

function extractData(payload: unknown): JsonObject {
  const data = (payload as { data?: unknown })?.data;

  if (!data || typeof data !== "object") {
    return {};
  }

  return data as JsonObject;
}

function sumBy<T>(rows: T[], getValue: (row: T) => number): number {
  return rows.reduce((total, row) => total + getValue(row), 0);
}

function extractRows(payload: unknown): JsonObject[] {
  const data = extractData(payload);
  const rows = data.rows;

  if (Array.isArray(data)) {
    return data.filter((row): row is JsonObject => Boolean(row && typeof row === "object"));
  }

  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.filter((row): row is JsonObject => Boolean(row && typeof row === "object"));
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function toNullableNumber(value: unknown): number | null {
  const parsed = toNumber(value);

  if (parsed !== 0) {
    return parsed;
  }

  if (value === 0 || value === "0") {
    return 0;
  }

  return null;
}

function toStringValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}
