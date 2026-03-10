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
- Fastify HTTP API

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
- App URL: `https://openclaw-session-platform.aiengineerhelper.com/healthz`
- Metrics URL: `https://openclaw-session-platform.aiengineerhelper.com/metrics`
- Context URL example: `https://openclaw-session-platform.aiengineerhelper.com/tenants/<tenantId>/context`

Restart verification notes: [`docs/restart-verification.md`](docs/restart-verification.md)
Context compiler notes: [`docs/context-compiler.md`](docs/context-compiler.md)

## Test

```bash
npm test
```

GitHub Actions runs build, test, and Docker build smoke on every push to `main`.
