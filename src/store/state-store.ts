import type { RuntimeRecord, TenantState } from "../domain/types.js";

export interface StateStore {
  initialize(): Promise<void>;
  close(): Promise<void>;
  getTenant(tenantId: string): Promise<TenantState | null>;
  upsertTenant(tenant: TenantState): Promise<void>;
  upsertRuntime(runtime: RuntimeRecord): Promise<void>;
  getRuntime(runtimeId: string): Promise<RuntimeRecord | null>;
  resetActiveRuntimesOnBoot(): Promise<void>;
}
