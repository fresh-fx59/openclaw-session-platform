import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import type { RuntimeRecord, TenantState } from "../src/domain/types.js";
import { RuntimeManager } from "../src/runtime/runtime-manager.js";
import type { StateStore } from "../src/store/state-store.js";
import { WorkspaceStore } from "../src/store/workspace-store.js";

class InMemoryStateStore implements StateStore {
  private tenants = new Map<string, TenantState>();
  private runtimes = new Map<string, RuntimeRecord>();

  async initialize(): Promise<void> {}
  async close(): Promise<void> {}
  async resetActiveRuntimesOnBoot(): Promise<void> {}

  async getTenant(tenantId: string): Promise<TenantState | null> {
    return this.tenants.get(tenantId) ?? null;
  }

  async upsertTenant(tenant: TenantState): Promise<void> {
    this.tenants.set(tenant.tenantId, tenant);
  }

  async upsertRuntime(runtime: RuntimeRecord): Promise<void> {
    this.runtimes.set(runtime.runtimeId, runtime);
  }

  async getRuntime(runtimeId: string): Promise<RuntimeRecord | null> {
    return this.runtimes.get(runtimeId) ?? null;
  }
}

async function buildSubject() {
  const root = await mkdtemp(join(tmpdir(), "openclo-platform-"));
  const stateStore = new InMemoryStateStore();
  const workspaceStore = new WorkspaceStore(join(root, "workspaces"), join(root, "artifacts"));
  const runtimeManager = new RuntimeManager(stateStore, workspaceStore);
  return { root, stateStore, workspaceStore, runtimeManager };
}

describe("RuntimeManager", () => {
  test("isolates workspaces and artifacts per tenant", async () => {
    const { runtimeManager } = await buildSubject();

    const first = await runtimeManager.dispatch("tenant-a", {
      prompt: "build report",
      artifactName: "report.txt",
      artifactContent: "alpha"
    });
    const second = await runtimeManager.dispatch("tenant-b", {
      prompt: "build report",
      artifactName: "report.txt",
      artifactContent: "beta"
    });

    expect(first.workspacePath).not.toBe(second.workspacePath);
    expect(first.artifactPath).not.toBe(second.artifactPath);

    const firstArtifact = await readFile(join(first.artifactPath, "report.txt"), "utf-8");
    const secondArtifact = await readFile(join(second.artifactPath, "report.txt"), "utf-8");

    expect(firstArtifact).toBe("alpha");
    expect(secondArtifact).toBe("beta");
  });

  test("stops idle runtime and preserves workspace log for later resume", async () => {
    const { runtimeManager, workspaceStore } = await buildSubject();

    const initial = await runtimeManager.dispatch("tenant-a", {
      prompt: "first request",
      memorySummary: "user has previous context"
    });

    const stopped = await runtimeManager.stopIdleRuntimes(0);
    expect(stopped).toEqual(["tenant-a"]);

    const statusAfterStop = runtimeManager.getRuntimeStatus("tenant-a");
    expect(statusAfterStop.active).toBe(false);

    const resumed = await runtimeManager.dispatch("tenant-a", {
      prompt: "second request"
    });

    expect(resumed.runtimeId).not.toBe(initial.runtimeId);
    expect(resumed.response).toContain("persisted context");

    const log = await workspaceStore.readRequestLog("tenant-a");
    expect(log).toContain("first request");
    expect(log).toContain("second request");
  });

  test("handles concurrent dispatches without corrupting state", async () => {
    const { runtimeManager, stateStore } = await buildSubject();

    await Promise.all([
      runtimeManager.dispatch("tenant-a", { prompt: "alpha" }),
      runtimeManager.dispatch("tenant-b", { prompt: "beta" })
    ]);

    const tenantA = await stateStore.getTenant("tenant-a");
    const tenantB = await stateStore.getTenant("tenant-b");

    expect(tenantA?.tenantId).toBe("tenant-a");
    expect(tenantB?.tenantId).toBe("tenant-b");
  });
});
