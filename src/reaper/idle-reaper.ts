import { RuntimeManager } from "../runtime/runtime-manager.js";

export class IdleReaper {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly runtimeManager: RuntimeManager,
    private readonly idleTimeoutMs: number,
    private readonly intervalMs: number = 5_000
  ) {}

  start(): void {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => {
      void this.runtimeManager.stopIdleRuntimes(this.idleTimeoutMs);
    }, this.intervalMs);
  }

  stop(): void {
    if (!this.timer) {
      return;
    }
    clearInterval(this.timer);
    this.timer = null;
  }
}
