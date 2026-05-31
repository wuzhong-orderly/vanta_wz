export interface CampaignConfig {
  campaignNumber: number;
  campaignName: string;
  totalVantaPoints: string;
  startTime: string;
  endTime: string;
  distributionCsv: string;
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
  pnl: string;
  volume: string;
  orderlyPoints: string;
  vantaPoints: string;
  specialPoints: string;
  remark: string;
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
