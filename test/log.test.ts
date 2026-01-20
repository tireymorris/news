import { describe, expect, it, spyOn, mock } from "bun:test";
import { debug, log } from "../src/util/log";

describe("log utility", () => {
  it("should log with debug prefix when DEBUG=true", () => {
    const originalDebug = process.env.DEBUG;
    process.env.DEBUG = "true";

    const consoleSpy = spyOn(console, "log").mockImplementation(() => {});

    debug("test message");

    expect(consoleSpy).toHaveBeenCalledWith(
      "$",
      expect.any(String),
      "test message",
    );

    process.env.DEBUG = originalDebug;
    consoleSpy.mockRestore();
  });

  it("should not log when DEBUG is not true", () => {
    const originalDebug = process.env.DEBUG;
    process.env.DEBUG = "false";

    const consoleSpy = spyOn(console, "log").mockImplementation(() => {});

    debug("test message");

    expect(consoleSpy).not.toHaveBeenCalled();

    process.env.DEBUG = originalDebug;
    consoleSpy.mockRestore();
  });

  it("should log with >> prefix", () => {
    const consoleSpy = spyOn(console, "log").mockImplementation(() => {});

    log("test message");

    expect(consoleSpy).toHaveBeenCalledWith(
      ">>",
      expect.any(String),
      "test message",
    );

    consoleSpy.mockRestore();
  });
});
