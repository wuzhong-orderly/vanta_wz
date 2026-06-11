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
  currentPointsCsv: string;
  campaigns: CampaignConfig[];
}

export interface CurrentPointsRow {
  address: string;
  totalAccumulatedPointInPastCampaign: string;
  totalAccumulatedPointInCurrentCampaign: string;
  totalAccumulatedSpecialPointInPastCampaign: string;
  totalAccumulatedSpecialPointInCurrentCampaign: string;
  remark: string;
}

export interface CampaignDistributionRow {
  address: string;
  orderlyPoints: string;
  allocationPercentage: string;
  vantaPoints: string;
  specialPoints: string;
  remark: string;
}

export interface AllocationPreview {
  rows: CampaignDistributionRow[];
  stats: {
    userCount: number;
    totalOrderlyPoints: string;
    totalAllocationPercentage: string;
    totalVantaPoints: string;
    totalSpecialPoints: string;
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
  totalAccumulatedPointInPastCampaign: string;
  totalAccumulatedSpecialPointInPastCampaign: string;
  currentPoint: string;
  currentSpecialPoint: string;
  totalPoint: string;
  totalSpecialPoint: string;
  remark: string;
}

export interface InviteCodeRow {
  inviteCode: string;
  boundAddress: string;
  boundAt: string;
}
