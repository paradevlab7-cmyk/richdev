import { describe, expect, it } from "vitest";
import { G2B_ENDPOINTS } from "./g2b";

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
