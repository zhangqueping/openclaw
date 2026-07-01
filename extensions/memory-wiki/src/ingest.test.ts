// Memory Wiki tests cover ingest plugin behavior.
import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { ingestMemoryWikiSource } from "./ingest.js";
import { createMemoryWikiTestHarness } from "./test-helpers.js";

const { createTempDir, createVault } = createMemoryWikiTestHarness();

describe("ingestMemoryWikiSource", () => {
  it("copies a local text file into sources markdown", async () => {
    const rootDir = await createTempDir("memory-wiki-ingest-");
    const inputPath = path.join(rootDir, "meeting-notes.txt");
    await fs.writeFile(inputPath, "hello from source\n", "utf8");
    const { config } = await createVault({
      rootDir: path.join(rootDir, "vault"),
    });

    const result = await ingestMemoryWikiSource({
      config,
      inputPath,
      nowMs: Date.UTC(2026, 3, 5, 12, 0, 0),
    });

    expect(result.pageId).toBe("source.meeting-notes");
    expect(result.pagePath).toBe("sources/meeting-notes.md");
    expect(result.indexUpdatedFiles.length).toBeGreaterThan(0);
    await expect(fs.readFile(path.join(config.vault.path, "sources", "meeting-notes.md"), "utf8"))
      .resolves.toBe(`---
pageType: source
id: source.meeting-notes
title: meeting notes
sourceType: local-file
sourcePath: ${inputPath}
ingestedAt: 2026-04-05T12:00:00.000Z
updatedAt: 2026-04-05T12:00:00.000Z
status: active
---

# meeting notes

## Source
- Type: \`local-file\`
- Path: \`${inputPath}\`
- Bytes: 18
- Updated: 2026-04-05T12:00:00.000Z

## Content
\`\`\`text
hello from source

\`\`\`

## Notes
<!-- openclaw:human:start -->
<!-- openclaw:human:end -->

## Related
<!-- openclaw:wiki:related:start -->
- No related pages yet.
<!-- openclaw:wiki:related:end -->
`);
    await expect(fs.readFile(path.join(config.vault.path, "index.md"), "utf8")).resolves.toContain(
      "[meeting notes](sources/meeting-notes.md)",
    );
  });

  it("preserves the human Notes block when the existing-page read fails transiently (#98345)", async () => {
    const rootDir = await createTempDir("memory-wiki-ingest-");
    const inputPath = path.join(rootDir, "roadmap.txt");
    await fs.writeFile(inputPath, "Q2 roadmap initial\n", "utf8");
    const vaultDir = path.join(rootDir, "vault");
    const { config } = await createVault({ rootDir: vaultDir });

    // First ingest — page created fresh.
    await ingestMemoryWikiSource({
      config,
      inputPath,
      nowMs: Date.UTC(2026, 5, 1, 12, 0, 0),
    });

    // Add the user's hand-written notes.
    const pagePath = path.join(vaultDir, "sources", "roadmap.md");
    const userNote = "KEY INSIGHT: add Q3 goals (irreplaceable)";
    const existing = await fs.readFile(pagePath, "utf8");
    const edited = existing.replace(
      "<!-- openclaw:human:start -->\n<!-- openclaw:human:end -->",
      `<!-- openclaw:human:start -->\n${userNote}\n<!-- openclaw:human:end -->`,
    );
    await fs.writeFile(pagePath, edited, "utf8");

    // Simulate a transient read failure on the first attempt.  The retry
    // (after 100ms) must succeed and preserveHumanNotesBlock must run.
    const realReadFile = fs.readFile.bind(fs);
    let calls = 0;
    const spy = vi.spyOn(fs, "readFile").mockImplementation(async (p, opts) => {
      // Only intercept the existing-page re-read on the second ingest.
      if (String(p).endsWith("roadmap.md") && calls === 0) {
        calls += 1;
        throw new Error("EIO");
      }
      return realReadFile(p, opts);
    });

    // Re-ingest with updated source.
    await fs.writeFile(inputPath, "Q2 roadmap — updated with new priorities\n", "utf8");
    try {
      await ingestMemoryWikiSource({
        config,
        inputPath,
        nowMs: Date.UTC(2026, 5, 2, 12, 0, 0),
      });
    } finally {
      spy.mockRestore();
    }

    const after = await fs.readFile(pagePath, "utf8");
    expect(after).toContain(userNote);
    expect(calls).toBe(1);
  });
});
