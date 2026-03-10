import Fastify from "fastify";
import { z } from "zod";

import { MetricsRegistry } from "../metrics/registry.js";
import { RuntimeManager } from "../runtime/runtime-manager.js";

const dispatchSchema = z.object({
  prompt: z.string().min(1),
  memorySummary: z.string().optional(),
  artifactName: z.string().optional(),
  artifactContent: z.string().optional()
});

export function buildServer(runtimeManager: RuntimeManager, metrics: MetricsRegistry) {
  const app = Fastify({ logger: true });

  app.get("/healthz", async () => ({ ok: true }));

  app.get("/metrics", async (_request, reply) => {
    reply.header("Content-Type", metrics.registry.contentType);
    return metrics.registry.metrics();
  });

  app.get("/tenants/:tenantId/status", async (request) => {
    const params = z.object({ tenantId: z.string().min(1) }).parse(request.params);
    return runtimeManager.getRuntimeStatus(params.tenantId);
  });

  app.post("/tenants/:tenantId/dispatch", async (request) => {
    const params = z.object({ tenantId: z.string().min(1) }).parse(request.params);
    const body = dispatchSchema.parse(request.body);
    const result = await runtimeManager.dispatch(params.tenantId, body);
    metrics.dispatchTotal.inc();
    metrics.activeRuntimes.set(runtimeManager.getActiveRuntimeCount());
    return result;
  });

  app.post("/tenants/:tenantId/stop", async (request) => {
    const params = z.object({ tenantId: z.string().min(1) }).parse(request.params);
    const stopped = await runtimeManager.stopRuntime(params.tenantId);
    metrics.activeRuntimes.set(runtimeManager.getActiveRuntimeCount());
    return { stopped };
  });

  return app;
}
