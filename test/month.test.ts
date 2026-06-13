import { describe, expect, it } from "bun:test";
import {
  monthBounds,
  monthsBackward,
  previousMonth,
} from "../src/backfill/month";

describe("backfill month helpers", () => {
  it("returns the first and last day of a month", () => {
    expect(monthBounds("2024-05")).toEqual({
      startDate: "2024-05-01",
      endDate: "2024-05-31",
    });
    expect(monthBounds("2024-02")).toEqual({
      startDate: "2024-02-01",
      endDate: "2024-02-29",
    });
  });

  it("steps backward one month at a time", () => {
    expect(previousMonth("2024-05")).toBe("2024-04");
    expect(previousMonth("2024-01")).toBe("2023-12");
  });

  it("lists months from end to floor inclusive", () => {
    expect(monthsBackward("2024-03", "2024-01")).toEqual([
      "2024-03",
      "2024-02",
      "2024-01",
    ]);
  });
});
