import { resolve } from "node:path";

export interface AppConfig {
  port: number;
  dataDir: string;
  idleTimeoutMs: number;
}

export function loadConfig(): AppConfig {
  const dataDir = process.env.OPENCLO_DATA_DIR
    ? resolve(process.env.OPENCLO_DATA_DIR)
    : resolve(process.cwd(), "data");

  return {
    port: Number(process.env.PORT ?? 8080),
    dataDir,
    idleTimeoutMs: Number(process.env.OPENCLO_IDLE_TIMEOUT_MS ?? 15 * 60 * 1000)
  };
}
