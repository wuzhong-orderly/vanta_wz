import type { Tab } from "./types";

export const settledHeaders = [
  "address",
  "settled_points",
  "special_points",
  "remark"
];

export const distributionHeaders = [
  "address",
  "orderly_point",
  "allocation_percentage",
  "vanta_points",
  "remark"
];

export const inviteHeaders = ["邀请码", "绑定地址", "绑定时间"];

export const tabs: Array<{ id: Tab; label: string }> = [
  { id: "campaigns", label: "Campaign Management" },
  { id: "settlement", label: "Point Management" },
  { id: "distribution", label: "CSV Point management" },
  { id: "current", label: "Settled Point & Special Point Management" },
  { id: "invites", label: "Invite Management" }
];
