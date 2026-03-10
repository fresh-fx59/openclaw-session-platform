import { Readable } from "node:stream";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { OpenClawRuntimeAdapter, sanitizeTenantId } from "../src/openclaw/runtime-adapter.js";

class FakeExec {
  constructor(private readonly payload: string) {}

  async start() {
    return Readable.from([this.payload]);
  }
}

class FakeContainer {
  constructor(
    private status: string = "created",
    private readonly gatewayStatus = {
      rpc: {
        ok: true,
        url: "ws://127.0.0.1:18789"
      }
    },
    private readonly gatewayCallResults: Record<string, unknown> = {
      status: {
        sessions: {
          count: 0
        }
      },
      health: {
        ok: true
      }
    }
  ) {}

  async inspect() {
    return { State: { Status: this.status } };
  }

  async start() {
    this.status = "running";
  }

  async stop() {
    this.status = "exited";
  }

  async exec(options: { Cmd: string[] }) {
    const command = options.Cmd.join(" ");
    if (command.includes("gateway status --json")) {
      return new FakeExec(JSON.stringify(this.gatewayStatus));
    }

    const methodIndex = options.Cmd.findIndex((part) => part === "call");
    if (methodIndex >= 0) {
      const method = options.Cmd[methodIndex + 1];
      return new FakeExec(JSON.stringify(this.gatewayCallResults[method] ?? { ok: true }));
    }

    return new FakeExec(JSON.stringify({ ok: true }));
  }
}

class FakeDocker {
  readonly containers = new Map<string, FakeContainer>();

  getContainer(name: string) {
    const container = this.containers.get(name);
    if (!container) {
      throw new Error("not found");
    }
    return container;
  }

  async createContainer(options: { name: string }) {
    const container = new FakeContainer();
    this.containers.set(options.name, container);
    return container;
  }
}

describe("OpenClawRuntimeAdapter", () => {
  test("sanitizes tenant ids", () => {
    expect(sanitizeTenantId("tenant/one")).toBe("tenant-one");
  });

  test("prepares tenant config and manages fake lifecycle", async () => {
    const root = await mkdtemp(join(tmpdir(), "openclaw-adapter-"));
    const docker = new FakeDocker();
    const adapter = new OpenClawRuntimeAdapter(docker as never, {
      containerStateDir: root,
      hostStateDir: root,
      image: "openclaw-demo-openclaw-gateway:latest",
      network: "internal"
    });

    const prepared = await adapter.prepareTenant("tenant-one");
    const configText = await readFile(join(prepared.configPath, "openclaw.json"), "utf-8");

    expect(configText).toContain("\"gateway\"");
    expect(configText).toContain("\"mode\": \"local\"");
    expect(prepared.state).toBe("created");
    expect(prepared.readiness).toBe("not_applicable");

    const started = await adapter.start("tenant-one");
    expect(started.state).toBe("running");
    expect(started.readiness).toBe("ready");
    expect(started.rpcOk).toBe(true);

    const stopped = await adapter.stop("tenant-one");
    expect(stopped.state).toBe("exited");
    expect(stopped.readiness).toBe("not_applicable");
  });

  test("reports warming readiness when gateway rpc is not ready yet", async () => {
    const root = await mkdtemp(join(tmpdir(), "openclaw-adapter-"));
    const docker = new FakeDocker();
    docker.containers.set(
      "openclaw-tenant-warming-tenant",
      new FakeContainer("running", {
        rpc: {
          ok: false,
          url: "ws://127.0.0.1:18789",
          error: "gateway closed"
        }
      })
    );
    const adapter = new OpenClawRuntimeAdapter(docker as never, {
      containerStateDir: root,
      hostStateDir: root,
      image: "openclaw-demo-openclaw-gateway:latest",
      network: "internal"
    });

    const status = await adapter.status("warming-tenant");
    expect(status.state).toBe("running");
    expect(status.readiness).toBe("warming");
    expect(status.rpcOk).toBe(false);
    expect(status.readinessDetail).toContain("gateway closed");
  });

  test("calls allowed gateway methods and rejects unsafe ones", async () => {
    const root = await mkdtemp(join(tmpdir(), "openclaw-adapter-"));
    const docker = new FakeDocker();
    docker.containers.set("openclaw-tenant-call-tenant", new FakeContainer("running"));
    const adapter = new OpenClawRuntimeAdapter(docker as never, {
      containerStateDir: root,
      hostStateDir: root,
      image: "openclaw-demo-openclaw-gateway:latest",
      network: "internal"
    });

    const statusResult = await adapter.call("call-tenant", "status");
    expect(statusResult).toEqual({
      sessions: {
        count: 0
      }
    });

    await expect(adapter.call("call-tenant", "chat.send")).rejects.toThrow(
      "OpenClaw gateway method is not allowed"
    );
  });
});
