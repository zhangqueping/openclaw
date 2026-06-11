// Qqbot tests cover group command visibility classification.
import { describe, expect, it } from "vitest";
import { classifyCoreCommandForGroup, parseSlashCommandName } from "./command-visibility.js";

describe("QQBot command visibility", () => {
  it("parses slash command names case-insensitively", () => {
    expect(parseSlashCommandName(" /NEW now ")).toBe("new");
    expect(parseSlashCommandName("hello")).toBeUndefined();
  });

  it("keeps safe collaboration commands visible in groups", () => {
    for (const command of ["/help", "/status", "/btw side question", "/models", "/stop"]) {
      expect(classifyCoreCommandForGroup(command).visibility).toBe("group");
    }
  });

  it("keeps group-session controls callable but hidden from group menus", () => {
    for (const command of ["/new", "/reset", "/compact", "/verbose"]) {
      expect(classifyCoreCommandForGroup(command).visibility).toBe("hidden");
    }
  });

  it("marks sensitive core commands as private-only in groups", () => {
    for (const command of [
      "/config",
      "/bash",
      "/export-session",
      "/diagnostics",
      "/tts",
      "/steer",
      "/tell",
    ]) {
      expect(classifyCoreCommandForGroup(command).visibility).toBe("private");
    }
  });

  it("leaves plugin and unknown slash commands to their existing dispatch path", () => {
    expect(classifyCoreCommandForGroup("/bot-help").visibility).toBe("unknown");
    expect(classifyCoreCommandForGroup("/unknown").visibility).toBe("unknown");
  });
});
