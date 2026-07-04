/**
 * Loaded-plugin session thread info resolver.
 *
 * Uses only already loaded channel hooks to resolve thread suffix metadata on hot paths.
 */
import { normalizeOptionalString } from "@openclaw/normalization-core/string-coerce";
import {
  parseRawSessionConversationRef,
  parseThreadSessionSuffix,
  type ParsedThreadSessionSuffix,
} from "../../sessions/session-key-utils.js";
import { getLoadedChannelPluginForRead } from "./registry-loaded-read.js";

type SessionConversationHookResult = {
  id: string;
  threadId?: string | null;
};

function resolveLoadedSessionConversationThreadInfo(
  sessionKey: string | undefined | null,
): ParsedThreadSessionSuffix | null {
  const raw = parseRawSessionConversationRef(sessionKey);
  if (!raw) {
    return null;
  }
  const rawId = raw.rawId.trim();
  if (!rawId) {
    return null;
  }
  const messaging = getLoadedChannelPluginForRead(raw.channel)?.messaging;
  const resolved = messaging?.resolveSessionConversation?.({
    kind: raw.kind,
    rawId,
  }) as SessionConversationHookResult | null | undefined;
  if (!resolved?.id?.trim()) {
    // Lightweight fallback: when the channel plugin is not yet loaded, treat
    // rightmost `:topic:` segments as thread markers so hot-path guards like
    // sessions_send's thread-target rejection work before the plugin loads.
    // Generic parseThreadSessionSuffix intentionally stays :thread:-only so
    // provider-owned topic-shaped peer IDs (Feishu, etc.) are not reclassified.
    const topicMarker = ":topic:";
    const lowerRawId = rawId.toLowerCase();
    const topicIndex = lowerRawId.lastIndexOf(topicMarker);
    if (topicIndex > 0) {
      const baseId = rawId.slice(0, topicIndex);
      if (baseId.trim()) {
        return {
          baseSessionKey: `${raw.prefix}:${baseId}`,
          threadId: rawId.slice(topicIndex + topicMarker.length),
        };
      }
    }
    return null;
  }
  // Loaded-plugin read paths avoid bundled fallback/materialization; if the
  // channel hook has no thread id, preserve the original session key.
  const id = resolved.id.trim();
  const threadId = normalizeOptionalString(resolved.threadId);
  return {
    baseSessionKey: threadId ? `${raw.prefix}:${id}` : normalizeOptionalString(sessionKey),
    threadId,
  };
}

/**
 * Resolves thread suffix metadata using loaded plugin hooks or generic parsing.
 */
export function resolveLoadedSessionThreadInfo(
  sessionKey: string | undefined | null,
): ParsedThreadSessionSuffix {
  return (
    resolveLoadedSessionConversationThreadInfo(sessionKey) ?? parseThreadSessionSuffix(sessionKey)
  );
}
