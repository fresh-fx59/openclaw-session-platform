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
