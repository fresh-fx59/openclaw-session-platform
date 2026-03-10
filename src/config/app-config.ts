import { resolve } from "node:path";

export interface AppConfig {
  port: number;
  dataDir: string;
  idleTimeoutMs: number;
  databaseUrl: string;
  dockerSocketPath: string;
  openClawRuntimeImage: string;
  openClawRuntimeNetwork: string;
  openClawRuntimeHostStateDir: string;
  openClawRuntimeAuthSourceContainer: string;
}

export function loadConfig(): AppConfig {
  const dataDir = process.env.OPENCLAW_SESSION_PLATFORM_DATA_DIR
    ? resolve(process.env.OPENCLAW_SESSION_PLATFORM_DATA_DIR)
    : resolve(process.cwd(), "data");

  return {
    port: Number(process.env.PORT ?? 8080),
    dataDir,
    idleTimeoutMs: Number(process.env.OPENCLAW_SESSION_PLATFORM_IDLE_TIMEOUT_MS ?? 15 * 60 * 1000),
    databaseUrl: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@postgres:5432/openclaw_session_platform",
    dockerSocketPath: process.env.DOCKER_SOCKET_PATH ?? "/var/run/docker.sock",
    openClawRuntimeImage: process.env.OPENCLAW_RUNTIME_IMAGE ?? "openclaw-demo-openclaw-gateway:latest",
    openClawRuntimeNetwork: process.env.OPENCLAW_RUNTIME_NETWORK ?? "openclaw-session-platform_internal",
    openClawRuntimeHostStateDir:
      process.env.OPENCLAW_RUNTIME_HOST_STATE_DIR ?? "/home/claude-developer/openclaw-session-platform/runtime-data",
    openClawRuntimeAuthSourceContainer:
      process.env.OPENCLAW_RUNTIME_AUTH_SOURCE_CONTAINER ?? "openclaw-gateway"
  };
}
