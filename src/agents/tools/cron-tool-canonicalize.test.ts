// Test whitespace-padded key recovery for issue #95407
import { describe, expect, it } from "vitest";
import { canonicalizeCronToolObject } from "./cron-tool-canonicalize.js";

describe("canonicalizeCronToolObject whitespace-padded keys (#95407)", () => {
  it("trims trailing-space keys like 'schedule ' -> 'schedule'", () => {
    const input: Record<string, unknown> = {
      name: "Test",
      "schedule ": { kind: "cron", expr: "0 * * * *", tz: "UTC" },
      "sessionTarget ": "isolated",
      "payload ": { kind: "agentTurn", message: "hello" },
      "enabled ": true,
    };

    const result = canonicalizeCronToolObject(input);

    // Verify trimmed keys exist
    expect(result).toHaveProperty("schedule");
    expect(result).toHaveProperty("sessionTarget");
    expect(result).toHaveProperty("payload");
    expect(result).toHaveProperty("enabled");
    expect(result).toHaveProperty("name");

    // Verify untrimmed keys do NOT exist
    expect(Object.keys(result)).not.toContain("schedule ");
    expect(Object.keys(result)).not.toContain("sessionTarget ");
    expect(Object.keys(result)).not.toContain("payload ");
    expect(Object.keys(result)).not.toContain("enabled ");

    // Verify no key has trailing spaces
    for (const key of Object.keys(result)) {
      expect(key).toBe(key.trim());
    }
  });

  it("trims leading-space keys", () => {
    const input: Record<string, unknown> = {
      " schedule": { kind: "at", at: "2026-12-25T00:00:00Z" },
      " sessionTarget": "main",
    };

    const result = canonicalizeCronToolObject(input);

    expect(result).toHaveProperty("schedule");
    expect(result).toHaveProperty("sessionTarget");
    expect(Object.keys(result)).not.toContain(" schedule");
    expect(Object.keys(result)).not.toContain(" sessionTarget");
  });

  it("passes through already-clean keys unchanged", () => {
    const input: Record<string, unknown> = {
      name: "Holiday Check-in",
      description: "Casual check-in",
      schedule: { kind: "cron", expr: "30 10,20 * * *", tz: "Europe/Madrid" },
      sessionTarget: "isolated",
      payload: { kind: "agentTurn", message: "hello" },
      enabled: true,
    };

    const result = canonicalizeCronToolObject(input);

    expect(result.schedule).toEqual(input.schedule);
    expect(result.sessionTarget).toBe("isolated");
    expect(result.payload).toEqual(input.payload);
    expect(result.enabled).toBe(true);
    expect(result.name).toBe("Holiday Check-in");
  });

  it("handles mixed clean and whitespace-padded keys together", () => {
    const input: Record<string, unknown> = {
      name: "Test",
      "schedule ": { kind: "cron", expr: "0 * * * *" },
      sessionTarget: "isolated",
      "payload ": { kind: "agentTurn", message: "hi" },
      enabled: true,
    };

    const result = canonicalizeCronToolObject(input);

    expect(result).toHaveProperty("name");
    expect(result).toHaveProperty("schedule");
    expect(result).toHaveProperty("sessionTarget");
    expect(result).toHaveProperty("payload");
    expect(result).toHaveProperty("enabled");

    for (const key of Object.keys(result)) {
      expect(key).toBe(key.trim());
    }
  });

  it("wrapping via job property also trims keys", () => {
    const jobValue: Record<string, unknown> = {
      name: "Test",
      "schedule ": { kind: "at", at: "2026-12-25T00:00:00Z" },
      "sessionTarget ": "isolated",
      "payload ": { kind: "agentTurn", message: "test" },
    };

    const wrapped = { job: jobValue };
    const result = canonicalizeCronToolObject(wrapped);

    expect(result).toHaveProperty("schedule");
    expect(result).toHaveProperty("sessionTarget");
    expect(result).toHaveProperty("payload");
    for (const key of Object.keys(result)) {
      expect(key).toBe(key.trim());
    }
  });
});
