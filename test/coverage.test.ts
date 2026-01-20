import { describe, expect, it } from "bun:test";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

describe("Coverage reporting", () => {
  it("should have CI workflow configured with coverage", () => {
    const ciContent = readFileSync(".github/workflows/test.yml", "utf8");
    expect(ciContent).toContain("--coverage");
    expect(ciContent).toContain("genhtml");
  });

  it("should generate HTML coverage report with statistics", () => {
    const indexPath = join("coverage", "index.html");
    expect(existsSync(indexPath)).toBe(true);
    const content = readFileSync(indexPath, "utf8");
    expect(content).toContain("code coverage report");
    expect(content).toContain("Lines:");
    expect(content).toContain("%");
  });
});
