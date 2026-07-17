# Issue #109566 Root Cause Analysis

## 5 Whys Analysis

```
Problem: openai-chatgpt-responses WebSocket connection can hang indefinitely
  ↓ Why 1? WebSocket constructor called without handshakeTimeout
  ↓ Why 2? Developer omitted timeout option when creating the WebSocket
  ↓ Why 3? No established pattern was enforced at the time of writing
  ↓ Why 4? The bounding effort across the codebase is ongoing (453+ commits)
  ↓ 
Root cause: Missing handshakeTimeout and maxPayload on WebSocket constructor options
```

## Trigger Condition

A TCP peer accepts the connection but never completes the HTTP WebSocket upgrade.

## Affected Scope

- `packages/ai/src/providers/openai-chatgpt-responses.ts:1050` — `connectWebSocket` function
- Only affects the OpenAI ChatGPT Responses API WebSocket transport path
