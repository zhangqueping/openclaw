// Qqbot plugin module classifies slash-command visibility for QQ group chats.

export type GroupCommandVisibility = "group" | "hidden" | "private" | "unknown";

export const PRIVATE_CHAT_ONLY_TEXT = "该命令仅限私聊使用，请在私聊中发送。";

const GROUP_VISIBLE_CORE_COMMANDS = new Set(["help", "status", "btw", "side", "models", "stop"]);

const GROUP_HIDDEN_CORE_COMMANDS = new Set([
  "goal",
  "usage",
  "activation",
  "send",
  "reset",
  "new",
  "compact",
  "think",
  "thinking",
  "t",
  "verbose",
  "v",
  "fast",
  "reasoning",
  "reason",
  "model",
  "queue",
]);

const PRIVATE_ONLY_CORE_COMMANDS = new Set([
  "commands",
  "tools",
  "skill",
  "diagnostics",
  "crestodian",
  "tasks",
  "allowlist",
  "approve",
  "context",
  "export-session",
  "export",
  "export-trajectory",
  "trajectory",
  "tts",
  "whoami",
  "id",
  "session",
  "subagents",
  "acp",
  "focus",
  "unfocus",
  "agents",
  "steer",
  "tell",
  "config",
  "mcp",
  "plugins",
  "plugin",
  "debug",
  "restart",
  "trace",
  "elevated",
  "elev",
  "exec",
  "bash",
]);

export function parseSlashCommandName(content: string | undefined | null): string | undefined {
  const trimmed = (content ?? "").trim();
  if (!trimmed.startsWith("/")) {
    return undefined;
  }
  const firstToken = trimmed.slice(1).split(/\s+/, 1)[0]?.trim().toLowerCase();
  return firstToken || undefined;
}

export function classifyCoreCommandForGroup(content: string | undefined | null): {
  commandName?: string;
  visibility: GroupCommandVisibility;
} {
  const commandName = parseSlashCommandName(content);
  if (!commandName) {
    return { visibility: "unknown" };
  }
  if (GROUP_VISIBLE_CORE_COMMANDS.has(commandName)) {
    return { commandName, visibility: "group" };
  }
  if (GROUP_HIDDEN_CORE_COMMANDS.has(commandName)) {
    return { commandName, visibility: "hidden" };
  }
  if (PRIVATE_ONLY_CORE_COMMANDS.has(commandName)) {
    return { commandName, visibility: "private" };
  }
  return { commandName, visibility: "unknown" };
}
