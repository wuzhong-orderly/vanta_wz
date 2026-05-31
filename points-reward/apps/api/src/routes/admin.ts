import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  getCampaignDistributionRowsByNumber,
  getCurrentPointsRows,
  getRegistry,
  rebuildCurrentPointsFromCampaigns,
  saveCampaignDistributionRows,
  saveCurrentPointsRows,
  saveRegistry
} from "../lib/campaign-store.js";

const campaignSchema = z.object({
  campaignNumber: z.number().int().positive(),
  campaignName: z.string(),
  totalVantaPoints: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  distributionCsv: z.string()
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
  vantaPoints: z.string(),
  specialPoints: z.string(),
  remark: z.string()
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
}
