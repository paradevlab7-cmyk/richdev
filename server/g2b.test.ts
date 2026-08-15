import { describe, expect, it, vi } from "vitest";
import { G2B_ENDPOINTS, getCollectionDateParams, getJson, mapG2BNoticeFields, resolveCollectionWindowDays } from "./g2b";

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
    expect(resolveCollectionWindowDays("standard", 180)).toBe(30);
  });

  it("uses the 개방표준 bid notice date fields instead of inqry fields", () => {
    const start = new Date("2026-08-01T00:00:00"); const end = new Date("2026-08-15T23:59:00");
    expect(getCollectionDateParams("standard", start, end)).toEqual({ bidNtceBgnDt: "202608010000", bidNtceEndDt: "202608152359" });
    expect(getCollectionDateParams("bid", start, end)).toEqual({ inqryBgnDt: "202608010000", inqryEndDt: "202608152359" });
  });
});

describe("G2B field aliases", () => {
  it("maps current bid API date, deadline and institution aliases instead of falling back to the collection date", () => {
    const mapped = mapG2BNoticeFields({ bidNtceNo: "R26BK01672589", bidNtceNm: "FMX 물품 구매", bidNtceDate: "2026-08-10", bidClseDate: "2026-08-14", bidClseTm: "10:00", ntceInsttNm: "선진뷰티사이언스(주) 장항공장", dmndInsttNm: "다른 수요기관", presmptPrce: "320000000", bidNtceUrl: "https://www.g2b.go.kr/link/PNPE027_01/single/?bidPbancNo=R26BK01672589" }, "bid");
    expect(mapped.agency).toBe("선진뷰티사이언스(주) 장항공장");
    expect(mapped.noticeDate?.toISOString()).toContain("2026-08-10");
    expect(mapped.deadline?.toISOString()).toContain("2026-08-14");
    expect(mapped.baseAmount).toBe("320000000.00");
  });

  it("maps provided pre-specification institution, budget and document URLs", () => {
    const mapped = mapG2BNoticeFields({ bfSpecRgstNo: "R26BD00263313", prdctClsfcNoNm: "디지털 복합기 임차 용역", orderInsttNm: "한국도로공사서비스(주)", asignBdgtAmt: "4512000000", rgstDt: "2026-08-12 16:03:27", opninRgstClseDt: "2026-08-18 23:59:00", specDocFileUrl1: "https://www.g2b.go.kr/download/1", specDocFileUrl2: "https://www.g2b.go.kr/download/2" }, "spec");
    expect(mapped.agency).toBe("한국도로공사서비스(주)");
    expect(mapped.itemName).toBe("디지털 복합기 임차 용역");
    expect(mapped.baseAmount).toBe("4512000000.00");
    expect(mapped.attachmentsJson).toContain("사전규격 첨부자료 1");
  });

  it("keeps public-standard bid notices under the standard service instead of reclassifying them as bid API rows", () => {
    const mapped = mapG2BNoticeFields({ bidNtceNo: "R26BK01679541", bidNtceNm: "PATIENT MONITOR" }, "standard");
    expect(mapped.sourceType).toBe("standard");
    expect(mapped.noticeId).toBe("standard:R26BK01679541");
  });
});

describe("G2B API retry", () => {
  it("retries transient request errors before returning the parsed API payload", async () => {
    const mockFetch = vi.fn()
      .mockRejectedValueOnce(new Error("temporary network failure"))
      .mockRejectedValueOnce(new Error("temporary network failure"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ response: { header: { resultCode: "00" }, body: { items: [] } } }), { status: 200 }));

    const payload = await getJson(new URL("https://example.test/spec"), { fetchImpl: mockFetch as unknown as typeof fetch, retryDelayMs: 0 });

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(payload.response.header.resultCode).toBe("00");
  });

  it("returns an error only after all retries fail", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("network unavailable"));

    await expect(getJson(new URL("https://example.test/spec"), { fetchImpl: mockFetch as unknown as typeof fetch, retryDelayMs: 0 })).rejects.toThrow("network unavailable");
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
