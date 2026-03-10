import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { OpenClawRuntimeAdapter, sanitizeTenantId } from "../src/openclaw/runtime-adapter.js";

class FakeContainer {
  constructor(private status: string = "created") {}

  async inspect() {
    return { State: { Status: this.status } };
  }

  async start() {
    this.status = "running";
  }

  async stop() {
    this.status = "exited";
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

    const started = await adapter.start("tenant-one");
    expect(started.state).toBe("running");

    const stopped = await adapter.stop("tenant-one");
    expect(stopped.state).toBe("exited");
  });
});
