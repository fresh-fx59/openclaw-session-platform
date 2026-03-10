# OpenClaw Session Platform

Separate public repository for OpenClaw multi-user runtime orchestration.

## MVP

This repository implements a minimal platform that provides:

- per-tenant isolated persistent workspaces
- per-tenant isolated artifact storage
- ephemeral runtimes created on demand
- idle timeout shutdown
- cold-start resume from durable workspace state
- Prometheus metrics endpoint for monitoring

The current MVP uses:

- local filesystem for workspaces and artifacts
- JSON file state store
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

The container joins the existing `traefik-public` Docker network and is intended to be published behind Traefik + Cloudflare.

Current server deployment:

- App URL: `https://openclaw-session-platform.aiengineerhelper.com/`
- App URL: `https://openclaw-session-platform.aiengineerhelper.com/healthz`
- Metrics URL: `https://openclaw-session-platform.aiengineerhelper.com/metrics`

## Test

```bash
npm test
```
