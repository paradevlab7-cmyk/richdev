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

  it("accepts service-specific defaults alongside the remembered main period", () => {
    const input = collectionRunInput.parse({ days: 90, serviceDefaults: { bid: 90, spec: 60, award: 30, contract: 180, standard: 30 } });
    expect(input.serviceDefaults).toMatchObject({ bid: 90, spec: 60, award: 30, contract: 180, standard: 30 });
  });
});
