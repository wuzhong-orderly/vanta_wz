import cors from "@fastify/cors";
import Fastify from "fastify";
import { registerAdminRoutes } from "./routes/admin.js";
import { registerPublicRoutes } from "./routes/public.js";

const app = Fastify({
  logger: true,
  bodyLimit: 20 * 1024 * 1024
});

await app.register(cors, {
  origin: true,
  credentials: true
});

app.get("/health", async () => ({
  ok: true,
  service: "points-reward-api"
}));

await registerPublicRoutes(app);
await registerAdminRoutes(app);

const port = Number(process.env.PORT ?? 4100);
const host = process.env.HOST ?? "0.0.0.0";

await app.listen({ port, host });
