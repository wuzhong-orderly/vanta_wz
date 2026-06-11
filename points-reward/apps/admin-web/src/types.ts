export type Tab = "campaigns" | "settlement" | "current" | "distribution" | "invites";

export interface CampaignConfig {
  campaignNumber: number;
  campaignName: string;
  description?: string;
  totalVantaPoints: string;
  startTime: string;
  endTime: string;
  distributionCsv: string;
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
  boundAddress: string;
  boundAt: string;
}
