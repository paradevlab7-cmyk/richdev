import { describe, expect, it } from "vitest";
import { G2B_ENDPOINTS, getJson } from "./g2b";

describe("G2B production credential", () => {
  it("accepts the configured general authentication key on a one-row bid request", async () => {
    const serviceKey = process.env.G2B_API_KEY;
    if (!serviceKey) throw new Error("G2B_API_KEY is required for this credential validation test");

    const url = new URL(`${G2B_ENDPOINTS.bid}/getBidPblancListInfoServc`);
    url.searchParams.set("serviceKey", serviceKey);
    url.searchParams.set("pageNo", "1");
    url.searchParams.set("numOfRows", "1");
    url.searchParams.set("type", "json");
    url.searchParams.set("inqryDiv", "1");
    url.searchParams.set("inqryBgnDt", "202608150000");
    url.searchParams.set("inqryEndDt", "202608162359");

    const payload = await getJson(url, { retryDelayMs: 250 });
    expect(payload).toHaveProperty("response");
    expect(payload.response.header.resultCode).toBe("00");
  }, 35_000);
});

