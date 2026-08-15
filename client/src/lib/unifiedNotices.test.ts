import { describe, expect, it } from "vitest";
import { unifyServiceBidNotices } from "./unifiedNotices";

describe("unifyServiceBidNotices", () => {
  it("groups identical bid and public-standard notice numbers and prefers the bid API record", () => {
    const rows = unifyServiceBidNotices([
      { id: 1, noticeId: "standard:R26BK01679541", sourceType: "standard" },
      { id: 2, noticeId: "bid:R26BK01679541", sourceType: "bid" },
      { id: 3, noticeId: "spec:R26BD00263313", sourceType: "spec" },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ notice: { id: 2 }, sourceTypes: ["standard", "bid"], duplicateCount: 2 });
    expect(rows[1]).toMatchObject({ notice: { id: 3 }, duplicateCount: 1 });
  });
});
