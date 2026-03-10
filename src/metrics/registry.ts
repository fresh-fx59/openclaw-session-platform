import { Gauge, Registry, collectDefaultMetrics, Counter } from "prom-client";

export class MetricsRegistry {
  readonly registry = new Registry();
  readonly dispatchTotal = new Counter({
    name: "openclaw_session_platform_dispatch_total",
    help: "Total number of dispatch requests handled by the platform",
    registers: [this.registry]
  });
  readonly activeRuntimes = new Gauge({
    name: "openclaw_session_platform_active_runtimes",
    help: "Currently active tenant runtimes",
    registers: [this.registry]
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry });
  }
}
