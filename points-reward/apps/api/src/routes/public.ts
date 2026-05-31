import type { FastifyInstance } from "fastify";
import {
  getCurrentCampaign,
  getTotalPointLeaderboard,
  getUserPoints
} from "../lib/campaign-store.js";

export async function registerPublicRoutes(app: FastifyInstance) {
  app.get("/api/campaign/current", async () => {
    const campaign = await getCurrentCampaign();

    return {
      campaign
    };
  });

  app.get("/api/points/:address", async (request) => {
    const { address } = request.params as { address: string };
    return getUserPoints(address);
  });

  app.get("/api/leaderboard/total", async () => ({
    items: await getTotalPointLeaderboard()
  }));
}
