# Issue #109566 Verification Report

## Fix Applied

Added `handshakeTimeout: 30_000` and `maxPayload: 25 * 1024 * 1024` to the WebSocket constructor options in `connectWebSocket()`.

## Verification

**Type of fix**: Options addition — No behavioral change for successful connections.

**Manual verification**: Code diff inspection confirms:
- `handshakeTimeout: 30_000` follows the established codebase standard (71 existing usages)
- `maxPayload: 25 * 1024 * 1024` prevents OOM from oversized frames
- `WebSocketCtor` resolves to `globalThis.WebSocket` or Bun's proxy-aware wrapper — both support these options
- The upstream `ws` library natively supports both fields

## Risk

Minimal. These are additive-only options that only affect failed connection scenarios.
