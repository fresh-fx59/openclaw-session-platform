import { randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PassThrough } from "node:stream";

import Dockerode from "dockerode";

import type { OpenClawTenantRuntimeStatus } from "../domain/types.js";

interface DockerExecLike {
  start(options: { Detach: boolean; Tty: boolean }): Promise<NodeJS.ReadableStream>;
}

interface DockerContainerLike {
  inspect(): Promise<{ State?: { Status?: string } }>;
  start(): Promise<void>;
  stop(): Promise<void>;
  exec(options: {
    Cmd: string[];
    AttachStdout: boolean;
    AttachStderr: boolean;
    Tty: boolean;
  }): Promise<DockerExecLike>;
}

interface DockerClientLike {
  getContainer(name: string): DockerContainerLike;
  createContainer(options: {
    Image: string;
    name: string;
    Cmd: string[];
    Env: string[];
    HostConfig: {
      Binds: string[];
      NetworkMode: string;
      RestartPolicy: { Name: string };
    };
  }): Promise<DockerContainerLike>;
}

interface OpenClawRuntimeAdapterConfig {
  containerStateDir: string;
  hostStateDir: string;
  image: string;
  network: string;
}

export class OpenClawRuntimeAdapter {
  constructor(
    private readonly docker: DockerClientLike,
    private readonly config: OpenClawRuntimeAdapterConfig
  ) {}

  static fromDockerSocket(socketPath: string, config: OpenClawRuntimeAdapterConfig): OpenClawRuntimeAdapter {
    return new OpenClawRuntimeAdapter(new Dockerode({ socketPath }), config);
  }

  async prepareTenant(tenantId: string): Promise<OpenClawTenantRuntimeStatus> {
    const runtime = this.pathsForTenant(tenantId);
    await mkdir(runtime.configPath, { recursive: true });
    await mkdir(runtime.workspacePath, { recursive: true });
    await chmod(runtime.configPath, 0o777);
    await chmod(runtime.workspacePath, 0o777);

    const configFile = join(runtime.configPath, "openclaw.json");
    if (!existsSync(configFile)) {
      const payload = {
        commands: {
          native: "auto",
          nativeSkills: "auto"
        },
        gateway: {
          mode: "local",
          auth: {
            mode: "token",
            token: `tenant-${randomUUID()}`
          }
        }
      };
      await writeFile(configFile, JSON.stringify(payload, null, 2), "utf-8");
      await chmod(configFile, 0o666);
    } else {
      // Verify the file remains readable for later container start.
      await readFile(configFile, "utf-8");
    }

    const status = await this.status(tenantId);
    return {
      ...status,
      state: status.state === "not_found" ? "created" : status.state
    };
  }

  async start(tenantId: string): Promise<OpenClawTenantRuntimeStatus> {
    const runtime = this.pathsForTenant(tenantId);
    await this.prepareTenant(tenantId);
    const existing = await this.inspectContainer(runtime.containerName);

    if (existing) {
      if (existing.state === "running") {
        return existing;
      }
      const container = this.docker.getContainer(runtime.containerName);
      await container.start();
      return this.status(tenantId);
    }

    const container = await this.docker.createContainer({
      Image: this.config.image,
      name: runtime.containerName,
      Cmd: ["node", "openclaw.mjs", "gateway", "--allow-unconfigured", "--bind", "loopback", "--port", "18789"],
      Env: ["HOME=/home/node", "TERM=xterm-256color"],
      HostConfig: {
        Binds: [
          `${runtime.hostConfigPath}:/home/node/.openclaw`,
          `${runtime.hostWorkspacePath}:/home/node/.openclaw/workspace`
        ],
        NetworkMode: this.config.network,
        RestartPolicy: { Name: "unless-stopped" }
      }
    });
    await container.start();
    return this.status(tenantId);
  }

  async stop(tenantId: string): Promise<OpenClawTenantRuntimeStatus> {
    const runtime = this.pathsForTenant(tenantId);
    const current = await this.inspectContainer(runtime.containerName);
    if (!current || current.state !== "running") {
      return current ?? this.baseStatus(tenantId);
    }
    await this.docker.getContainer(runtime.containerName).stop();
    return this.status(tenantId);
  }

  async status(tenantId: string): Promise<OpenClawTenantRuntimeStatus> {
    const runtime = this.pathsForTenant(tenantId);
    const inspected = await this.inspectContainer(runtime.containerName);
    return inspected ?? this.baseStatus(tenantId);
  }

  private async inspectContainer(containerName: string): Promise<OpenClawTenantRuntimeStatus | null> {
    try {
      const runtime = this.pathsForTenant(containerName.replace(/^openclaw-tenant-/, ""));
      const details = await this.docker.getContainer(containerName).inspect();
      const raw = details.State?.Status ?? "unknown";
      const state =
        raw === "running" || raw === "created" || raw === "exited"
          ? raw
          : "unknown";

      return {
        tenantId: runtime.tenantId,
        containerName: runtime.containerName,
        image: this.config.image,
        configPath: runtime.configPath,
        workspacePath: runtime.workspacePath,
        hostConfigPath: runtime.hostConfigPath,
        hostWorkspacePath: runtime.hostWorkspacePath,
        state,
        ...(await this.readinessForContainer(this.docker.getContainer(containerName), state))
      };
    } catch {
      return null;
    }
  }

  private baseStatus(tenantId: string): OpenClawTenantRuntimeStatus {
    const runtime = this.pathsForTenant(tenantId);
    return {
      tenantId,
      containerName: runtime.containerName,
      image: this.config.image,
      configPath: runtime.configPath,
      workspacePath: runtime.workspacePath,
      hostConfigPath: runtime.hostConfigPath,
      hostWorkspacePath: runtime.hostWorkspacePath,
      state: "not_found",
      readiness: "not_applicable",
      rpcOk: false,
      rpcUrl: null,
      readinessDetail: null
    };
  }

  private async readinessForContainer(
    container: DockerContainerLike,
    state: OpenClawTenantRuntimeStatus["state"]
  ): Promise<Pick<OpenClawTenantRuntimeStatus, "readiness" | "rpcOk" | "rpcUrl" | "readinessDetail">> {
    if (state !== "running") {
      return {
        readiness: "not_applicable",
        rpcOk: false,
        rpcUrl: null,
        readinessDetail: null
      };
    }

    try {
      const exec = await container.exec({
        Cmd: ["node", "openclaw.mjs", "gateway", "status", "--json"],
        AttachStdout: true,
        AttachStderr: true,
        Tty: true
      });
      const stream = await exec.start({ Detach: false, Tty: true });
      const output = await readStream(stream);
      const parsed = JSON.parse(output) as {
        rpc?: { ok?: boolean; url?: string; error?: string };
      };
      const rpcOk = parsed.rpc?.ok === true;
      return {
        readiness: rpcOk ? "ready" : "warming",
        rpcOk,
        rpcUrl: parsed.rpc?.url ?? null,
        readinessDetail: parsed.rpc?.error ?? null
      };
    } catch (error) {
      return {
        readiness: "error",
        rpcOk: false,
        rpcUrl: null,
        readinessDetail: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private pathsForTenant(tenantId: string) {
    const cleanTenantId = sanitizeTenantId(tenantId);
    const relativeRoot = join("openclaw-tenants", cleanTenantId);
    return {
      tenantId: cleanTenantId,
      containerName: `openclaw-tenant-${cleanTenantId}`,
      configPath: join(this.config.containerStateDir, relativeRoot, "config"),
      workspacePath: join(this.config.containerStateDir, relativeRoot, "workspace"),
      hostConfigPath: join(this.config.hostStateDir, relativeRoot, "config"),
      hostWorkspacePath: join(this.config.hostStateDir, relativeRoot, "workspace")
    };
  }
}

export function sanitizeTenantId(tenantId: string): string {
  return tenantId.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 64) || "tenant";
}

async function readStream(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const output = new PassThrough();
    const chunks: Buffer[] = [];

    output.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    output.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf-8").trim());
    });
    output.on("error", reject);
    stream.on("error", reject);
    stream.pipe(output);
  });
}
