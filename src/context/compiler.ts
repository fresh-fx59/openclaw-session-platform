import type { CompiledTenantContext } from "../domain/types.js";
import type { StateStore } from "../store/state-store.js";

export class TenantContextCompiler {
  constructor(private readonly stateStore: StateStore) {}

  async compile(tenantId: string): Promise<CompiledTenantContext | null> {
    const tenant = await this.stateStore.getTenant(tenantId);
    if (!tenant) {
      return null;
    }

    const artifacts = await this.stateStore.listArtifactsByTenant(tenantId);

    return {
      tenantId,
      memorySummary: tenant.memorySummary,
      workspacePath: tenant.workspacePath,
      artifactPath: tenant.artifactPath,
      currentRuntimeId: tenant.currentRuntimeId,
      lastRequestAt: tenant.lastRequestAt,
      lastStoppedAt: tenant.lastStoppedAt,
      artifacts
    };
  }
}
