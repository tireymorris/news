import { describe, it, expect } from "bun:test";
import formatRelativeTime from "../src/util/time";

describe("formatRelativeTime", () => {
  it("should return 'less than a minute ago' for dates less than a minute ago", () => {
    const date = new Date(Date.now() - 30 * 1000); // 30 seconds ago
    expect(formatRelativeTime(date)).toBe("less than a minute ago");
  });

  it("should return 'less than 5 minutes ago' for dates less than 5 minutes ago", () => {
    const date = new Date(Date.now() - 4 * 60 * 1000); // 4 minutes ago
    expect(formatRelativeTime(date)).toBe("less than 5 minutes ago");
  });

  it("should return 'less than 10 minutes ago' for dates less than 10 minutes ago", () => {
    const date = new Date(Date.now() - 9 * 60 * 1000); // 9 minutes ago
    expect(formatRelativeTime(date)).toBe("less than 10 minutes ago");
  });

  it("should return 'less than a half hour ago' for dates less than a half hour ago", () => {
    const date = new Date(Date.now() - 20 * 60 * 1000); // 20 minutes ago
    expect(formatRelativeTime(date)).toBe("less than a half hour ago");
  });

  it("should return 'less than an hour ago' for dates less than an hour ago", () => {
    const date = new Date(Date.now() - 45 * 60 * 1000); // 45 minutes ago
    expect(formatRelativeTime(date)).toBe("less than an hour ago");
  });

  it("should return 'less than two hours ago' for dates less than two hours ago", () => {
    const date = new Date(Date.now() - 90 * 60 * 1000); // 1.5 hours ago
    expect(formatRelativeTime(date)).toBe("less than two hours ago");
  });

  it("should return 'less than four hours ago' for dates less than four hours ago", () => {
    const date = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago
    expect(formatRelativeTime(date)).toBe("less than four hours ago");
  });

  it("should return 'less than eight hours ago' for dates less than eight hours ago", () => {
    const date = new Date(Date.now() - 7 * 60 * 60 * 1000); // 7 hours ago
    expect(formatRelativeTime(date)).toBe("less than eight hours ago");
  });

  it("should return 'less than twelve hours ago' for dates less than twelve hours ago", () => {
    const date = new Date(Date.now() - 11 * 60 * 60 * 1000); // 11 hours ago
    expect(formatRelativeTime(date)).toBe("less than twelve hours ago");
  });

  it("should return 'less than a day ago' for dates less than a day ago", () => {
    const date = new Date(Date.now() - 20 * 60 * 60 * 1000); // 20 hours ago
    expect(formatRelativeTime(date)).toBe("less than a day ago");
  });

  it("should return '1 day ago' for dates 1 day ago", () => {
    const date = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
    expect(formatRelativeTime(date)).toBe("1 day ago");
  });

  it("should return '2 days ago' for dates 2 days ago", () => {
    const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    expect(formatRelativeTime(date)).toBe("2 days ago");
  });

  it("should return '3 days ago' for dates 3 days ago", () => {
    const date = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    expect(formatRelativeTime(date)).toBe("3 days ago");
  });

  it("should return 'several days ago' for dates within the last week", () => {
    const date = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000); // 6 days ago
    expect(formatRelativeTime(date)).toBe("several days ago");
  });

  it("should return a formatted date for dates older than a week", () => {
    const date = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
    const formatter = new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      timeZoneName: "short",
    });
    expect(formatRelativeTime(date)).toBe(formatter.format(date));
  });
});
