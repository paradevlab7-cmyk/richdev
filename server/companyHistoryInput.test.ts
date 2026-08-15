import { describe, expect, it } from "vitest";
import { companyHistoryInput } from "./routers";

describe("company history input", () => {
  it("trims a company name and defaults the history result limit", () => {
    expect(companyHistoryInput.parse({ companyName: "  푸드원  " })).toEqual({ companyName: "푸드원", limit: 50 });
  });

  it("rejects empty company names and oversized history requests", () => {
    expect(() => companyHistoryInput.parse({ companyName: "" })).toThrow();
    expect(() => companyHistoryInput.parse({ companyName: "푸드원", limit: 101 })).toThrow();
  });
});
