import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";

import type { PlatformState, RuntimeRecord, TenantState } from "../domain/types.js";

const EMPTY_STATE: PlatformState = {
  tenants: {},
  runtimes: {}
};

export class JsonStateStore {
  constructor(private readonly stateFile: string) {}

  async load(): Promise<PlatformState> {
    if (!existsSync(this.stateFile)) {
      return structuredClone(EMPTY_STATE);
    }
    const payload = await readFile(this.stateFile, "utf-8");
    return JSON.parse(payload) as PlatformState;
  }

  async save(state: PlatformState): Promise<void> {
    await mkdir(dirname(this.stateFile), { recursive: true });
    await writeFile(this.stateFile, JSON.stringify(state, null, 2), "utf-8");
  }

  async getTenant(tenantId: string): Promise<TenantState | null> {
    const state = await this.load();
    return state.tenants[tenantId] ?? null;
  }

  async upsertTenant(tenant: TenantState): Promise<void> {
    const state = await this.load();
    state.tenants[tenant.tenantId] = tenant;
    await this.save(state);
  }

  async upsertRuntime(runtime: RuntimeRecord): Promise<void> {
    const state = await this.load();
    state.runtimes[runtime.runtimeId] = runtime;
    await this.save(state);
  }

  async getRuntime(runtimeId: string): Promise<RuntimeRecord | null> {
    const state = await this.load();
    return state.runtimes[runtimeId] ?? null;
  }
}
