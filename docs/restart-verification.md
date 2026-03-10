# Restart Verification

This repository was verified against the live deployment with the following sequence:

1. Create tenant state through `dispatch`
2. Confirm tenant metadata exists in Postgres
3. Confirm artifact exists on durable volume
4. Restart `postgres` and `openclaw-session-platform` containers
5. Confirm tenant metadata still exists in Postgres
6. Confirm `current_runtime_id` is cleared on boot
7. Confirm artifact still exists
8. Confirm next `dispatch` recreates a fresh runtime and resumes persisted context

## Expected contract

- metadata survives restart
- artifacts survive restart
- stale in-memory runtime leases do not survive restart
- first request after restart creates a new runtime
- tenant context still resumes from durable state

## Verified result

Verified on the live deployment at `https://openclaw-session-platform.aiengineerhelper.com`:

- tenant metadata persisted in Postgres across container restart
- durable artifact file remained present after restart
- `current_runtime_id` was cleared on boot as designed
- `GET /tenants/:tenantId/status` returned inactive immediately after restart
- the next `dispatch` created a fresh runtime id and resumed persisted context

GitHub Actions CI also passed for the corresponding push that introduced the Postgres-backed store and Docker smoke validation.

The context compiler endpoint was also verified live after restart:

- `GET /tenants/:tenantId/context` preserved memory summary and artifact manifest
- `currentRuntimeId` was reset to `null` after restart

The real OpenClaw runtime adapter was also verified live after restart:

- `POST /tenants/runtime-proof-4/openclaw/start` created a real tenant container on the Docker host
- `docker exec openclaw-tenant-runtime-proof-4 node openclaw.mjs gateway status --json` reported `rpc.ok: true` after warm-up
- restarting the `openclaw-session-platform` app container did not terminate the tenant OpenClaw container
- after app restart, `GET /tenants/runtime-proof-4/openclaw/status` still reported `state: running`
- after app restart, `GET /tenants/runtime-proof-4/openclaw/status` also reported `readiness: ready` and `rpcOk: true`
