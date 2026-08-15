import { describe, expect, it } from "vitest";
import { parseFavoriteSpecQuery } from "./favoriteFilter";

describe("parseFavoriteSpecQuery", () => {
  it("저장한 사전규격 다중 검색 조건을 복원한다", () => {
    expect(parseFavoriteSpecQuery(JSON.stringify({ q: "소프트웨어", from: "2026-08-01", to: "2026-08-15", keywords: ["AI", "클라우드"], status: "closing", sort: "deadline" }))).toEqual({ q: "소프트웨어", from: "2026-08-01", to: "2026-08-15", keywords: ["AI", "클라우드"], status: "closing", sort: "deadline" });
  });
  it("손상되었거나 허용되지 않은 조건은 적용하지 않는다", () => {
    expect(parseFavoriteSpecQuery('{"status":"bad"}')).toBeNull();
    expect(parseFavoriteSpecQuery("not-json")).toBeNull();
  });
});
