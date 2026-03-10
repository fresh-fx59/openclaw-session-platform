import { Pool } from "pg";

import type { RuntimeRecord, TenantState } from "../domain/types.js";
import type { StateStore } from "./state-store.js";

const INIT_SQL = `
CREATE TABLE IF NOT EXISTS tenants (
  tenant_id TEXT PRIMARY KEY,
  workspace_path TEXT NOT NULL,
  artifact_path TEXT NOT NULL,
  current_runtime_id TEXT NULL,
  last_request_at TIMESTAMPTZ NULL,
  last_stopped_at TIMESTAMPTZ NULL,
  memory_summary TEXT NULL
);

CREATE TABLE IF NOT EXISTS runtimes (
  runtime_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ NOT NULL,
  stopped_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_runtimes_tenant_id ON runtimes (tenant_id);
`;

export class PostgresStateStore implements StateStore {
  constructor(private readonly pool: Pool) {}

  async initialize(): Promise<void> {
    await this.pool.query(INIT_SQL);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async getTenant(tenantId: string): Promise<TenantState | null> {
    const result = await this.pool.query(
      `SELECT tenant_id, workspace_path, artifact_path, current_runtime_id, last_request_at, last_stopped_at, memory_summary
       FROM tenants WHERE tenant_id = $1`,
      [tenantId]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return this.mapTenant(result.rows[0]);
  }

  async upsertTenant(tenant: TenantState): Promise<void> {
    await this.pool.query(
      `INSERT INTO tenants (
         tenant_id, workspace_path, artifact_path, current_runtime_id, last_request_at, last_stopped_at, memory_summary
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tenant_id) DO UPDATE SET
         workspace_path = EXCLUDED.workspace_path,
         artifact_path = EXCLUDED.artifact_path,
         current_runtime_id = EXCLUDED.current_runtime_id,
         last_request_at = EXCLUDED.last_request_at,
         last_stopped_at = EXCLUDED.last_stopped_at,
         memory_summary = EXCLUDED.memory_summary`,
      [
        tenant.tenantId,
        tenant.workspacePath,
        tenant.artifactPath,
        tenant.currentRuntimeId,
        tenant.lastRequestAt,
        tenant.lastStoppedAt,
        tenant.memorySummary
      ]
    );
  }

  async upsertRuntime(runtime: RuntimeRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO runtimes (
         runtime_id, tenant_id, status, created_at, last_activity_at, stopped_at
       ) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (runtime_id) DO UPDATE SET
         tenant_id = EXCLUDED.tenant_id,
         status = EXCLUDED.status,
         created_at = EXCLUDED.created_at,
         last_activity_at = EXCLUDED.last_activity_at,
         stopped_at = EXCLUDED.stopped_at`,
      [
        runtime.runtimeId,
        runtime.tenantId,
        runtime.status,
        runtime.createdAt,
        runtime.lastActivityAt,
        runtime.stoppedAt
      ]
    );
  }

  async getRuntime(runtimeId: string): Promise<RuntimeRecord | null> {
    const result = await this.pool.query(
      `SELECT runtime_id, tenant_id, status, created_at, last_activity_at, stopped_at
       FROM runtimes WHERE runtime_id = $1`,
      [runtimeId]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return this.mapRuntime(result.rows[0]);
  }

  async resetActiveRuntimesOnBoot(): Promise<void> {
    await this.pool.query(`UPDATE runtimes SET status = 'stopped', stopped_at = NOW() WHERE status = 'active'`);
    await this.pool.query(`UPDATE tenants SET current_runtime_id = NULL`);
  }

  private mapTenant(row: Record<string, unknown>): TenantState {
    return {
      tenantId: String(row.tenant_id),
      workspacePath: String(row.workspace_path),
      artifactPath: String(row.artifact_path),
      currentRuntimeId: row.current_runtime_id ? String(row.current_runtime_id) : null,
      lastRequestAt: row.last_request_at ? new Date(String(row.last_request_at)).toISOString() : null,
      lastStoppedAt: row.last_stopped_at ? new Date(String(row.last_stopped_at)).toISOString() : null,
      memorySummary: row.memory_summary ? String(row.memory_summary) : null
    };
  }

  private mapRuntime(row: Record<string, unknown>): RuntimeRecord {
    return {
      runtimeId: String(row.runtime_id),
      tenantId: String(row.tenant_id),
      status: String(row.status) as RuntimeRecord["status"],
      createdAt: new Date(String(row.created_at)).toISOString(),
      lastActivityAt: new Date(String(row.last_activity_at)).toISOString(),
      stoppedAt: row.stopped_at ? new Date(String(row.stopped_at)).toISOString() : null
    };
  }
}
