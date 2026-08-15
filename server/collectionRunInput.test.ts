import { describe, expect, it } from "vitest";
import { collectionRunInput } from "./routers";

describe("collection run input", () => {
  it("defaults a manual collection request to three months", () => {
    expect(collectionRunInput.parse({})).toEqual({ days: 90 });
  });

  it("continues to accept explicitly selected collection durations", () => {
    expect(collectionRunInput.parse({ days: 30 })).toEqual({ days: 30 });
    expect(collectionRunInput.safeParse({ days: 181 }).success).toBe(false);
  });
});
