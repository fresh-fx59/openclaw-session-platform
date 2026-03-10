# Context Compiler

The context compiler builds a compact resume payload for a tenant from durable state.

## Source data

- tenant metadata from Postgres
- durable artifact manifest from Postgres
- workspace and artifact root paths

## API

`GET /tenants/:tenantId/context`

Example payload:

```json
{
  "tenantId": "context-proof",
  "memorySummary": "context-proof summary",
  "workspacePath": "/app/state/workspaces/context-proof",
  "artifactPath": "/app/state/artifacts/context-proof",
  "currentRuntimeId": null,
  "lastRequestAt": "2026-03-10T11:54:34.000Z",
  "lastStoppedAt": null,
  "artifacts": [
    {
      "tenantId": "context-proof",
      "name": "context.txt",
      "path": "/app/state/artifacts/context-proof/context.txt",
      "contentSha256": "d19f9b28e185dddba7cb523dd35c793b8f9943b963d7d86bf63702f4b4c73875",
      "updatedAt": "2026-03-10T11:54:34.000Z"
    }
  ]
}
```

## Contract

- compact enough to seed runtime resume
- survives container restart
- preserves memory summary and artifact manifest
- clears stale runtime identity on boot
