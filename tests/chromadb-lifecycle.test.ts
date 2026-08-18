import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(__dirname, "..");

describe("ChromaDB lifecycle acceptance script", () => {
  it("backs up, stages an update, restores the snapshot, and keeps the source isolated", () => {
    const result = spawnSync("python3", ["scripts/test_chromadb_lifecycle.py"], {
      cwd: projectRoot,
      encoding: "utf8",
    });

    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout) as Record<string, boolean | string>;

    expect(report.mode).toBe("fixture");
    expect(report.backupMatchesInitial).toBe(true);
    expect(report.updateMarkerPresent).toBe(true);
    expect(report.updateChangedActive).toBe(true);
    expect(report.restoreMatchesBackup).toBe(true);
    expect(report.sourceUnchanged).toBe(true);
  });
});
