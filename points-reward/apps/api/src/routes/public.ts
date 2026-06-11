import type { FastifyInstance } from "fastify";
import {
  getCurrentCampaign,
  getLatestCampaignForDisplay,
  getTotalPointLeaderboard,
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

  app.get("/api/points/:address", async (request) => {
    const { address } = request.params as { address: string };
    return getUserPoints(address);
  });

  app.get("/api/leaderboard/total", async () => ({
    items: await getTotalPointLeaderboard()
  }));

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
