import type { FastifyInstance } from "fastify";
import {
  getCampaignPointLeaderboard,
  getCampaignsForDisplay,
  getCurrentCampaign,
  getLatestCampaignForDisplay,
  getTotalPointLeaderboard,
  getUserCampaignPoints,
  getUserPoints
} from "../lib/campaign-store.js";
import { bindInviteCode, getInviteBinding } from "../lib/invite-store.js";

export async function registerPublicRoutes(app: FastifyInstance) {
  app.get("/api/campaign/current", async () => {
    const campaign = await getCurrentCampaign();

    return {
      campaign
    };
  });

  app.get("/api/campaign/latest", async () => ({
    campaign: await getLatestCampaignForDisplay()
  }));

  app.get("/api/campaigns", async () => ({
    items: await getCampaignsForDisplay()
  }));

  app.get("/api/points/:address", async (request) => {
    const { address } = request.params as { address: string };
    return getUserPoints(address);
  });

  app.get("/api/points/:address/campaigns", async (request) => {
    const { address } = request.params as { address: string };
    return {
      items: await getUserCampaignPoints(address)
    };
  });

  app.get("/api/leaderboard/total", async () => ({
    items: await getTotalPointLeaderboard()
  }));

  app.get("/api/leaderboard/campaign/:campaignNumber", async (request, reply) => {
    const { campaignNumber } = request.params as { campaignNumber: string };
    const parsedCampaignNumber = Number(campaignNumber);

    if (!Number.isInteger(parsedCampaignNumber) || parsedCampaignNumber <= 0) {
      reply.code(400);
      return {
        error: "Invalid campaign number."
      };
    }

    return {
      items: await getCampaignPointLeaderboard(parsedCampaignNumber)
    };
  });

  app.get("/api/invite-bindings/:address", async (request) => {
    const { address } = request.params as { address: string };
    return getInviteBinding(address);
  });

  app.post("/api/invite-bindings", async (request, reply) => {
    try {
      return await bindInviteCode(request.body);
    } catch (error) {
      reply.code(400);
      return {
        error: error instanceof Error ? error.message : "Failed to bind invite code."
      };
    }
  });
}
