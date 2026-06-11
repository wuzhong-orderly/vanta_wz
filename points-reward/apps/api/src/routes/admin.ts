import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  endCampaign,
  getCampaignDistributionRowsByNumber,
  getOrderlyEpochs,
  getOrderlyStages,
  getRegistry,
  getSettledPointsRows,
  importOrderlyCampaignRows,
  previewCampaignAllocation,
  rebuildSettledPointsFromCampaigns,
  saveCampaignDistributionRows,
  saveSettledPointsRows,
  saveRegistry
} from "../lib/campaign-store.js";
import { getInviteCodeRows, saveInviteCodeRows } from "../lib/invite-store.js";

const campaignSchema = z.object({
  campaignNumber: z.number().int().positive(),
  campaignName: z.string(),
  description: z.string().optional(),
  totalVantaPoints: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  distributionCsv: z.string(),
  currentCampaign: z.boolean().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ENDED", "SETTLED"]).optional(),
  orderlyBrokerId: z.string().optional(),
  orderlyStageId: z.string().optional(),
  orderlyEpochId: z.string().optional(),
  endedAt: z.string().optional(),
  settledAt: z.string().optional()
});

const registrySchema = z.object({
  currentCampaignNumber: z.number().int().positive(),
  settledPointsCsv: z.string(),
  campaigns: z.array(campaignSchema)
});

const settledPointsRowSchema = z.object({
  address: z.string(),
  settledPoints: z.string(),
  totalPoints: z.string().default("0"),
  specialPoints: z.string(),
  remark: z.string()
});

const distributionRowSchema = z.object({
  address: z.string(),
  orderlyPoints: z.string(),
  allocationPercentage: z.string(),
  vantaPoints: z.string(),
  remark: z.string()
});

const inviteCodeRowSchema = z.object({
  inviteCode: z.string(),
  boundAddress: z.string(),
  boundAt: z.string()
});

const importOrderlySchema = z.object({
  mode: z.enum(["stage-ranking", "epoch-ranking", "leaderboard", "rankings"]).optional(),
  stage: z.string().optional(),
  period: z.string().optional(),
  epochId: z.string().optional(),
  brokerId: z.string().optional(),
  size: z.number().int().positive().max(500).optional(),
  maxPages: z.number().int().positive().max(100).optional()
});

export async function registerAdminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (request, reply) => {
    if (!request.url.startsWith("/admin/")) {
      return;
    }

    const expectedToken = process.env.POINTS_ADMIN_TOKEN;
    const authorization = request.headers.authorization ?? "";
    const token = authorization.replace(/^Bearer\s+/i, "");

    if (!expectedToken || token !== expectedToken) {
      return reply.code(401).send({
        error: "Unauthorized"
      });
    }
  });

  app.get("/admin/registry", async () => getRegistry());

  app.put("/admin/registry", async (request) => {
    const registry = registrySchema.parse(request.body);
    const saved = await saveRegistry(registry);
    await rebuildSettledPointsFromCampaigns();
    return saved;
  });

  app.get("/admin/settled-points", async () => ({
    rows: await getSettledPointsRows()
  }));

  app.get("/admin/invite-codes", async () => ({
    rows: await getInviteCodeRows()
  }));

  app.put("/admin/invite-codes", async (request) => {
    const { rows } = z.object({ rows: z.array(inviteCodeRowSchema) }).parse(request.body);

    return {
      rows: await saveInviteCodeRows(rows)
    };
  });

  app.put("/admin/settled-points", async (request) => {
    const { rows } = z.object({ rows: z.array(settledPointsRowSchema) }).parse(request.body);
    await saveSettledPointsRows(rows);
    return rebuildSettledPointsFromCampaigns();
  });

  app.post("/admin/settled-points/rebuild-from-campaigns", async () =>
    rebuildSettledPointsFromCampaigns()
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

    const savedRows = await saveCampaignDistributionRows(campaignNumber, rows);
    await rebuildSettledPointsFromCampaigns();

    return {
      rows: savedRows
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

  async function handleOrderlyStages(request: { query: unknown }) {
    const { brokerId, broker_id } = z
      .object({
        brokerId: z.string().optional(),
        broker_id: z.string().optional()
      })
      .parse(request.query);
    const broker = broker_id ?? brokerId;

    return {
      rows: await getOrderlyStages(z.string().min(1).parse(broker))
    };
  }

  async function handleOrderlyEpochs(request: { query: unknown }) {
    const { stage } = z.object({ stage: z.string().optional() }).parse(request.query);

    return {
      rows: await getOrderlyEpochs(stage)
    };
  }

  app.get("/v1/public/points/stages", handleOrderlyStages);
  app.get("/v1/public/points/epoch_dates", handleOrderlyEpochs);
  app.get("/admin/orderly/stages", handleOrderlyStages);
  app.get("/admin/orderly/epochs", handleOrderlyEpochs);

  app.post("/admin/campaigns/:campaignNumber/end", async (request) => {
    const { campaignNumber } = z
      .object({ campaignNumber: z.coerce.number().int().positive() })
      .parse(request.params);
    const { rows } = z.object({ rows: z.array(distributionRowSchema) }).parse(request.body);

    return endCampaign(campaignNumber, rows);
  });
}
