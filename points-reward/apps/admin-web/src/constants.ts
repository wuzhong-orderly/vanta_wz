import type { Tab } from "./types";

export const currentHeaders = [
  "address",
  "total_accumulated_point_in_past_campaign",
  "total_accumulated_point_in_current_campaign",
  "total_accumulated_special_point_in_past_campaign",
  "total_accumulated_special_point_in_current_campaign",
  "remark"
];

export const distributionHeaders = [
  "address",
  "pnl",
  "volume",
  "orderly_point",
  "allocation_percentage",
  "vanta_points",
  "special_points",
  "remark"
];

export const tabs: Array<{ id: Tab; label: string }> = [
  { id: "campaigns", label: "Campaign Management" },
  { id: "settlement", label: "Point Management" },
  { id: "distribution", label: "CSV Point management" },
  { id: "current", label: "Total points ranking" }
];
