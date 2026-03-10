# Research Notes

## OpenClaw

The official OpenClaw docs and repository already emphasize:

- Gateway as control plane
- isolated agents and workspaces
- session model and session pruning
- multi-agent routing by channel/account/peer

This means a dedicated orchestration layer should preserve OpenClaw-compatible workspace/session boundaries instead of inventing a different tenancy model.

## Similar patterns

Comparable systems such as E2B and Daytona use:

- ephemeral sandboxes
- persistent filesystem state or snapshots
- cold-start restore from durable state

That validates the chosen shape for this repository:

- persistent tenant workspace
- durable metadata store
- short-lived execution runtime
- explicit idle reaping
