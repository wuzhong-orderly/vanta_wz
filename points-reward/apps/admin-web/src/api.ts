import type {
  AllocationPreview,
  CampaignDistributionRow,
  CampaignRegistry,
  CurrentPointsRow,
  InviteCodeRow,
  LeaderboardRow,
  OrderlyEpoch,
  OrderlyStage
} from "./types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

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

export async function getCurrentPoints() {
  return request<{ rows: CurrentPointsRow[] }>("/admin/current-points");
}

export async function saveCurrentPoints(rows: CurrentPointsRow[]) {
  return request<{ rows: CurrentPointsRow[] }>("/admin/current-points", {
    method: "PUT",
    body: JSON.stringify({ rows })
  });
}

export async function getInviteCodes() {
  return request<{ rows: InviteCodeRow[] }>("/admin/invite-codes");
}

export async function saveInviteCodes(rows: InviteCodeRow[]) {
  return request<{ rows: InviteCodeRow[] }>("/admin/invite-codes", {
    method: "PUT",
    body: JSON.stringify({ rows })
  });
}

export async function rebuildCurrentPointsFromCampaigns() {
  return request<{ rows: CurrentPointsRow[]; stats: { campaignsRead: number; userCount: number } }>(
    "/admin/current-points/rebuild-from-campaigns",
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
    currentPoints: { rows: CurrentPointsRow[]; stats: { campaignsRead: number; userCount: number } };
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

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(resolveRequestUrl(url), {
    ...init,
    headers
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
