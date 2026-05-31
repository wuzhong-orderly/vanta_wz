import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  endCampaign,
  getCampaignDistributionRowsByNumber,
  getCurrentPointsRows,
  getRegistry,
  importOrderlyCampaignRows,
  previewCampaignAllocation,
  rebuildCurrentPointsFromCampaigns,
  saveCampaignDistributionRows,
  saveCurrentPointsRows,
  saveRegistry
} from "../lib/campaign-store.js";

const campaignSchema = z.object({
  campaignNumber: z.number().int().positive(),
  campaignName: z.string(),
  description: z.string().optional(),
  totalVantaPoints: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  distributionCsv: z.string(),
  status: z.enum(["DRAFT", "ACTIVE", "ENDED", "SETTLED"]).optional(),
  orderlyBrokerId: z.string().optional(),
  orderlyStageId: z.string().optional(),
  orderlyEpochId: z.string().optional(),
  endedAt: z.string().optional(),
  settledAt: z.string().optional()
});

const registrySchema = z.object({
  currentCampaignNumber: z.number().int().positive(),
  currentPointsCsv: z.string(),
  campaigns: z.array(campaignSchema)
});

const currentPointsRowSchema = z.object({
  address: z.string(),
  totalAccumulatedPointInPastCampaign: z.string(),
  totalAccumulatedPointInCurrentCampaign: z.string(),
  totalAccumulatedSpecialPointInPastCampaign: z.string(),
  totalAccumulatedSpecialPointInCurrentCampaign: z.string(),
  remark: z.string()
});

const distributionRowSchema = z.object({
  address: z.string(),
  pnl: z.string(),
  volume: z.string(),
  orderlyPoints: z.string(),
  allocationPercentage: z.string(),
  vantaPoints: z.string(),
  specialPoints: z.string(),
  remark: z.string()
});

const importOrderlySchema = z.object({
  mode: z.enum(["leaderboard", "rankings"]).optional(),
  stage: z.string().optional(),
  period: z.string().optional(),
  epochId: z.string().optional(),
  brokerId: z.string().optional(),
  size: z.number().int().positive().max(500).optional(),
  maxPages: z.number().int().positive().max(100).optional()
});

export async function registerAdminRoutes(app: FastifyInstance) {
  app.get("/admin/registry", async () => getRegistry());

  app.put("/admin/registry", async (request) => {
    const registry = registrySchema.parse(request.body);
    return saveRegistry(registry);
  });

  app.get("/admin/current-points", async () => ({
    rows: await getCurrentPointsRows()
  }));

  app.put("/admin/current-points", async (request) => {
    const { rows } = z.object({ rows: z.array(currentPointsRowSchema) }).parse(request.body);
    return {
      rows: await saveCurrentPointsRows(rows)
    };
  });

  app.post("/admin/current-points/rebuild-from-campaigns", async () =>
    rebuildCurrentPointsFromCampaigns()
  );

  app.get("/admin/campaigns/:campaignNumber/distribution", async (request) => {
    const { campaignNumber } = z
      .object({ campaignNumber: z.coerce.number().int().positive() })
      .parse(request.params);

    return {
      rows: await getCampaignDistributionRowsByNumber(campaignNumber)
    };
  });

  app.put("/admin/campaigns/:campaignNumber/distribution", async (request) => {
    const { campaignNumber } = z
      .object({ campaignNumber: z.coerce.number().int().positive() })
      .parse(request.params);
    const { rows } = z.object({ rows: z.array(distributionRowSchema) }).parse(request.body);

    return {
      rows: await saveCampaignDistributionRows(campaignNumber, rows)
    };
  });

  app.post("/admin/campaigns/:campaignNumber/allocation-preview", async (request) => {
    const { campaignNumber } = z
      .object({ campaignNumber: z.coerce.number().int().positive() })
      .parse(request.params);

    return previewCampaignAllocation(campaignNumber);
  });

  app.post("/admin/campaigns/:campaignNumber/import-orderly", async (request) => {
    const { campaignNumber } = z
      .object({ campaignNumber: z.coerce.number().int().positive() })
      .parse(request.params);
    const body = importOrderlySchema.parse(request.body ?? {});

    return importOrderlyCampaignRows(campaignNumber, body);
  });

  app.post("/admin/campaigns/:campaignNumber/end", async (request) => {
    const { campaignNumber } = z
      .object({ campaignNumber: z.coerce.number().int().positive() })
      .parse(request.params);
    const { rows } = z.object({ rows: z.array(distributionRowSchema) }).parse(request.body);

    return endCampaign(campaignNumber, rows);
  });
}
