# Issue #109566 Analysis

## Metadata

- **Title**: fix(ai): bound openai-chatgpt-responses WebSocket with handshakeTimeout and maxPayload
- **Labels**: bug
- **URL**: https://github.com/openclaw/openclaw/issues/109566

## Problem Description

The `connectWebSocket` function in `packages/ai/src/providers/openai-chatgpt-responses.ts` creates a WebSocket connection to the OpenAI ChatGPT Responses API without a `handshakeTimeout` or `maxPayload`. If the server accepts the TCP connection but never completes the WebSocket upgrade, the returned Promise will remain pending indefinitely.

## Impact Assessment

- Unbounded WebSocket handshake wait could lead to resource leaks (stale sockets, hanging promises)
- No maxPayload protection against oversized frames (OOM risk)
- Following 70+ similar bound fixes already applied across the codebase

## Suggested Fix

Add `handshakeTimeout: 30_000` and `maxPayload: 25 * 1024 * 1024` to the WebSocket constructor options.
