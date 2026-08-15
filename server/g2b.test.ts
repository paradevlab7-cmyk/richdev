import { describe, expect, it } from "vitest";
import { G2B_ENDPOINTS, resolveCollectionWindowDays } from "./g2b";

describe("G2B endpoint catalog", () => {
  it("keeps the five user-specified public API base URLs unchanged", () => {
    expect(G2B_ENDPOINTS).toEqual({
      bid: "https://apis.data.go.kr/1230000/ad/BidPublicInfoService",
      spec: "https://apis.data.go.kr/1230000/ao/HrcspSsstndrdInfoService",
      award: "https://apis.data.go.kr/1230000/as/ScsbidInfoService",
      contract: "https://apis.data.go.kr/1230000/ao/CntrctInfoService",
      standard: "https://apis.data.go.kr/1230000/ao/PubDataOpnStdService",
    });
  });
});

describe("collection duration", () => {
  it("keeps user-selected collection periods and caps award queries to the service limit", () => {
    expect(resolveCollectionWindowDays("bid", 15)).toBe(15);
    expect(resolveCollectionWindowDays("bid", 180)).toBe(180);
    expect(resolveCollectionWindowDays("award", 15)).toBe(15);
    expect(resolveCollectionWindowDays("award", 30)).toBe(30);
    expect(resolveCollectionWindowDays("award", 180)).toBe(30);
  });
});
