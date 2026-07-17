# Issue #109566 Design Document

## Fix Strategy

Minimal change: Add `handshakeTimeout: 30_000` and `maxPayload: 25 * 1024 * 1024` to the WebSocket constructor options in `connectWebSocket`.

### Changes

| File | Line | Change | Rationale |
|------|------|--------|-----------|
| `packages/ai/src/providers/openai-chatgpt-responses.ts` | 1050 | Add `handshakeTimeout: 30_000` to ws options | Standard timeout across codebase |
| `packages/ai/src/providers/openai-chatgpt-responses.ts` | 1050 | Add `maxPayload: 25 * 1024 * 1024` to ws options | Prevent OOM from oversized frames |

### What did NOT change

- No API signature changes
- No behavior changes for successful connections
- No changes to the WebSocketCtor resolution logic

### Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| 30s timeout too short for slow networks | Low | `handshakeTimeout: 30_000` is the established standard across 70+ usages |
| maxPayload too restrictive | Low | 25 MB for OpenAI Responses API is generous (typical messages < 1 MB) |

### Test Strategy

- Existing tests should pass without modification (no behavior change for normal connections)
- Run `pnpm test:changed` to verify
