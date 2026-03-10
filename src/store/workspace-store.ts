import { mkdir, writeFile, appendFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

export class WorkspaceStore {
  constructor(
    private readonly workspacesDir: string,
    private readonly artifactsDir: string
  ) {}

  async ensureTenantPaths(tenantId: string): Promise<{ workspacePath: string; artifactPath: string }> {
    const workspacePath = join(this.workspacesDir, tenantId);
    const artifactPath = join(this.artifactsDir, tenantId);
    await mkdir(workspacePath, { recursive: true });
    await mkdir(artifactPath, { recursive: true });
    return { workspacePath, artifactPath };
  }

  async appendRequestLog(tenantId: string, entry: string): Promise<void> {
    const { workspacePath } = await this.ensureTenantPaths(tenantId);
    const target = join(workspacePath, "requests.log");
    await appendFile(target, `${entry}\n`, "utf-8");
  }

  async writeArtifact(tenantId: string, name: string, content: string): Promise<string> {
    const { artifactPath } = await this.ensureTenantPaths(tenantId);
    const target = join(artifactPath, name);
    await writeFile(target, content, "utf-8");
    return target;
  }

  async readRequestLog(tenantId: string): Promise<string> {
    const { workspacePath } = await this.ensureTenantPaths(tenantId);
    const target = join(workspacePath, "requests.log");
    if (!existsSync(target)) {
      return "";
    }
    return readFile(target, "utf-8");
  }
}
