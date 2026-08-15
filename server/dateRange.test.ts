import { describe, expect, it } from "vitest";
import { parseEndOfDay, parseStartOfDay } from "./dateRange";

describe("date range parsing", () => {
  it("includes the complete selected end date", () => {
    expect(parseStartOfDay("2026-08-15")?.toISOString()).toBe("2026-08-15T00:00:00.000Z");
    expect(parseEndOfDay("2026-08-15")?.toISOString()).toBe("2026-08-15T23:59:59.999Z");
  });
});
