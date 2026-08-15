import { describe, expect, it, vi } from "vitest";
import { G2B_ENDPOINTS, getJson, resolveCollectionWindowDays } from "./g2b";

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

describe("G2B API retry", () => {
  it("retries a transient request error once before returning the parsed API payload", async () => {
    const mockFetch = vi.fn()
      .mockRejectedValueOnce(new Error("temporary network failure"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ response: { header: { resultCode: "00" }, body: { items: [] } } }), { status: 200 }));

    const payload = await getJson(new URL("https://example.test/spec"), { fetchImpl: mockFetch as unknown as typeof fetch, retryDelayMs: 0 });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(payload.response.header.resultCode).toBe("00");
  });

  it("returns an error only after the retry also fails", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("network unavailable"));

    await expect(getJson(new URL("https://example.test/spec"), { fetchImpl: mockFetch as unknown as typeof fetch, retryDelayMs: 0 })).rejects.toThrow("network unavailable");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
