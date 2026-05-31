import { readFile, writeFile } from "node:fs/promises";
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
  pnl: "pnl",
  volume: "volume",
  orderlyPoints: "orderly_point",
  allocationPercentage: "allocation_percentage",
  vantaPoints: "vanta_points",
  specialPoints: "special_points",
  remark: "remark"
};

const currentPointsHeaders = Object.values(currentPointsHeaderMap);
const distributionHeaders = Object.values(distributionHeaderMap);

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
    const isPastCampaign = campaign.campaignNumber < registry.currentCampaignNumber;
    const isCurrentCampaign = campaign.campaignNumber === registry.currentCampaignNumber;

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
      campaignsRead: registry.campaigns.filter(
        (campaign) => campaign.campaignNumber <= registry.currentCampaignNumber
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
    mode?: "leaderboard" | "rankings";
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
  const rows = await readCurrentPointsRows();
  const row = rows.find((item) => normalizeAddress(item.address) === normalizedAddress);

  if (!row) {
    return toEmptyUserPointsResponse(address);
  }

  return toUserPointsResponse(row);
}

export async function getTotalPointLeaderboard(): Promise<LeaderboardRow[]> {
  const rows = await readCurrentPointsRows();

  return rows
    .map(toUserPointsResponse)
    .sort((left, right) => Number(right.totalPoint) - Number(left.totalPoint))
    .map((row, index) => ({
      ...row,
      rank: index + 1
    }));
}

export async function getCampaignDistributionRows(
  campaign: CampaignConfig
): Promise<CampaignDistributionRow[]> {
  const csv = await readOptionalDataFile(campaign.distributionCsv);

  if (!csv) {
    return [];
  }

  return parseCsv(csv).map((row) => ({
    address: getCsvValue(row, distributionHeaderMap.address),
    pnl: getCsvValue(row, distributionHeaderMap.pnl),
    volume: getCsvValue(row, distributionHeaderMap.volume),
    orderlyPoints: getCsvValue(row, distributionHeaderMap.orderlyPoints),
    allocationPercentage: getCsvValue(row, distributionHeaderMap.allocationPercentage),
    vantaPoints: getCsvValue(row, distributionHeaderMap.vantaPoints),
    specialPoints: getCsvValue(row, distributionHeaderMap.specialPoints),
    remark: getCsvValue(row, distributionHeaderMap.remark)
  }));
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
      [distributionHeaderMap.pnl]: row.pnl,
      [distributionHeaderMap.volume]: row.volume,
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
  mode: "leaderboard" | "rankings";
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
    const url =
      options.mode === "rankings"
        ? new URL("/v1/public/points/rankings", baseUrl)
        : new URL("/v1/public/points/leaderboard", baseUrl);

    url.searchParams.set("page", String(page));
    url.searchParams.set("size", String(options.size));

    if (options.mode === "rankings") {
      if (!options.stage || !options.period) {
        throw new Error("Orderly rankings import requires stage and period.");
      }

      url.searchParams.set("stage", options.stage);
      url.searchParams.set("period", options.period);
    } else if (options.epochId) {
      url.searchParams.set("epoch_id", options.epochId);
    }

    if (options.brokerId) {
      url.searchParams.set("broker_id", options.brokerId);
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Orderly API request failed: ${response.status} ${await response.text()}`);
    }

    const payload = await response.json();
    const pageRows = extractRows(payload).map(toDistributionRowFromOrderly);
    rows.push(...pageRows);

    if (pageRows.length < options.size) {
      break;
    }
  }

  return mergeDistributionRowsByAddress(rows);
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
    pnl: stringValue(row.pnl ?? row.realized_pnl),
    volume: stringValue(row.volume ?? row.perp_volume),
    orderlyPoints: stringValue(
      row.orderly_point ?? row.points ?? row.point ?? row.merits ?? row.total_points
    ),
    allocationPercentage: "",
    vantaPoints: "0",
    specialPoints: "0",
    remark: ""
  };
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

    existing.pnl = addDecimalStrings(existing.pnl, row.pnl);
    existing.volume = addDecimalStrings(existing.volume, row.volume);
    existing.orderlyPoints = addDecimalStrings(existing.orderlyPoints, row.orderlyPoints);
  }

  return Array.from(rowsByAddress.values());
}

async function readRegistry(): Promise<CampaignRegistry> {
  const raw = await readDataFile("campaigns.json");
  return registrySchema.parse(JSON.parse(raw));
}

async function readCurrentPointsRows(): Promise<CurrentPointsRow[]> {
  const registry = await readRegistry();
  const csv = await readDataFile(registry.currentPointsCsv);

  return parseCsv(csv).map((row) => ({
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
  return readFile(path.join(await getDataDir(), relativePath), "utf8");
}

async function readOptionalDataFile(relativePath: string) {
  try {
    return await readDataFile(relativePath);
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return "";
    }

    throw error;
  }
}

async function writeDataFile(relativePath: string, content: string) {
  await writeFile(path.join(await getDataDir(), relativePath), content, "utf8");
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
