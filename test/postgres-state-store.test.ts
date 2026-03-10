import { afterEach, describe, expect, test } from "vitest";
import { newDb } from "pg-mem";

import { PostgresStateStore } from "../src/store/postgres-state-store.js";

describe("PostgresStateStore", () => {
  const stores: PostgresStateStore[] = [];

  afterEach(async () => {
    while (stores.length > 0) {
      const store = stores.pop();
      if (store) {
        await store.close();
      }
    }
  });

  test("persists tenant/runtime metadata and resets active runtimes on boot", async () => {
    const db = newDb();
    const adapter = db.adapters.createPg();
    const pool = new adapter.Pool();
    const store = new PostgresStateStore(pool);
    stores.push(store);

    await store.initialize();

    await store.upsertTenant({
      tenantId: "alex",
      workspacePath: "/tmp/alex",
      artifactPath: "/tmp/alex-artifacts",
      currentRuntimeId: "runtime-1",
      lastRequestAt: "2026-03-10T00:00:00.000Z",
      lastStoppedAt: null,
      memorySummary: "summary"
    });

    await store.upsertRuntime({
      runtimeId: "runtime-1",
      tenantId: "alex",
      status: "active",
      createdAt: "2026-03-10T00:00:00.000Z",
      lastActivityAt: "2026-03-10T00:01:00.000Z",
      stoppedAt: null
    });

    const tenantBefore = await store.getTenant("alex");
    expect(tenantBefore?.currentRuntimeId).toBe("runtime-1");

    await store.resetActiveRuntimesOnBoot();

    const tenantAfter = await store.getTenant("alex");
    const runtimeAfter = await store.getRuntime("runtime-1");

    expect(tenantAfter?.currentRuntimeId).toBeNull();
    expect(runtimeAfter?.status).toBe("stopped");
    expect(runtimeAfter?.stoppedAt).not.toBeNull();
  });
});
