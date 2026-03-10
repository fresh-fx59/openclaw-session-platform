# OpenClaw Runtime Adapter

This layer prepares and manages a real OpenClaw gateway container per tenant.

## API

- `POST /tenants/:tenantId/openclaw/prepare`
- `POST /tenants/:tenantId/openclaw/start`
- `GET /tenants/:tenantId/openclaw/status`
- `POST /tenants/:tenantId/openclaw/stop`

## Behavior

- prepares per-tenant config and workspace directories
- writes a minimal OpenClaw config if none exists yet
- starts a real `openclaw-demo-openclaw-gateway:latest` container on the server Docker daemon
- mounts tenant config/workspace into the OpenClaw container
- keeps container lifecycle separate from the platform metadata plane

## Verified Live Result

Verified on the Contabo host against:

- `POST /tenants/runtime-proof-4/openclaw/prepare`
- `POST /tenants/runtime-proof-4/openclaw/start`
- `GET /tenants/runtime-proof-4/openclaw/status`

Observed result:

- tenant config directory and workspace directory were created on the durable host volume
- tenant container `openclaw-tenant-runtime-proof-4` was created and reached Docker `running`
- inside the tenant container, `openclaw-gateway` became the main long-lived process
- `node openclaw.mjs gateway status --json` eventually reported `rpc.ok: true`
- after restarting the `openclaw-session-platform` app container, the tenant OpenClaw container remained up and the platform status endpoint still reported `running`

## Operational Note

Container state and gateway readiness are different signals.

- immediately after `start`, Docker state can already be `running`
- OpenClaw RPC may still be warming up for a short period
- readiness should therefore be checked with in-container `gateway status --json` or a future platform-level readiness probe
