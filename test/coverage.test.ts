import { describe, expect, it } from "bun:test";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

describe("Coverage reporting", () => {
  it("should have CI workflow configured with coverage", () => {
    const ciContent = readFileSync(".github/workflows/test.yml", "utf8");
    expect(ciContent).toContain("--coverage");
    expect(ciContent).toContain("genhtml");
    expect(ciContent).toContain("upload-artifact");
  });

  it("should have coverage thresholds configured in bunfig.toml", () => {
    const bunfigContent = readFileSync("bunfig.toml", "utf8");
    expect(bunfigContent).toContain("coverageThreshold = 0.8");
  });

  it("should include genhtml lcov report when coverage/index.html exists", () => {
    const indexPath = join("coverage", "index.html");
    if (!existsSync(indexPath)) {
      return;
    }
    const content = readFileSync(indexPath, "utf8");
    expect(content).toContain("code coverage report");
    expect(content).toContain("Lines:");
    expect(content).toContain("%");
  });
});
