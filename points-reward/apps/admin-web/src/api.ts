import type {
  AllocationPreview,
  BrokerMarketStats,
  BrokerOverviewStats,
  BrokerRiskStats,
  BrokerUserStats,
  CampaignDistributionRow,
  CampaignRegistry,
  InviteBindingRow,
  InviteCodeRow,
  LeaderboardRow,
  SettledPointsRow,
  OrderlyEpoch,
  OrderlyStage
} from "./types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const ADMIN_TOKEN_STORAGE_KEY = "pointsRewardAdminToken";

export function getAdminToken() {
  return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? "";
}

export function setAdminToken(token: string) {
  window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
}

export function clearAdminToken() {
  window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
}

function resolveRequestUrl(url: string) {
  if (!API_BASE_URL) {
    return url;
  }

  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

export async function getRegistry() {
  return request<CampaignRegistry>("/admin/registry");
}

export async function saveRegistry(registry: CampaignRegistry) {
  return request<CampaignRegistry>("/admin/registry", {
    method: "PUT",
    body: JSON.stringify(registry)
  });
}

export async function getSettledPoints() {
  return request<{ rows: SettledPointsRow[] }>("/admin/settled-points");
}

export async function saveSettledPoints(rows: SettledPointsRow[]) {
  return request<{ rows: SettledPointsRow[] }>("/admin/settled-points", {
    method: "PUT",
    body: JSON.stringify({ rows })
  });
}

export async function getInviteCodes() {
  return request<{ rows: InviteCodeRow[]; bindings: InviteBindingRow[] }>("/admin/invite-codes");
}

export async function saveInviteCodes(rows: InviteCodeRow[], bindings: InviteBindingRow[]) {
  return request<{ rows: InviteCodeRow[]; bindings: InviteBindingRow[] }>("/admin/invite-codes", {
    method: "PUT",
    body: JSON.stringify({
      rows: rows.map((row) => ({
        inviteCode: row.inviteCode,
        orderlyRefCode: row.orderlyRefCode ?? "",
        maxBindings: row.maxBindings || "500",
        remark: row.remark ?? ""
      })),
      bindings: bindings.map((row) => ({
        inviteCode: row.inviteCode,
        boundAddress: row.boundAddress,
        boundAt: row.boundAt
      }))
    })
  });
}

export async function rebuildSettledPointsFromCampaigns() {
  return request<{ rows: SettledPointsRow[]; stats: { campaignsRead: number; userCount: number } }>(
    "/admin/settled-points/rebuild-from-campaigns",
    {
      method: "POST"
    }
  );
}

export async function previewAllocation(campaignNumber: number) {
  return request<AllocationPreview>(`/admin/campaigns/${campaignNumber}/allocation-preview`, {
    method: "POST"
  });
}

export async function importOrderlyRows(
  campaignNumber: number,
  options: {
    mode?: "stage-ranking" | "epoch-ranking";
    stage?: string;
    epochId?: string;
    brokerId?: string;
  }
) {
  return request<AllocationPreview>(`/admin/campaigns/${campaignNumber}/import-orderly`, {
    method: "POST",
    body: JSON.stringify(options)
  });
}

export async function getOrderlyStages(brokerId: string) {
  const params = new URLSearchParams({ broker_id: brokerId });
  return request<{ rows: OrderlyStage[] }>(`/v1/public/points/stages?${params.toString()}`);
}

export async function getOrderlyEpochs(stage?: string) {
  const params = new URLSearchParams();

  if (stage) {
    params.set("stage", stage);
  }

  const query = params.toString();
  return request<{ rows: OrderlyEpoch[] }>(
    `/v1/public/points/epoch_dates${query ? `?${query}` : ""}`
  );
}

export async function endCampaign(campaignNumber: number, rows: CampaignDistributionRow[]) {
  return request<{
    preview: AllocationPreview;
    settledPoints: { rows: SettledPointsRow[]; stats: { campaignsRead: number; userCount: number } };
    campaign: CampaignRegistry["campaigns"][number];
  }>(`/admin/campaigns/${campaignNumber}/end`, {
    method: "POST",
    body: JSON.stringify({ rows })
  });
}

export async function getDistribution(campaignNumber: number) {
  return request<{ rows: CampaignDistributionRow[] }>(
    `/admin/campaigns/${campaignNumber}/distribution`
  );
}

export async function saveDistribution(
  campaignNumber: number,
  rows: CampaignDistributionRow[]
) {
  return request<{ rows: CampaignDistributionRow[] }>(
    `/admin/campaigns/${campaignNumber}/distribution`,
    {
      method: "PUT",
      body: JSON.stringify({ rows })
    }
  );
}

export async function getLeaderboard() {
  return request<{ items: LeaderboardRow[] }>("/api/leaderboard/total");
}

export async function getBrokerOverviewStats(brokerId: string, startDate: string, endDate: string) {
  const params = new URLSearchParams({
    broker_id: brokerId,
    start_date: startDate,
    end_date: endDate
  });
  return request<BrokerOverviewStats>(`/admin/stats/broker/overview?${params.toString()}`);
}

export async function getBrokerMarketStats(brokerId: string) {
  const params = new URLSearchParams({ broker_id: brokerId });
  return request<BrokerMarketStats>(`/admin/stats/broker/markets?${params.toString()}`);
}

export async function getBrokerRiskStats(brokerId: string) {
  const params = new URLSearchParams({ broker_id: brokerId });
  return request<BrokerRiskStats>(`/admin/stats/broker/risk?${params.toString()}`);
}

export async function getBrokerUserStats(brokerId: string, startDate: string, endDate: string) {
  const params = new URLSearchParams({
    broker_id: brokerId,
    start_date: startDate,
    end_date: endDate
  });
  return request<BrokerUserStats>(`/admin/stats/broker/users?${params.toString()}`);
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (url.startsWith("/admin/")) {
    const token = getAdminToken();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(resolveRequestUrl(url), {
    ...init,
    headers
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearAdminToken();
      window.dispatchEvent(new Event("points-admin-unauthorized"));
      throw new Error("Unauthorized");
    }

    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
