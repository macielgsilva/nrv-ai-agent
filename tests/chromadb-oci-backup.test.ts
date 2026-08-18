import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(__dirname, "..");
const script = path.join(projectRoot, "scripts", "backup_chromadb_oci.py");

describe("backup automatizado do ChromaDB para OCI", () => {
  it("cria arquivo e manifesto verificados no modo isolado sem chamar a OCI", () => {
    const output = execFileSync("python3", [script, "--fixture", "--dry-run"], {
      cwd: projectRoot,
      encoding: "utf8",
    });
    const report = JSON.parse(output) as Record<string, unknown>;

    expect(report.fixture).toBe(true);
    expect(report.dryRun).toBe(true);
    expect(report.uploaded).toBe(false);
    expect(report.archiveCreated).toBe(true);
    expect(report.manifestCreated).toBe(true);
    expect(report.archiveSha256Valid).toBe(true);
  });
});
