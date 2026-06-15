export type Tab = "campaigns" | "settlement" | "current" | "distribution" | "invites" | "stats";

export interface CampaignConfig {
  campaignNumber: number;
  campaignName: string;
  description?: string;
  totalVantaPoints: string;
  startTime: string;
  endTime: string;
  distributionCsv: string;
  currentCampaign?: boolean;
  status?: "DRAFT" | "ACTIVE" | "ENDED" | "SETTLED";
  orderlyBrokerId?: string;
  orderlyStageId?: string;
  orderlyEpochId?: string;
  endedAt?: string;
  settledAt?: string;
}

export interface CampaignRegistry {
  currentCampaignNumber: number;
  settledPointsCsv: string;
  campaigns: CampaignConfig[];
}

export interface SettledPointsRow {
  address: string;
  settledPoints: string;
  totalPoints: string;
  specialPoints: string;
  remark: string;
}

export interface CampaignDistributionRow {
  address: string;
  orderlyPoints: string;
  allocationPercentage: string;
  vantaPoints: string;
  remark: string;
}

export interface AllocationPreview {
  rows: CampaignDistributionRow[];
  stats: {
    userCount: number;
    totalOrderlyPoints: string;
    totalAllocationPercentage: string;
    totalVantaPoints: string;
  };
  warnings: string[];
}

export interface OrderlyStage {
  id: string;
  label: string;
  status: string;
  startTime: string;
  endTime: string;
  epochs: OrderlyEpoch[];
  raw: Record<string, unknown>;
}

export interface OrderlyEpoch {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  raw: Record<string, unknown>;
}

export interface LeaderboardRow {
  rank: number;
  address: string;
  settledPoints: string;
  specialPoints: string;
  currentPoint: string;
  totalPoint: string;
  remark: string;
}

export interface InviteCodeRow {
  inviteCode: string;
  orderlyRefCode: string;
  maxBindings: string;
  remark: string;
}

export interface InviteBindingRow {
  inviteCode: string;
  boundAddress: string;
  boundAt: string;
}

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
