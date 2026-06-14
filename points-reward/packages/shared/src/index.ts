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

export interface CampaignDistributionRow {
  address: string;
  orderlyPoints: string;
  allocationPercentage: string;
  vantaPoints: string;
  remark: string;
}

export interface SettledPointsRow {
  address: string;
  settledPoints: string;
  totalPoints: string;
  specialPoints: string;
  remark: string;
}

export interface UserPointsResponse {
  address: string;
  settledPoints: string;
  specialPoints: string;
  currentPoint: string;
  totalPoint: string;
  remark: string;
}

export interface LeaderboardRow extends UserPointsResponse {
  rank: number;
}

export interface CampaignPointsRow {
  campaignNumber: number;
  campaignName: string;
  status?: CampaignConfig["status"];
  startTime: string;
  endTime: string;
  points: string;
}

export interface CampaignLeaderboardRow {
  rank: number;
  address: string;
  campaignNumber: number;
  points: string;
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

export interface InviteBindingResponse {
  bound: boolean;
  address: string;
  inviteCode?: string;
  orderlyRefCode?: string;
  boundAt?: string;
}
