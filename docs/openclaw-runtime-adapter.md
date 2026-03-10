# OpenClaw Runtime Adapter

This layer prepares and manages a real OpenClaw gateway container per tenant.

## API

- `POST /tenants/:tenantId/openclaw/prepare`
- `POST /tenants/:tenantId/openclaw/start`
- `GET /tenants/:tenantId/openclaw/status`
- `POST /tenants/:tenantId/openclaw/stop`
- `POST /tenants/:tenantId/openclaw/call`
- `POST /tenants/:tenantId/openclaw/chat/send`
- `POST /tenants/:tenantId/openclaw/chat/history`

## Behavior

- prepares per-tenant config and workspace directories
- writes a minimal OpenClaw config if none exists yet
- starts a real `openclaw-demo-openclaw-gateway:latest` container on the server Docker daemon
- mounts tenant config/workspace into the OpenClaw container
- keeps container lifecycle separate from the platform metadata plane
- relays a narrow allowlisted set of gateway methods through the tenant container
- forwards provider auth env from the approved source OpenClaw container into tenant containers at creation time
- recreates a tenant container on `start` if required forwarded auth env is missing from an older tenant container

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
- the platform status endpoint now also reports readiness fields such as `readiness`, `rpcOk`, `rpcUrl`, and `readinessDetail`
- the platform gateway-call endpoint successfully relayed `status` and `health` through the tenant container
- the platform chat endpoints successfully sent and retrieved Anthropic-backed tenant messages

## Operational Note

Container state and gateway readiness are different signals.

- immediately after `start`, Docker state can already be `running`
- OpenClaw RPC may still be warming up for a short period
- readiness is now exposed by the platform-level status endpoint
- in-container `gateway status --json` remains the ground-truth diagnostic when deeper debugging is needed

## Allowed gateway methods

The initial public bridge is intentionally narrow:

- `health`
- `status`
- `system-presence`
- `cron.*`

Methods outside this allowlist are rejected with `400 method_not_allowed`.

## Provider bootstrap

The current deployment bootstraps tenant model auth by reusing provider env from
the approved host OpenClaw gateway container:

- source container: `openclaw-gateway`
- forwarded env today: `ANTHROPIC_API_KEY`, `CLOUDRU_API_KEY`, `MOONSHOT_API_KEY`

The repo does not hardcode secret values. The runtime adapter reads the env from
the source container through the Docker socket and forwards them into tenant
containers at creation time. If a tenant container was created before these env
were forwarded, the platform now recreates that tenant container on the next
`start` so the auth env becomes effective.
