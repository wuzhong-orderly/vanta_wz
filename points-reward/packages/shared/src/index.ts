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

export interface CampaignDistributionRow {
  address: string;
  orderlyPoints: string;
  allocationPercentage: string;
  vantaPoints: string;
  specialPoints: string;
  remark: string;
}

export interface CurrentPointsRow {
  address: string;
  totalAccumulatedPointInPastCampaign: string;
  totalAccumulatedPointInCurrentCampaign: string;
  totalAccumulatedSpecialPointInPastCampaign: string;
  totalAccumulatedSpecialPointInCurrentCampaign: string;
  remark: string;
}

export interface UserPointsResponse {
  address: string;
  totalAccumulatedPointInPastCampaign: string;
  totalAccumulatedSpecialPointInPastCampaign: string;
  currentPoint: string;
  currentSpecialPoint: string;
  totalPoint: string;
  totalSpecialPoint: string;
  remark: string;
}

export interface LeaderboardRow extends UserPointsResponse {
  rank: number;
}

export interface InviteCodeRow {
  inviteCode: string;
  boundAddress: string;
  boundAt: string;
}

export interface InviteBindingResponse {
  bound: boolean;
  address: string;
  inviteCode?: string;
  boundAt?: string;
}
