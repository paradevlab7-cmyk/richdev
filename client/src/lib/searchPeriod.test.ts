import { describe, expect, it } from "vitest";
import { createCollectionRequest, toDateInput } from "./searchPeriod";

describe("search period helpers", () => {
  it("creates the 15-day default and month period in YYYY-MM-DD form", () => {
    const now = new Date("2026-08-15T12:00:00.000Z");
    expect(toDateInput(0, now)).toBe("2026-08-15");
    expect(toDateInput(15, now)).toBe("2026-07-31");
    expect(toDateInput(30, now)).toBe("2026-07-16");
  });

  it("passes the selected collection duration without changing it", () => {
    expect(createCollectionRequest(30)).toEqual({ days: 30 });
    expect(createCollectionRequest(180)).toEqual({ days: 180 });
  });
});
