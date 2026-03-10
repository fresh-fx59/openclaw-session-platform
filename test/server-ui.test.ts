import { afterEach, describe, expect, test } from "vitest";

import { buildServer } from "../src/api/server.js";
import { MetricsRegistry } from "../src/metrics/registry.js";

const runtimeManager = {
  getActiveRuntimeCount() {
    return 0;
  },
  getRuntimeStatus() {
    return {
      active: false,
      runtimeId: null,
      lastActivityAt: null
    };
  },
  async dispatch() {
    return {
      tenantId: "tenant-a",
      runtimeId: "runtime-a",
      workspacePath: "/tmp/workspace",
      artifactPath: "/tmp/artifacts",
      reusedRuntime: false,
      response: "ok"
    };
  },
  async stopRuntime() {
    return true;
  }
};

const contextCompiler = {
  async compile() {
    return null;
  }
};

const openClawRuntimeAdapter = {
  async prepareTenant(tenantId: string) {
    return {
      tenantId,
      containerName: "openclaw-tenant-" + tenantId,
      image: "image",
      configPath: "/config",
      workspacePath: "/workspace",
      hostConfigPath: "/host/config",
      hostWorkspacePath: "/host/workspace",
      state: "created" as const,
      readiness: "not_applicable" as const,
      rpcOk: false,
      rpcUrl: null,
      readinessDetail: null
    };
  },
  async start(tenantId: string) {
    return {
      tenantId,
      containerName: "openclaw-tenant-" + tenantId,
      image: "image",
      configPath: "/config",
      workspacePath: "/workspace",
      hostConfigPath: "/host/config",
      hostWorkspacePath: "/host/workspace",
      state: "running" as const,
      readiness: "ready" as const,
      rpcOk: true,
      rpcUrl: "ws://127.0.0.1:18789",
      readinessDetail: null
    };
  },
  async status(tenantId: string) {
    return {
      tenantId,
      containerName: "openclaw-tenant-" + tenantId,
      image: "image",
      configPath: "/config",
      workspacePath: "/workspace",
      hostConfigPath: "/host/config",
      hostWorkspacePath: "/host/workspace",
      state: "running" as const,
      readiness: "ready" as const,
      rpcOk: true,
      rpcUrl: "ws://127.0.0.1:18789",
      readinessDetail: null
    };
  },
  async stop(tenantId: string) {
    return {
      tenantId,
      containerName: "openclaw-tenant-" + tenantId,
      image: "image",
      configPath: "/config",
      workspacePath: "/workspace",
      hostConfigPath: "/host/config",
      hostWorkspacePath: "/host/workspace",
      state: "exited" as const,
      readiness: "not_applicable" as const,
      rpcOk: false,
      rpcUrl: null,
      readinessDetail: null
    };
  },
  async call() {
    return { ok: true };
  },
  async chatSend() {
    return { status: "ok" };
  },
  async chatHistory() {
    return { messages: [] };
  }
};

let app: ReturnType<typeof buildServer> | null = null;

afterEach(async () => {
  if (app) {
    await app.close();
    app = null;
  }
});

describe("UI routes", () => {
  test("root status advertises ui endpoint", async () => {
    app = buildServer(
      runtimeManager as never,
      new MetricsRegistry(),
      contextCompiler as never,
      openClawRuntimeAdapter as never
    );

    const response = await app.inject({ method: "GET", url: "/" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      service: "openclaw-session-platform",
      status: "ok",
      endpoints: {
        ui: "/ui",
        healthz: "/healthz",
        metrics: "/metrics"
      }
    });
  });

  test("serves minimal ui assets", async () => {
    app = buildServer(
      runtimeManager as never,
      new MetricsRegistry(),
      contextCompiler as never,
      openClawRuntimeAdapter as never
    );

    const html = await app.inject({ method: "GET", url: "/ui" });
    expect(html.statusCode).toBe(200);
    expect(html.headers["content-type"]).toContain("text/html");
    expect(html.body).toContain("Tenant Runtime Console");

    const css = await app.inject({ method: "GET", url: "/ui/styles.css" });
    expect(css.statusCode).toBe(200);
    expect(css.headers["content-type"]).toContain("text/css");
    expect(css.body).toContain("--accent");

    const js = await app.inject({ method: "GET", url: "/ui/app.js" });
    expect(js.statusCode).toBe(200);
    expect(js.headers["content-type"]).toContain("application/javascript");
    expect(js.body).toContain("chat/send");
  });
});
