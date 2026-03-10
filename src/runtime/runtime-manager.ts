import { randomUUID } from "node:crypto";

import type { DispatchRequest, DispatchResult, RuntimeRecord, TenantState } from "../domain/types.js";
import type { StateStore } from "../store/state-store.js";
import { WorkspaceStore } from "../store/workspace-store.js";

interface ActiveRuntime {
  runtimeId: string;
  tenantId: string;
  createdAt: string;
  lastActivityAt: number;
}

export class RuntimeManager {
  private readonly activeRuntimes = new Map<string, ActiveRuntime>();

  constructor(
    private readonly stateStore: StateStore,
    private readonly workspaceStore: WorkspaceStore
  ) {}

  async ensureRuntime(tenantId: string): Promise<{ runtime: ActiveRuntime; reusedRuntime: boolean; tenant: TenantState }> {
    const existing = this.activeRuntimes.get(tenantId);
    const nowIso = new Date().toISOString();
    const paths = await this.workspaceStore.ensureTenantPaths(tenantId);

    if (existing) {
      existing.lastActivityAt = Date.now();
      const tenant = await this.ensureTenantRecord(tenantId, paths.workspacePath, paths.artifactPath, existing.runtimeId, nowIso);
      await this.stateStore.upsertRuntime(this.toRuntimeRecord(existing, "active"));
      return { runtime: existing, reusedRuntime: true, tenant };
    }

    const runtime: ActiveRuntime = {
      runtimeId: randomUUID(),
      tenantId,
      createdAt: nowIso,
      lastActivityAt: Date.now()
    };
    this.activeRuntimes.set(tenantId, runtime);

    const tenant = await this.ensureTenantRecord(tenantId, paths.workspacePath, paths.artifactPath, runtime.runtimeId, nowIso);
    await this.stateStore.upsertRuntime(this.toRuntimeRecord(runtime, "active"));
    return { runtime, reusedRuntime: false, tenant };
  }

  async dispatch(tenantId: string, request: DispatchRequest): Promise<DispatchResult> {
    const { runtime, reusedRuntime, tenant } = await this.ensureRuntime(tenantId);
    runtime.lastActivityAt = Date.now();

    if (request.memorySummary) {
      tenant.memorySummary = request.memorySummary;
      await this.stateStore.upsertTenant(tenant);
    }

    await this.workspaceStore.appendRequestLog(
      tenantId,
      JSON.stringify({
        at: new Date().toISOString(),
        prompt: request.prompt,
        runtimeId: runtime.runtimeId
      })
    );

    if (request.artifactName && request.artifactContent) {
      const artifact = await this.workspaceStore.writeArtifact(tenantId, request.artifactName, request.artifactContent);
      await this.stateStore.upsertArtifact({
        tenantId,
        name: request.artifactName,
        path: artifact.path,
        contentSha256: artifact.contentSha256,
        updatedAt: new Date().toISOString()
      });
    }

    await this.stateStore.upsertRuntime(this.toRuntimeRecord(runtime, "active"));

    const response = tenant.memorySummary
      ? `Resumed tenant ${tenantId} with persisted context.`
      : `Handled request for tenant ${tenantId} in isolated runtime.`;

    return {
      tenantId,
      runtimeId: runtime.runtimeId,
      workspacePath: tenant.workspacePath,
      artifactPath: tenant.artifactPath,
      reusedRuntime,
      response
    };
  }

  async stopRuntime(tenantId: string): Promise<boolean> {
    const runtime = this.activeRuntimes.get(tenantId);
    if (!runtime) {
      return false;
    }
    this.activeRuntimes.delete(tenantId);
    await this.stateStore.upsertRuntime({
      ...this.toRuntimeRecord(runtime, "stopped"),
      stoppedAt: new Date().toISOString()
    });
    const tenant = await this.stateStore.getTenant(tenantId);
    if (tenant) {
      tenant.currentRuntimeId = null;
      tenant.lastStoppedAt = new Date().toISOString();
      await this.stateStore.upsertTenant(tenant);
    }
    return true;
  }

  async stopIdleRuntimes(idleTimeoutMs: number): Promise<string[]> {
    const now = Date.now();
    const stopped: string[] = [];
    for (const [tenantId, runtime] of this.activeRuntimes.entries()) {
      if (now - runtime.lastActivityAt >= idleTimeoutMs) {
        await this.stopRuntime(tenantId);
        stopped.push(tenantId);
      }
    }
    return stopped;
  }

  getRuntimeStatus(tenantId: string): { active: boolean; runtimeId: string | null; lastActivityAt: string | null } {
    const runtime = this.activeRuntimes.get(tenantId);
    if (!runtime) {
      return { active: false, runtimeId: null, lastActivityAt: null };
    }
    return {
      active: true,
      runtimeId: runtime.runtimeId,
      lastActivityAt: new Date(runtime.lastActivityAt).toISOString()
    };
  }

  getActiveRuntimeCount(): number {
    return this.activeRuntimes.size;
  }

  private async ensureTenantRecord(
    tenantId: string,
    workspacePath: string,
    artifactPath: string,
    runtimeId: string,
    lastRequestAt: string
  ): Promise<TenantState> {
    const tenant = (await this.stateStore.getTenant(tenantId)) ?? {
      tenantId,
      workspacePath,
      artifactPath,
      currentRuntimeId: null,
      lastRequestAt: null,
      lastStoppedAt: null,
      memorySummary: null
    };

    tenant.workspacePath = workspacePath;
    tenant.artifactPath = artifactPath;
    tenant.currentRuntimeId = runtimeId;
    tenant.lastRequestAt = lastRequestAt;
    await this.stateStore.upsertTenant(tenant);
    return tenant;
  }

  private toRuntimeRecord(runtime: ActiveRuntime, status: RuntimeRecord["status"]): RuntimeRecord {
    return {
      runtimeId: runtime.runtimeId,
      tenantId: runtime.tenantId,
      status,
      createdAt: runtime.createdAt,
      lastActivityAt: new Date(runtime.lastActivityAt).toISOString(),
      stoppedAt: status === "stopped" ? new Date().toISOString() : null
    };
  }
}
