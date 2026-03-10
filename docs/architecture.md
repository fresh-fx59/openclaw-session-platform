# Architecture

This project is designed specifically around OpenClaw's model:

- OpenClaw Gateway is the control plane
- sessions and workspaces must stay isolated per agent/user scope
- the orchestration layer should treat OpenClaw runtimes as ephemeral while preserving durable tenant state

The MVP separates durable tenant state from ephemeral runtime state.

## Components

- `StateStore`: persists tenant and runtime metadata in Postgres
- `WorkspaceStore`: persists per-tenant workspace and artifact files
- `RuntimeManager`: keeps one active runtime lease per tenant
- `IdleReaper`: stops inactive runtimes
- `API`: dispatch and lifecycle endpoints

## Durability model

Durable:

- tenant workspace files
- artifact files
- runtime metadata and lifecycle state in Postgres
- request history log

Ephemeral:

- active runtime process abstraction
- in-memory timers

This lets a runtime terminate while the next runtime resumes the same tenant state.

On process restart, active runtime leases are explicitly reset so the platform never claims a stale in-memory runtime is still live.
