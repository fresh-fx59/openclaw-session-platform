# Architecture

This project is designed specifically around OpenClaw's model:

- OpenClaw Gateway is the control plane
- sessions and workspaces must stay isolated per agent/user scope
- the orchestration layer should treat OpenClaw runtimes as ephemeral while preserving durable tenant state

The MVP separates durable tenant state from ephemeral runtime state.

## Components

- `StateStore`: persists tenant and runtime metadata in Postgres
- `ContextCompiler`: builds a compact tenant resume payload from durable metadata
- `OpenClawRuntimeAdapter`: prepares and manages real tenant-scoped OpenClaw gateway containers
- `WorkspaceStore`: persists per-tenant workspace and artifact files
- `RuntimeManager`: keeps one active runtime lease per tenant
- `IdleReaper`: stops inactive runtimes
- `API`: dispatch, lifecycle, readiness, and allowlisted gateway-call endpoints

## Durability model

Durable:

- tenant workspace files
- artifact files
- artifact manifest metadata in Postgres
- runtime metadata and lifecycle state in Postgres
- request history log

Ephemeral:

- active runtime process abstraction
- in-memory timers

This lets a runtime terminate while the next runtime resumes the same tenant state.

On process restart, active runtime leases are explicitly reset so the platform never claims a stale in-memory runtime is still live.

The OpenClaw runtime adapter is now verified live on the deployment host:

- it prepares per-tenant OpenClaw config and workspace directories on the durable host volume
- it starts a real `openclaw-demo-openclaw-gateway:latest` tenant container through the Docker socket
- the tenant OpenClaw container stays alive across `openclaw-session-platform` container restarts
- runtime readiness is not identical to container liveness; the gateway process needs a short warm-up before RPC becomes healthy
- the platform status endpoint now exposes both Docker `state` and gateway `readiness`
- the platform now exposes a narrow interaction bridge for safe allowlisted gateway methods
