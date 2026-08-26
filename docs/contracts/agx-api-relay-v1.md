# AGX API Relay v1 — Issue Contract

## Scope

Add a small, long-running Go API Relay to AGXCLI. The Relay exposes a LAN-facing
OpenAI-compatible surface and forwards requests to one configured upstream,
such as the Windows CC Switch Go bridge.

AGX remains an installation/deployment/lifecycle CLI. This change does not add
daily Task scheduling, Multica orchestration, a web panel, a device registry,
or credential management.

## API contract

- `GET /health` — unauthenticated liveness response `{status, auth_required}`.
- `GET /v1/models` — authenticated proxy to the upstream model catalog.
- `POST /v1/chat/completions` — authenticated streaming/non-streaming proxy.
- Unsupported paths return `404`; unsupported methods return `405` and `Allow`.
- Authentication is `Authorization: Bearer <AGX_RELAY_TOKEN>` when a token is
  configured. The token is read from the process environment and never logged
  or persisted by AGX.
- Errors use `{ "error": { "code": "...", "message": "...", "request_id": "..." } }`.
- The public surface is versioned under `/v1`; additive response fields are
  allowed, while breaking changes require `/v2`.

## Acceptance criteria

1. `agx relay run` starts a Go HTTP service using environment configuration.
2. `GET /v1/models` and `POST /v1/chat/completions` proxy to the configured
   upstream without exposing the client bearer token upstream.
3. Missing or invalid bearer tokens receive `401`; bad methods receive `405`;
   unknown paths receive `404`.
4. Streaming chat responses pass through without a response write timeout.
5. `agx relay status` is read-only and reports the health endpoint.
6. A systemd unit and environment example are included; the service is
   network-facing only and runs with a read-only filesystem.
7. No credential, token, or upstream response body is written to AGX receipts,
   logs, fixtures, or configuration state.
8. `go test ./...` passes and GoReleaser publishes Linux `arm64` artifacts.

## Explicit non-goals

- No API-key CRUD or secret vault in AGX v1.
- No automatic device enrollment or fleet-wide rollout.
- No model routing logic inside AGX; upstream CC Switch remains responsible for
  provider selection and failover.
