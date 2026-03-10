import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { Pool } from "pg";
import { buildServer } from "./api/server.js";
import { loadConfig } from "./config/app-config.js";
import { TenantContextCompiler } from "./context/compiler.js";
import { MetricsRegistry } from "./metrics/registry.js";
import { OpenClawRuntimeAdapter } from "./openclaw/runtime-adapter.js";
import { IdleReaper } from "./reaper/idle-reaper.js";
import { RuntimeManager } from "./runtime/runtime-manager.js";
import { PostgresStateStore } from "./store/postgres-state-store.js";
import { WorkspaceStore } from "./store/workspace-store.js";

async function main(): Promise<void> {
  const config = loadConfig();
  await mkdir(config.dataDir, { recursive: true });

  const pool = new Pool({ connectionString: config.databaseUrl });
  const stateStore = new PostgresStateStore(pool);
  await stateStore.initialize();
  await stateStore.resetActiveRuntimesOnBoot();

  const workspaceStore = new WorkspaceStore(
    join(config.dataDir, "workspaces"),
    join(config.dataDir, "artifacts")
  );
  const runtimeManager = new RuntimeManager(stateStore, workspaceStore);
  const contextCompiler = new TenantContextCompiler(stateStore);
  const openClawRuntimeAdapter = OpenClawRuntimeAdapter.fromDockerSocket(config.dockerSocketPath, {
    containerStateDir: config.dataDir,
    hostStateDir: config.openClawRuntimeHostStateDir,
    image: config.openClawRuntimeImage,
    network: config.openClawRuntimeNetwork
  });
  const reaper = new IdleReaper(runtimeManager, config.idleTimeoutMs);
  const metrics = new MetricsRegistry();
  metrics.activeRuntimes.set(0);
  const server = buildServer(runtimeManager, metrics, contextCompiler, openClawRuntimeAdapter);

  reaper.start();

  const shutdown = async () => {
    reaper.stop();
    await server.close();
    await stateStore.close();
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());

  await server.listen({ port: config.port, host: "0.0.0.0" });
}

void main();
