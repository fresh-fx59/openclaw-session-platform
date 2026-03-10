import Fastify from "fastify";
import { z } from "zod";

import { TenantContextCompiler } from "../context/compiler.js";
import { MetricsRegistry } from "../metrics/registry.js";
import { OpenClawMethodNotAllowedError, OpenClawRuntimeAdapter } from "../openclaw/runtime-adapter.js";
import { RuntimeManager } from "../runtime/runtime-manager.js";

const dispatchSchema = z.object({
  prompt: z.string().min(1),
  memorySummary: z.string().optional(),
  artifactName: z.string().optional(),
  artifactContent: z.string().optional()
});

const gatewayCallSchema = z.object({
  method: z.string().min(1),
  params: z.record(z.string(), z.unknown()).optional(),
  expectFinal: z.boolean().optional(),
  timeoutMs: z.number().int().positive().max(60_000).optional()
});

export function buildServer(
  runtimeManager: RuntimeManager,
  metrics: MetricsRegistry,
  contextCompiler: TenantContextCompiler,
  openClawRuntimeAdapter: OpenClawRuntimeAdapter
) {
  const app = Fastify({ logger: true });

  app.get("/", async () => ({
    service: "openclaw-session-platform",
    status: "ok",
    endpoints: {
      healthz: "/healthz",
      metrics: "/metrics"
    }
  }));

  app.get("/healthz", async () => ({ ok: true }));

  app.get("/metrics", async (_request, reply) => {
    metrics.activeRuntimes.set(runtimeManager.getActiveRuntimeCount());
    reply.header("Content-Type", metrics.registry.contentType);
    return metrics.registry.metrics();
  });

  app.get("/tenants/:tenantId/status", async (request) => {
    const params = z.object({ tenantId: z.string().min(1) }).parse(request.params);
    return runtimeManager.getRuntimeStatus(params.tenantId);
  });

  app.get("/tenants/:tenantId/context", async (request, reply) => {
    const params = z.object({ tenantId: z.string().min(1) }).parse(request.params);
    const payload = await contextCompiler.compile(params.tenantId);
    if (!payload) {
      reply.code(404);
      return { error: "tenant_not_found" };
    }
    return payload;
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

  app.post("/tenants/:tenantId/openclaw/prepare", async (request) => {
    const params = z.object({ tenantId: z.string().min(1) }).parse(request.params);
    return openClawRuntimeAdapter.prepareTenant(params.tenantId);
  });

  app.post("/tenants/:tenantId/openclaw/start", async (request) => {
    const params = z.object({ tenantId: z.string().min(1) }).parse(request.params);
    return openClawRuntimeAdapter.start(params.tenantId);
  });

  app.get("/tenants/:tenantId/openclaw/status", async (request) => {
    const params = z.object({ tenantId: z.string().min(1) }).parse(request.params);
    return openClawRuntimeAdapter.status(params.tenantId);
  });

  app.post("/tenants/:tenantId/openclaw/stop", async (request) => {
    const params = z.object({ tenantId: z.string().min(1) }).parse(request.params);
    return openClawRuntimeAdapter.stop(params.tenantId);
  });

  app.post("/tenants/:tenantId/openclaw/call", async (request, reply) => {
    const params = z.object({ tenantId: z.string().min(1) }).parse(request.params);
    const body = gatewayCallSchema.parse(request.body);

    try {
      const result = await openClawRuntimeAdapter.call(params.tenantId, body.method, body.params, {
        expectFinal: body.expectFinal,
        timeoutMs: body.timeoutMs
      });
      return { method: body.method, result };
    } catch (error) {
      if (error instanceof OpenClawMethodNotAllowedError) {
        reply.code(400);
        return { error: "method_not_allowed", method: body.method };
      }
      throw error;
    }
  });

  return app;
}
