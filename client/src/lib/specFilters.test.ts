import { describe, expect, it } from "vitest";
import { filterAndSortSpecRows, getSpecStatus } from "./specFilters";

const now = new Date("2026-08-15T00:00:00.000Z");
const rows = [
  { title: "진행", deadline: "2026-08-20T00:00:00.000Z", noticeDate: "2026-08-12T00:00:00.000Z", baseAmount: 100 },
  { title: "임박", deadline: "2026-08-16T00:00:00.000Z", noticeDate: "2026-08-14T00:00:00.000Z", baseAmount: 300 },
  { title: "마감", deadline: "2026-08-14T00:00:00.000Z", noticeDate: "2026-08-10T00:00:00.000Z", baseAmount: 200 },
];

describe("specFilters", () => {
  it("classifies deadline status for active, closing, and closed specs", () => {
    expect(rows.map(row => getSpecStatus(row, now))).toEqual(["active", "closing", "closed"]);
  });
  it("filters by derived status and sorts by base amount", () => {
    expect(filterAndSortSpecRows(rows, "all", "amount", now).map(row => row.title)).toEqual(["임박", "마감", "진행"]);
    expect(filterAndSortSpecRows(rows, "closing", "latest", now).map(row => row.title)).toEqual(["임박"]);
  });
});
