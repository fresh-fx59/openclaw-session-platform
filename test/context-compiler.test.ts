import { describe, expect, test } from "vitest";

import type { ArtifactRecord, RuntimeRecord, TenantState } from "../src/domain/types.js";
import { TenantContextCompiler } from "../src/context/compiler.js";
import type { StateStore } from "../src/store/state-store.js";

class InMemoryStateStore implements StateStore {
  private tenants = new Map<string, TenantState>();
  private runtimes = new Map<string, RuntimeRecord>();
  private artifacts = new Map<string, ArtifactRecord[]>();

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

  async upsertArtifact(artifact: ArtifactRecord): Promise<void> {
    const rows = this.artifacts.get(artifact.tenantId) ?? [];
    rows.push(artifact);
    this.artifacts.set(artifact.tenantId, rows);
  }

  async listArtifactsByTenant(tenantId: string): Promise<ArtifactRecord[]> {
    return this.artifacts.get(tenantId) ?? [];
  }
}

describe("TenantContextCompiler", () => {
  test("compiles compact tenant resume payload", async () => {
    const store = new InMemoryStateStore();
    const compiler = new TenantContextCompiler(store);

    await store.upsertTenant({
      tenantId: "alex",
      workspacePath: "/workspaces/alex",
      artifactPath: "/artifacts/alex",
      currentRuntimeId: null,
      lastRequestAt: "2026-03-10T00:00:00.000Z",
      lastStoppedAt: "2026-03-10T00:01:00.000Z",
      memorySummary: "short summary"
    });

    await store.upsertArtifact({
      tenantId: "alex",
      name: "proof.txt",
      path: "/artifacts/alex/proof.txt",
      contentSha256: "sha",
      updatedAt: "2026-03-10T00:02:00.000Z"
    });

    const compiled = await compiler.compile("alex");

    expect(compiled).not.toBeNull();
    expect(compiled?.tenantId).toBe("alex");
    expect(compiled?.memorySummary).toBe("short summary");
    expect(compiled?.artifacts).toHaveLength(1);
    expect(compiled?.artifacts[0]?.name).toBe("proof.txt");
  });
});
