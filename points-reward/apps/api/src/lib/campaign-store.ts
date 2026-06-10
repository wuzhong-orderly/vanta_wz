import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type {
  CampaignConfig,
  CampaignDistributionRow,
  CampaignRegistry,
  CurrentPointsRow,
  LeaderboardRow,
  UserPointsResponse
} from "@points-reward/shared";

const registrySchema = z.object({
  currentCampaignNumber: z.number().int().positive(),
  currentPointsCsv: z.string().min(1),
  campaigns: z
    .array(
      z.object({
        campaignNumber: z.number().int().positive(),
        campaignName: z.string().min(1),
        description: z.string().optional(),
        totalVantaPoints: z.string().min(1),
        startTime: z.string().datetime(),
        endTime: z.string().datetime(),
        distributionCsv: z.string().min(1),
        status: z.enum(["DRAFT", "ACTIVE", "ENDED", "SETTLED"]).optional(),
        orderlyBrokerId: z.string().optional(),
        orderlyStageId: z.string().optional(),
        orderlyEpochId: z.string().optional(),
        endedAt: z.string().optional(),
        settledAt: z.string().optional()
      })
    )
    .min(1)
});

const currentPointsHeaderMap: Record<keyof CurrentPointsRow, string> = {
  address: "address",
  totalAccumulatedPointInPastCampaign: "total_accumulated_point_in_past_campaign",
  totalAccumulatedPointInCurrentCampaign: "total_accumulated_point_in_current_campaign",
  totalAccumulatedSpecialPointInPastCampaign:
    "total_accumulated_special_point_in_past_campaign",
  totalAccumulatedSpecialPointInCurrentCampaign:
    "total_accumulated_special_point_in_current_campaign",
  remark: "remark"
};

const distributionHeaderMap: Record<keyof CampaignDistributionRow, string> = {
  address: "address",
  orderlyPoints: "orderly_point",
  allocationPercentage: "allocation_percentage",
  vantaPoints: "vanta_points",
  specialPoints: "special_points",
  remark: "remark"
};

const currentPointsHeaders = Object.values(currentPointsHeaderMap);
const distributionHeaders = Object.values(distributionHeaderMap);

type DataFileSnapshot = {
  content: string;
  mtimeMs: number;
  size: number;
};

type CurrentPointsCache = {
  file: DataFileSnapshot;
  rows: CurrentPointsRow[];
  rowsByAddress: Map<string, CurrentPointsRow>;
  leaderboard?: LeaderboardRow[];
};

const dataFileCache = new Map<string, DataFileSnapshot>();
let dataDirPromise: Promise<string> | undefined;
let registryCache:
  | {
      file: DataFileSnapshot;
      registry: CampaignRegistry;
    }
  | undefined;
let currentPointsCache: CurrentPointsCache | undefined;
const distributionRowsCache = new Map<
  string,
  {
    file: DataFileSnapshot;
    rows: CampaignDistributionRow[];
  }
>();

export async function getCurrentCampaign() {
  const registry = await readRegistry();
  const campaign = registry.campaigns.find(
    (item) => item.campaignNumber === registry.currentCampaignNumber
  );

  if (!campaign) {
    throw new Error(`Current campaign ${registry.currentCampaignNumber} is not configured`);
  }

  return campaign;
}

export async function getLatestCampaignForDisplay() {
  const registry = await readRegistry();
  const now = Date.now();

  const eligibleCampaigns = registry.campaigns.filter((campaign) => {
    if (
      campaign.status !== "ACTIVE" &&
      campaign.status !== "ENDED" &&
      campaign.status !== "SETTLED"
    ) {
      return false;
    }

    const startTime = Date.parse(campaign.startTime);

    if (!Number.isFinite(startTime)) {
      return false;
    }

    return startTime <= now;
  });

  if (eligibleCampaigns.length === 0) {
    return null;
  }

  eligibleCampaigns.sort((left, right) => {
    const rightStartTime = Date.parse(right.startTime);
    const leftStartTime = Date.parse(left.startTime);

    if (rightStartTime !== leftStartTime) {
      return rightStartTime - leftStartTime;
    }

    return right.campaignNumber - left.campaignNumber;
  });

  return eligibleCampaigns[0];
}

export async function getRegistry(): Promise<CampaignRegistry> {
  return readRegistry();
}

export async function saveRegistry(registry: CampaignRegistry) {
  const parsed = registrySchema.parse(registry);
  await writeDataFile("campaigns.json", `${JSON.stringify(parsed, null, 2)}\n`);
  return parsed;
}

export async function getCurrentPointsRows(): Promise<CurrentPointsRow[]> {
  return readCurrentPointsRows();
}

export async function saveCurrentPointsRows(rows: CurrentPointsRow[]) {
  const registry = await readRegistry();
  const csv = stringifyCsv(
    currentPointsHeaders,
    rows.map((row) => ({
      [currentPointsHeaderMap.address]: row.address,
      [currentPointsHeaderMap.totalAccumulatedPointInPastCampaign]:
        row.totalAccumulatedPointInPastCampaign,
      [currentPointsHeaderMap.totalAccumulatedPointInCurrentCampaign]:
        row.totalAccumulatedPointInCurrentCampaign,
      [currentPointsHeaderMap.totalAccumulatedSpecialPointInPastCampaign]:
        row.totalAccumulatedSpecialPointInPastCampaign,
      [currentPointsHeaderMap.totalAccumulatedSpecialPointInCurrentCampaign]:
        row.totalAccumulatedSpecialPointInCurrentCampaign,
      [currentPointsHeaderMap.remark]: row.remark
    }))
  );

  await writeDataFile(registry.currentPointsCsv, csv);
  return rows;
}

export async function rebuildCurrentPointsFromCampaigns() {
  const registry = await readRegistry();
  const existingRows = await readCurrentPointsRows();
  const rowsByAddress = new Map<string, CurrentPointsRow>();
  const remarksByAddress = new Map(
    existingRows.map((row) => [normalizeAddress(row.address), row.remark])
  );

  for (const campaign of registry.campaigns) {
    const distributionRows = await getCampaignDistributionRows(campaign);
    const isPastCampaign = campaign.status
      ? campaign.status === "SETTLED"
      : campaign.campaignNumber < registry.currentCampaignNumber;
    const isCurrentCampaign = campaign.status
      ? campaign.status === "ACTIVE" || campaign.status === "ENDED"
      : campaign.campaignNumber === registry.currentCampaignNumber;

    if (!isPastCampaign && !isCurrentCampaign) {
      continue;
    }

    for (const distributionRow of distributionRows) {
      const normalizedAddress = normalizeAddress(distributionRow.address);

      if (!normalizedAddress) {
        continue;
      }

      const existingRow = rowsByAddress.get(normalizedAddress);
      const row =
        existingRow ??
        ({
          address: distributionRow.address,
          totalAccumulatedPointInPastCampaign: "0",
          totalAccumulatedPointInCurrentCampaign: "0",
          totalAccumulatedSpecialPointInPastCampaign: "0",
          totalAccumulatedSpecialPointInCurrentCampaign: "0",
          remark: remarksByAddress.get(normalizedAddress) ?? ""
        } satisfies CurrentPointsRow);

      if (isPastCampaign) {
        row.totalAccumulatedPointInPastCampaign = addDecimalStrings(
          row.totalAccumulatedPointInPastCampaign,
          normalizeNumber(distributionRow.vantaPoints)
        );
        row.totalAccumulatedSpecialPointInPastCampaign = addDecimalStrings(
          row.totalAccumulatedSpecialPointInPastCampaign,
          normalizeNumber(distributionRow.specialPoints)
        );
      }

      if (isCurrentCampaign) {
        row.totalAccumulatedPointInCurrentCampaign = addDecimalStrings(
          row.totalAccumulatedPointInCurrentCampaign,
          normalizeNumber(distributionRow.vantaPoints)
        );
        row.totalAccumulatedSpecialPointInCurrentCampaign = addDecimalStrings(
          row.totalAccumulatedSpecialPointInCurrentCampaign,
          normalizeNumber(distributionRow.specialPoints)
        );
      }

      rowsByAddress.set(normalizedAddress, row);
    }
  }

  const rows = Array.from(rowsByAddress.values()).sort(
    (left, right) =>
      Number(right.totalAccumulatedPointInPastCampaign) +
      Number(right.totalAccumulatedPointInCurrentCampaign) -
      (Number(left.totalAccumulatedPointInPastCampaign) +
        Number(left.totalAccumulatedPointInCurrentCampaign))
  );

  await saveCurrentPointsRows(rows);

  return {
    rows,
    stats: {
      campaignsRead: registry.campaigns.filter((campaign) =>
        campaign.status
          ? campaign.status === "ACTIVE" ||
            campaign.status === "ENDED" ||
            campaign.status === "SETTLED"
          : campaign.campaignNumber <= registry.currentCampaignNumber
      ).length,
      userCount: rows.length
    }
  };
}

export async function previewCampaignAllocation(campaignNumber: number) {
  const registry = await readRegistry();
  const campaign = getCampaignByNumber(registry, campaignNumber);
  const rows = await getCampaignDistributionRows(campaign);
  return buildAllocationPreview(campaign, rows);
}

export async function importOrderlyCampaignRows(
  campaignNumber: number,
  options: {
    mode?: "stage-ranking" | "epoch-ranking" | "leaderboard" | "rankings";
    stage?: string;
    period?: string;
    epochId?: string;
    brokerId?: string;
    size?: number;
    maxPages?: number;
  }
) {
  const registry = await readRegistry();
  const campaign = getCampaignByNumber(registry, campaignNumber);
  const rows = await fetchOrderlyRows({
    mode: options.mode ?? "leaderboard",
    stage: options.stage || campaign.orderlyStageId,
    period: options.period,
    epochId: options.epochId || campaign.orderlyEpochId,
    brokerId: options.brokerId || campaign.orderlyBrokerId,
    size: options.size ?? 100,
    maxPages: options.maxPages ?? 20
  });

  return buildAllocationPreview(campaign, rows);
}

export async function getOrderlyStages(brokerId: string) {
  if (!brokerId.trim()) {
    return [];
  }

  const url = new URL(
    "/v1/public/points/stages",
    process.env.ORDERLY_API_BASE_URL ?? "https://api.orderly.org"
  );
  url.searchParams.set("broker_id", brokerId.trim());

  const payload = await fetchOrderlyJson(url);
  return extractRows(payload).map((row) => {
    const id = stringValue(row.stage_id ?? row.stage ?? row.id);
    const name = stringValue(row.stage_name ?? row.name ?? row.title);
    const status = stringValue(row.status ?? row.stage_status);
    const startTime = stringValue(row.start_time ?? row.start_t ?? row.start_date);
    const endTime = stringValue(row.end_time ?? row.end_t ?? row.end_date);

    return {
      id,
      label: name ? `${id} - ${name}` : id || "Unknown stage",
      status,
      startTime,
      endTime,
      epochs: toOrderlyEpochs(row.epoch_period),
      raw: row
    };
  });
}

export async function getOrderlyEpochs(_stage?: string) {
  const url = new URL(
    "/v1/public/points/epoch_dates",
    process.env.ORDERLY_API_BASE_URL ?? "https://api.orderly.org"
  );

  const payload = await fetchOrderlyJson(url);
  return extractRows(payload).map((row) => {
    const id = stringValue(row.epoch_id ?? row.epoch ?? row.id);
    const startTime = stringValue(row.start_time ?? row.start_t ?? row.start_date);
    const endTime = stringValue(row.end_time ?? row.end_t ?? row.end_date);

    return {
      id,
      label: id ? `Epoch ${id}` : "Unknown epoch",
      startTime,
      endTime,
      raw: row
    };
  });
}

export async function endCampaign(
  campaignNumber: number,
  rows: CampaignDistributionRow[]
) {
  const registry = await readRegistry();
  const campaign = getCampaignByNumber(registry, campaignNumber);
  const preview = buildAllocationPreview(campaign, rows);
  const settledAt = new Date().toISOString();

  await saveCampaignDistributionRows(campaignNumber, preview.rows);

  const nextRegistry: CampaignRegistry = {
    ...registry,
    campaigns: registry.campaigns.map((item) =>
      item.campaignNumber === campaignNumber
        ? {
            ...item,
            status: "SETTLED",
            endedAt: item.endedAt ?? settledAt,
            settledAt
          }
        : item
    )
  };

  await saveRegistry(nextRegistry);
  const currentPoints = await rebuildCurrentPointsFromCampaigns();

  return {
    preview,
    currentPoints,
    campaign: nextRegistry.campaigns.find((item) => item.campaignNumber === campaignNumber)
  };
}

export async function getUserPoints(address: string): Promise<UserPointsResponse> {
  const normalizedAddress = normalizeAddress(address);
  const { rowsByAddress } = await readCurrentPointsSnapshot();
  const row = rowsByAddress.get(normalizedAddress);

  if (!row) {
    return toEmptyUserPointsResponse(address);
  }

  return toUserPointsResponse(row);
}

export async function getTotalPointLeaderboard(): Promise<LeaderboardRow[]> {
  const cache = await readCurrentPointsSnapshot();

  if (cache.leaderboard) {
    return cache.leaderboard;
  }

  cache.leaderboard = cache.rows
    .map(toUserPointsResponse)
    .sort((left, right) => Number(right.totalPoint) - Number(left.totalPoint))
    .map((row, index) => ({
      ...row,
      rank: index + 1
    }));

  return cache.leaderboard;
}

export async function getCampaignDistributionRows(
  campaign: CampaignConfig
): Promise<CampaignDistributionRow[]> {
  const file = await readOptionalDataFileSnapshot(campaign.distributionCsv);

  if (!file) {
    return [];
  }

  const cached = distributionRowsCache.get(campaign.distributionCsv);

  if (cached && isSameSnapshot(cached.file, file)) {
    return cached.rows;
  }

  const rows = parseCsv(file.content).map((row) => ({
    address: getCsvValue(row, distributionHeaderMap.address),
    orderlyPoints: getCsvValue(row, distributionHeaderMap.orderlyPoints),
    allocationPercentage: getCsvValue(row, distributionHeaderMap.allocationPercentage),
    vantaPoints: getCsvValue(row, distributionHeaderMap.vantaPoints),
    specialPoints: getCsvValue(row, distributionHeaderMap.specialPoints),
    remark: getCsvValue(row, distributionHeaderMap.remark)
  }));

  distributionRowsCache.set(campaign.distributionCsv, {
    file,
    rows
  });

  return rows;
}

export async function getCampaignDistributionRowsByNumber(campaignNumber: number) {
  const registry = await readRegistry();
  const campaign = registry.campaigns.find((item) => item.campaignNumber === campaignNumber);

  if (!campaign) {
    throw new Error(`Campaign ${campaignNumber} is not configured`);
  }

  return getCampaignDistributionRows(campaign);
}

export async function saveCampaignDistributionRows(
  campaignNumber: number,
  rows: CampaignDistributionRow[]
) {
  const registry = await readRegistry();
  const campaign = registry.campaigns.find((item) => item.campaignNumber === campaignNumber);

  if (!campaign) {
    throw new Error(`Campaign ${campaignNumber} is not configured`);
  }

  const csv = stringifyCsv(
    distributionHeaders,
    rows.map((row) => ({
      [distributionHeaderMap.address]: row.address,
      [distributionHeaderMap.orderlyPoints]: row.orderlyPoints,
      [distributionHeaderMap.allocationPercentage]: row.allocationPercentage,
      [distributionHeaderMap.vantaPoints]: row.vantaPoints,
      [distributionHeaderMap.specialPoints]: row.specialPoints,
      [distributionHeaderMap.remark]: row.remark
    }))
  );

  await writeDataFile(campaign.distributionCsv, csv);
  return rows;
}

function buildAllocationPreview(campaign: CampaignConfig, rows: CampaignDistributionRow[]) {
  const totalVantaPoints = normalizeNumber(campaign.totalVantaPoints);
  const totalOrderlyPoints = rows.reduce(
    (sum, row) => sum + Number(normalizeNumber(row.orderlyPoints)),
    0
  );
  const warnings: string[] = [];
  const seenAddresses = new Set<string>();

  const allocatedRows = rows
    .filter((row) => normalizeAddress(row.address))
    .map((row) => {
      const address = normalizeAddress(row.address);

      if (seenAddresses.has(address)) {
        warnings.push(`Duplicate address: ${row.address}`);
      }

      seenAddresses.add(address);

      const orderlyPoints = Number(normalizeNumber(row.orderlyPoints));
      const manualPercentage = Number(normalizeNumber(row.allocationPercentage));
      const allocationPercentage =
        manualPercentage > 0
          ? manualPercentage
          : totalOrderlyPoints > 0
            ? (orderlyPoints / totalOrderlyPoints) * 100
            : 0;
      const vantaPoints = (Number(totalVantaPoints) * allocationPercentage) / 100;

      return {
        ...row,
        orderlyPoints: String(orderlyPoints),
        allocationPercentage: trimDecimal(allocationPercentage),
        vantaPoints: trimDecimal(vantaPoints),
        specialPoints: normalizeNumber(row.specialPoints)
      };
    });

  const totalAllocationPercentage = allocatedRows.reduce(
    (sum, row) => sum + Number(normalizeNumber(row.allocationPercentage)),
    0
  );
  const allocatedVantaPoints = allocatedRows.reduce(
    (sum, row) => sum + Number(normalizeNumber(row.vantaPoints)),
    0
  );
  const totalSpecialPoints = allocatedRows.reduce(
    (sum, row) => sum + Number(normalizeNumber(row.specialPoints)),
    0
  );

  if (allocatedRows.length === 0) {
    warnings.push("No valid addresses found.");
  }

  if (Math.abs(totalAllocationPercentage - 100) > 0.0001 && allocatedRows.length > 0) {
    warnings.push(`Allocation percentage sums to ${trimDecimal(totalAllocationPercentage)}%.`);
  }

  return {
    rows: allocatedRows,
    stats: {
      userCount: allocatedRows.length,
      totalOrderlyPoints: trimDecimal(totalOrderlyPoints),
      totalAllocationPercentage: trimDecimal(totalAllocationPercentage),
      totalVantaPoints: trimDecimal(allocatedVantaPoints),
      totalSpecialPoints: trimDecimal(totalSpecialPoints)
    },
    warnings
  };
}

function getCampaignByNumber(registry: CampaignRegistry, campaignNumber: number) {
  const campaign = registry.campaigns.find((item) => item.campaignNumber === campaignNumber);

  if (!campaign) {
    throw new Error(`Campaign ${campaignNumber} is not configured`);
  }

  return campaign;
}

async function fetchOrderlyRows(options: {
  mode: "stage-ranking" | "epoch-ranking" | "leaderboard" | "rankings";
  stage?: string;
  period?: string;
  epochId?: string;
  brokerId?: string;
  size: number;
  maxPages: number;
}): Promise<CampaignDistributionRow[]> {
  const baseUrl = process.env.ORDERLY_API_BASE_URL ?? "https://api.orderly.org";
  const rows: CampaignDistributionRow[] = [];

  for (let page = 1; page <= options.maxPages; page += 1) {
    const usesStageRanking = options.mode === "stage-ranking" || options.mode === "rankings";
    const url =
      usesStageRanking
        ? new URL("/v1/public/points/rankings", baseUrl)
        : new URL("/v1/public/points/leaderboard", baseUrl);

    url.searchParams.set("page", String(page));
    url.searchParams.set("size", String(options.size));

    if (usesStageRanking) {
      if (!options.stage) {
        throw new Error("Orderly stage ranking import requires stage.");
      }

      url.searchParams.set("stage", options.stage);
      url.searchParams.set("period", options.period || "all_time");
    } else if (options.epochId) {
      url.searchParams.set("epoch_id", options.epochId);
    }

    if (options.brokerId) {
      url.searchParams.set("broker_id", options.brokerId);
    }

    const payload = await fetchOrderlyJson(url);
    const pageRows = extractRows(payload).map(toDistributionRowFromOrderly);
    rows.push(...pageRows);

    if (pageRows.length < options.size) {
      break;
    }
  }

  return mergeDistributionRowsByAddress(rows);
}

async function fetchOrderlyJson(url: URL) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Orderly API request failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

function extractRows(payload: unknown): Record<string, unknown>[] {
  const data = (payload as { data?: unknown })?.data;

  if (Array.isArray(data)) {
    return data as Record<string, unknown>[];
  }

  if (data && typeof data === "object" && Array.isArray((data as { rows?: unknown }).rows)) {
    return (data as { rows: Record<string, unknown>[] }).rows;
  }

  return [];
}

function toDistributionRowFromOrderly(row: Record<string, unknown>): CampaignDistributionRow {
  return {
    address: stringValue(row.address ?? row.user_address ?? row.wallet_address),
    orderlyPoints: stringValue(
      row.orderly_point ?? row.points ?? row.point ?? row.merits ?? row.total_points
    ),
    allocationPercentage: "",
    vantaPoints: "0",
    specialPoints: "0",
    remark: ""
  };
}

function toOrderlyEpochs(value: unknown) {
  const rows = Array.isArray(value) ? value : [];

  return rows.map((row, index) => {
    if (row && typeof row === "object") {
      const epoch = row as Record<string, unknown>;
      const id = stringValue(
        epoch.epoch_id ?? epoch.epoch ?? epoch.id ?? epoch.period ?? epoch.name ?? index + 1
      );
      const startTime = stringValue(epoch.start_time ?? epoch.start_t ?? epoch.start_date);
      const endTime = stringValue(epoch.end_time ?? epoch.end_t ?? epoch.end_date);

      return {
        id,
        label: id ? `Epoch ${id}` : `Epoch ${index + 1}`,
        startTime,
        endTime,
        raw: epoch
      };
    }

    const id = stringValue(row);

    return {
      id,
      label: id ? `Epoch ${id}` : `Epoch ${index + 1}`,
      startTime: "",
      endTime: "",
      raw: { value: row }
    };
  });
}

function mergeDistributionRowsByAddress(rows: CampaignDistributionRow[]) {
  const rowsByAddress = new Map<string, CampaignDistributionRow>();

  for (const row of rows) {
    const address = normalizeAddress(row.address);

    if (!address) {
      continue;
    }

    const existing = rowsByAddress.get(address);

    if (!existing) {
      rowsByAddress.set(address, row);
      continue;
    }

    existing.orderlyPoints = addDecimalStrings(existing.orderlyPoints, row.orderlyPoints);
  }

  return Array.from(rowsByAddress.values());
}

async function readRegistry(): Promise<CampaignRegistry> {
  const file = await readDataFileSnapshot("campaigns.json");

  if (registryCache && isSameSnapshot(registryCache.file, file)) {
    return registryCache.registry;
  }

  const registry = registrySchema.parse(JSON.parse(file.content));
  registryCache = {
    file,
    registry
  };

  return registry;
}

async function readCurrentPointsRows(): Promise<CurrentPointsRow[]> {
  const { rows } = await readCurrentPointsSnapshot();
  return rows;
}

async function readCurrentPointsSnapshot(): Promise<CurrentPointsCache> {
  const registry = await readRegistry();
  const file = await readDataFileSnapshot(registry.currentPointsCsv);

  if (currentPointsCache && isSameSnapshot(currentPointsCache.file, file)) {
    return currentPointsCache;
  }

  const rows = parseCsv(file.content).map((row) => ({
    address: getCsvValue(row, currentPointsHeaderMap.address),
    totalAccumulatedPointInPastCampaign: getCsvValue(
      row,
      currentPointsHeaderMap.totalAccumulatedPointInPastCampaign
    ),
    totalAccumulatedPointInCurrentCampaign: getCsvValue(
      row,
      currentPointsHeaderMap.totalAccumulatedPointInCurrentCampaign
    ),
    totalAccumulatedSpecialPointInPastCampaign: getCsvValue(
      row,
      currentPointsHeaderMap.totalAccumulatedSpecialPointInPastCampaign
    ),
    totalAccumulatedSpecialPointInCurrentCampaign: getCsvValue(
      row,
      currentPointsHeaderMap.totalAccumulatedSpecialPointInCurrentCampaign
    ),
    remark: getCsvValue(row, currentPointsHeaderMap.remark)
  }));
  const rowsByAddress = new Map(
    rows
      .map((row) => [normalizeAddress(row.address), row] as const)
      .filter(([address]) => Boolean(address))
  );

  currentPointsCache = {
    file,
    rows,
    rowsByAddress
  };

  return currentPointsCache;
}

function toUserPointsResponse(row: CurrentPointsRow): UserPointsResponse {
  const pastPoint = normalizeNumber(row.totalAccumulatedPointInPastCampaign);
  const currentPoint = normalizeNumber(row.totalAccumulatedPointInCurrentCampaign);
  const pastSpecialPoint = normalizeNumber(row.totalAccumulatedSpecialPointInPastCampaign);
  const currentSpecialPoint = normalizeNumber(
    row.totalAccumulatedSpecialPointInCurrentCampaign
  );

  return {
    address: row.address,
    totalAccumulatedPointInPastCampaign: pastPoint,
    totalAccumulatedSpecialPointInPastCampaign: pastSpecialPoint,
    currentPoint,
    currentSpecialPoint,
    totalPoint: addDecimalStrings(pastPoint, currentPoint),
    totalSpecialPoint: addDecimalStrings(pastSpecialPoint, currentSpecialPoint),
    remark: row.remark
  };
}

function toEmptyUserPointsResponse(address: string): UserPointsResponse {
  return {
    address,
    totalAccumulatedPointInPastCampaign: "0",
    totalAccumulatedSpecialPointInPastCampaign: "0",
    currentPoint: "0",
    currentSpecialPoint: "0",
    totalPoint: "0",
    totalSpecialPoint: "0",
    remark: ""
  };
}

function parseCsv(csv: string): Record<string, string>[] {
  const rows = parseCsvRows(csv).filter((row) => row.some((cell) => cell.trim() !== ""));

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((header) => normalizeHeader(header));

  return rows.slice(1).map((row) => {
    const record: Record<string, string> = {};

    headers.forEach((header, index) => {
      record[header] = row[index]?.trim() ?? "";
    });

    return record;
  });
}

function stringifyCsv(headers: string[], rows: Record<string, string>[]) {
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header] ?? "")).join(","))
  ];

  return `${lines.join("\n")}\n`;
}

function escapeCsvCell(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const nextChar = csv[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      currentCell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);
  rows.push(currentRow);

  return rows;
}

function getCsvValue(row: Record<string, string>, header: string) {
  return row[normalizeHeader(header)] ?? "";
}

function normalizeHeader(header: string) {
  return header.trim().toLowerCase();
}

function normalizeAddress(address: string) {
  return address.trim().toLowerCase();
}

function normalizeNumber(value: string) {
  const trimmed = value.trim().replaceAll(",", "");
  const number = Number(trimmed);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return String(number);
}

function addDecimalStrings(left: string, right: string) {
  return String(Number(left) + Number(right));
}

function trimDecimal(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return String(Number(value.toFixed(12)));
}

function stringValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

async function readDataFile(relativePath: string) {
  return (await readDataFileSnapshot(relativePath)).content;
}

async function readDataFileSnapshot(relativePath: string): Promise<DataFileSnapshot> {
  const absolutePath = path.join(await getDataDir(), relativePath);
  const stats = await stat(absolutePath);
  const cached = dataFileCache.get(relativePath);

  if (cached && cached.mtimeMs === stats.mtimeMs && cached.size === stats.size) {
    return cached;
  }

  const snapshot = {
    content: await readFile(absolutePath, "utf8"),
    mtimeMs: stats.mtimeMs,
    size: stats.size
  };

  dataFileCache.set(relativePath, snapshot);
  return snapshot;
}

async function readOptionalDataFileSnapshot(relativePath: string) {
  try {
    return await readDataFileSnapshot(relativePath);
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return undefined;
    }

    throw error;
  }
}

async function writeDataFile(relativePath: string, content: string) {
  await writeFile(path.join(await getDataDir(), relativePath), content, "utf8");
  invalidateDataCaches(relativePath);
}

function invalidateDataCaches(relativePath?: string) {
  if (relativePath) {
    dataFileCache.delete(relativePath);
  } else {
    dataFileCache.clear();
  }

  if (!relativePath || relativePath === "campaigns.json") {
    registryCache = undefined;
  }

  currentPointsCache = undefined;

  if (relativePath) {
    distributionRowsCache.delete(relativePath);
  } else {
    distributionRowsCache.clear();
  }
}

function isSameSnapshot(left: DataFileSnapshot, right: DataFileSnapshot) {
  return left.mtimeMs === right.mtimeMs && left.size === right.size;
}

function isFileNotFoundError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

async function getDataDir() {
  dataDirPromise ??= resolveDataDir();
  return dataDirPromise;
}

async function resolveDataDir() {
  if (process.env.POINTS_DATA_DIR) {
    return process.env.POINTS_DATA_DIR;
  }

  return findDataDir(process.cwd());
}

async function findDataDir(startDir: string): Promise<string> {
  let currentDir = startDir;

  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = path.join(currentDir, "data");

    try {
      await readFile(path.join(candidate, "campaigns.json"), "utf8");
      return candidate;
    } catch {
      const parent = path.dirname(currentDir);

      if (parent === currentDir) {
        break;
      }

      currentDir = parent;
    }
  }

  throw new Error("Cannot find data/campaigns.json. Set POINTS_DATA_DIR to override.");
}
