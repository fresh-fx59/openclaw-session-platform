export type RuntimeStatus = "starting" | "active" | "idle" | "stopped";

export interface TenantState {
  tenantId: string;
  workspacePath: string;
  artifactPath: string;
  currentRuntimeId: string | null;
  lastRequestAt: string | null;
  lastStoppedAt: string | null;
  memorySummary: string | null;
}

export interface RuntimeRecord {
  runtimeId: string;
  tenantId: string;
  status: RuntimeStatus;
  createdAt: string;
  lastActivityAt: string;
  stoppedAt: string | null;
}

export interface ArtifactRecord {
  tenantId: string;
  name: string;
  path: string;
  contentSha256: string;
  updatedAt: string;
}

export interface CompiledTenantContext {
  tenantId: string;
  memorySummary: string | null;
  workspacePath: string;
  artifactPath: string;
  currentRuntimeId: string | null;
  lastRequestAt: string | null;
  lastStoppedAt: string | null;
  artifacts: ArtifactRecord[];
}

export interface OpenClawTenantRuntimeStatus {
  tenantId: string;
  containerName: string;
  image: string;
  configPath: string;
  workspacePath: string;
  hostConfigPath: string;
  hostWorkspacePath: string;
  state: "not_found" | "created" | "running" | "exited" | "unknown";
  readiness: "not_applicable" | "warming" | "ready" | "error" | "unknown";
  rpcOk: boolean;
  rpcUrl: string | null;
  readinessDetail: string | null;
}

export interface PlatformState {
  tenants: Record<string, TenantState>;
  runtimes: Record<string, RuntimeRecord>;
}

export interface DispatchRequest {
  prompt: string;
  memorySummary?: string;
  artifactName?: string;
  artifactContent?: string;
}

export interface DispatchResult {
  tenantId: string;
  runtimeId: string;
  workspacePath: string;
  artifactPath: string;
  reusedRuntime: boolean;
  response: string;
}
