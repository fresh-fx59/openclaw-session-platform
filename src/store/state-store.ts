import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";

import type { PlatformState, RuntimeRecord, TenantState } from "../domain/types.js";

const EMPTY_STATE: PlatformState = {
  tenants: {},
  runtimes: {}
};

export class JsonStateStore {
  private pending: Promise<void> = Promise.resolve();

  constructor(private readonly stateFile: string) {}

  async load(): Promise<PlatformState> {
    if (!existsSync(this.stateFile)) {
      return structuredClone(EMPTY_STATE);
    }
    try {
      const payload = await readFile(this.stateFile, "utf-8");
      return JSON.parse(payload) as PlatformState;
    } catch {
      return structuredClone(EMPTY_STATE);
    }
  }

  async save(state: PlatformState): Promise<void> {
    await mkdir(dirname(this.stateFile), { recursive: true });
    const tmpFile = `${this.stateFile}.tmp`;
    await writeFile(tmpFile, JSON.stringify(state, null, 2), "utf-8");
    await rename(tmpFile, this.stateFile);
  }

  async getTenant(tenantId: string): Promise<TenantState | null> {
    const state = await this.load();
    return state.tenants[tenantId] ?? null;
  }

  async upsertTenant(tenant: TenantState): Promise<void> {
    await this.withLock(async () => {
      const state = await this.load();
      state.tenants[tenant.tenantId] = tenant;
      await this.save(state);
    });
  }

  async upsertRuntime(runtime: RuntimeRecord): Promise<void> {
    await this.withLock(async () => {
      const state = await this.load();
      state.runtimes[runtime.runtimeId] = runtime;
      await this.save(state);
    });
  }

  async getRuntime(runtimeId: string): Promise<RuntimeRecord | null> {
    const state = await this.load();
    return state.runtimes[runtimeId] ?? null;
  }

  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.pending;
    let release!: () => void;
    this.pending = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;

    try {
      return await operation();
    } finally {
      release();
    }
  }
}
