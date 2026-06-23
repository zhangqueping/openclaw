// Telegram tests cover approval handler plugin behavior.
import { describe, expect, it, vi } from "vitest";
import { telegramApprovalNativeRuntime } from "./approval-handler.runtime.js";

type TelegramPayload = {
  text: string;
  buttons?: Array<Array<{ text: string }>>;
};

describe("telegramApprovalNativeRuntime", () => {
  it("renders only the allowed pending buttons", async () => {
    const payload = (await telegramApprovalNativeRuntime.presentation.buildPendingPayload({
      cfg: {} as never,
      accountId: "default",
      context: {
        token: "tg-token",
      },
      request: {
        id: "req-1",
        request: {
          command: "echo hi",
        },
        createdAtMs: 0,
        expiresAtMs: 60_000,
      },
      approvalKind: "exec",
      nowMs: 0,
      view: {
        approvalKind: "exec",
        approvalId: "req-1",
        commandText: "echo hi",
        actions: [
          {
            decision: "allow-once",
            label: "Allow Once",
            command: "/approve req-1 allow-once",
            style: "success",
          },
          {
            decision: "deny",
            label: "Deny",
            command: "/approve req-1 deny",
            style: "danger",
          },
        ],
      } as never,
    })) as TelegramPayload;

    expect(payload.text).toContain("/approve req-1 allow-once");
    expect(payload.text).not.toContain("allow-always");
    expect(payload.buttons?.[0]?.map((button) => button.text)).toEqual(["Allow Once", "Deny"]);
  });

  it("passes topic thread ids to typing and message delivery", async () => {
    const sendTyping = vi.fn().mockResolvedValue({ ok: true });
    const sendMessage = vi.fn().mockResolvedValue({
      chatId: "-1003841603622",
      messageId: "m1",
    });

    const entry = await telegramApprovalNativeRuntime.transport.deliverPending({
      cfg: {} as never,
      accountId: "default",
      context: {
        token: "tg-token",
        deps: {
          sendTyping,
          sendMessage,
        },
      },
      plannedTarget: {
        surface: "origin",
        reason: "preferred",
        target: {
          to: "-1003841603622",
          threadId: 928,
        },
      },
      preparedTarget: {
        chatId: "-1003841603622",
        messageThreadId: 928,
      },
      request: {
        id: "req-1",
        request: {
          command: "echo hi",
        },
        createdAtMs: 0,
        expiresAtMs: 60_000,
      },
      approvalKind: "exec",
      view: {
        approvalKind: "exec",
        approvalId: "req-1",
        commandText: "echo hi",
        actions: [],
      } as never,
      pendingPayload: {
        text: "pending",
        buttons: [],
      },
    });

    expect(sendTyping).toHaveBeenCalledWith("-1003841603622", {
      cfg: {},
      token: "tg-token",
      accountId: "default",
      messageThreadId: 928,
    });
    expect(sendMessage).toHaveBeenCalledWith("-1003841603622", "pending", {
      cfg: {},
      token: "tg-token",
      accountId: "default",
      buttons: [],
      messageThreadId: 928,
    });
    expect(entry).toEqual({
      chatId: "-1003841603622",
      messageId: "m1",
    });
  });

  // FIX #56286: resolved approvals return "delete" so the entire approval
  // bubble is removed; expired approvals return "clear-actions" so only the
  // inline keyboard is cleared.
  it("returns delete for resolved and clear-actions for expired (regression #56286)", async () => {
    const resolved = await telegramApprovalNativeRuntime.presentation.buildResolvedResult({
      cfg: {} as never,
      accountId: "default",
      context: { token: "tg-token" },
      request: {
        id: "req-1",
        request: { command: "echo hi" },
        createdAtMs: 0,
        expiresAtMs: 60_000,
      },
      resolved: { id: "req-1", decision: "allow-once", ts: 0 },
      view: {
        approvalKind: "exec",
        approvalId: "req-1",
        commandText: "echo hi",
        actions: [],
      } as never,
      entry: { chatId: "-1003841603622", messageId: "m1" },
    });
    expect(resolved).toEqual({ kind: "delete" });

    const expired = await telegramApprovalNativeRuntime.presentation.buildExpiredResult({
      cfg: {} as never,
      accountId: "default",
      context: { token: "tg-token" },
      request: {
        id: "req-1",
        request: { command: "echo hi" },
        createdAtMs: 0,
        expiresAtMs: 60_000,
      },
      view: {
        approvalKind: "exec",
        approvalId: "req-1",
        commandText: "echo hi",
        actions: [],
      } as never,
      entry: { chatId: "-1003841603622", messageId: "m1" },
    });
    expect(expired).toEqual({ kind: "clear-actions" });
  });

  // FIX #56286: transport.deleteEntry must delete the Telegram message
  // when buildResolvedResult returns { kind: "delete" }.
  it("deletes the approval message via transport.deleteEntry (regression #56286)", async () => {
    const deleteMessage = vi.fn().mockResolvedValue({ ok: true });

    const deleteEntry = telegramApprovalNativeRuntime.transport?.deleteEntry;
    if (!deleteEntry) {
      throw new Error("deleteEntry not implemented");
    }

    await deleteEntry({
      cfg: {} as never,
      accountId: "default",
      context: {
        token: "tg-token",
        deps: { deleteMessage },
      },
      entry: { chatId: "-1003841603622", messageId: "m42" },
      phase: "resolved",
    } as Parameters<typeof deleteEntry>[0]);

    expect(deleteMessage).toHaveBeenCalledWith("-1003841603622", "m42", {
      cfg: {},
      token: "tg-token",
      accountId: "default",
    });
  });

  // FIX #56286: For expired approvals, clearPendingActions must only clear
  // the inline keyboard — not delete the message. The prompt text stays
  // visible so chat history is preserved.
  it("clears only the inline keyboard on expired, not delete (regression #56286)", async () => {
    const editReplyMarkup = vi.fn().mockResolvedValue({
      ok: true,
      messageId: "m42",
      chatId: "-1003841603622",
    });

    const clearFn = telegramApprovalNativeRuntime.interactions?.clearPendingActions;
    if (!clearFn) {
      throw new Error("clearPendingActions not implemented");
    }

    await clearFn({
      cfg: {} as never,
      accountId: "default",
      context: {
        token: "tg-token",
        deps: { editReplyMarkup },
      },
      entry: { chatId: "-1003841603622", messageId: "m42" },
      phase: "expired",
    } as Parameters<typeof clearFn>[0]);

    expect(editReplyMarkup).toHaveBeenCalledWith("-1003841603622", "m42", [], {
      cfg: {},
      token: "tg-token",
      accountId: "default",
    });
  });
});
