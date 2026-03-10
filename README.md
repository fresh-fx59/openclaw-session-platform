# OpenClaw Session Platform

Separate public repository for OpenClaw multi-user runtime orchestration.

## MVP

This repository implements a minimal platform that provides:

- per-tenant isolated persistent workspaces
- per-tenant isolated artifact storage
- durable artifact manifest metadata
- ephemeral runtimes created on demand
- idle timeout shutdown
- cold-start resume from durable workspace state
- Prometheus metrics endpoint for monitoring

The current MVP uses:

- local filesystem for workspaces and artifacts
- Postgres for metadata state
- in-process runtime manager
- Docker-managed real OpenClaw tenant gateway containers
- Fastify HTTP API
- minimal browser UI served by the same Fastify app

## Run

```bash
npm install
npm run dev
```

## Deploy

```bash
docker compose up -d --build
```

The stack runs as tiny containers:

- `openclaw-session-platform`
- `postgres:16-alpine`

The app container joins the existing `traefik-public` Docker network and is intended to be published behind Traefik + Cloudflare.

Current server deployment:

- App URL: `https://openclaw-session-platform.aiengineerhelper.com/`
- UI URL: `https://openclaw-session-platform.aiengineerhelper.com/ui`
- App URL: `https://openclaw-session-platform.aiengineerhelper.com/healthz`
- Metrics URL: `https://openclaw-session-platform.aiengineerhelper.com/metrics`
- Context URL example: `https://openclaw-session-platform.aiengineerhelper.com/tenants/<tenantId>/context`
- OpenClaw runtime status URL example: `https://openclaw-session-platform.aiengineerhelper.com/tenants/<tenantId>/openclaw/status`

Restart verification notes: [`docs/restart-verification.md`](docs/restart-verification.md)
Context compiler notes: [`docs/context-compiler.md`](docs/context-compiler.md)
OpenClaw runtime adapter notes: [`docs/openclaw-runtime-adapter.md`](docs/openclaw-runtime-adapter.md)

## Runtime Adapter API

```bash
curl -X POST https://openclaw-session-platform.aiengineerhelper.com/tenants/alex/openclaw/prepare
curl -X POST https://openclaw-session-platform.aiengineerhelper.com/tenants/alex/openclaw/start
curl https://openclaw-session-platform.aiengineerhelper.com/tenants/alex/openclaw/status
curl -X POST https://openclaw-session-platform.aiengineerhelper.com/tenants/alex/openclaw/stop
curl -X POST https://openclaw-session-platform.aiengineerhelper.com/tenants/alex/openclaw/call \
  -H 'content-type: application/json' \
  -d '{"method":"status"}'
curl -X POST https://openclaw-session-platform.aiengineerhelper.com/tenants/alex/openclaw/chat/send \
  -H 'content-type: application/json' \
  -d '{"sessionKey":"main","message":"Reply with exactly TENANT_OK and nothing else."}'
curl -X POST https://openclaw-session-platform.aiengineerhelper.com/tenants/alex/openclaw/chat/history \
  -H 'content-type: application/json' \
  -d '{"sessionKey":"main","limit":20}'
```

Live verification note:

- the tenant container reaches Docker `running` state immediately after start
- the OpenClaw gateway inside the container needs a short warm-up before `gateway status --json` reports `rpc.ok: true`
- `GET /tenants/:tenantId/openclaw/status` now reports both raw container `state` and gateway `readiness`
- `POST /tenants/:tenantId/openclaw/call` now relays a small allowlisted set of gateway methods through the tenant container
- tenant containers can now bootstrap Anthropic auth from the existing host OpenClaw setup
- `POST /tenants/:tenantId/openclaw/chat/send` and `/chat/history` now provide real chat interaction through the platform

## UI

The app now exposes a minimal UI at `/ui`.

Current UI capabilities:

- set a tenant id and session key
- prepare, start, stop, and refresh a tenant runtime
- inspect runtime readiness and raw status payloads
- send a message into the selected session
- load session history for manual persistence checks

The UI is intentionally thin and uses the existing API directly. There is no
separate frontend build pipeline in this first pass.

## Test

```bash
npm test
```

GitHub Actions runs build, test, and Docker build smoke on every push to `main`.
