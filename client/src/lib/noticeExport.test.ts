import { describe, expect, it } from "vitest";
import { toNoticeExportRows } from "./noticeExport";

describe("toNoticeExportRows", () => {
  it("creates spreadsheet-friendly rows with source information and original URL", () => {
    const [row] = toNoticeExportRows([{ title: "AI 시스템 구축", noticeId: "R26BK0001", sourceType: "spec", agency: "테스트 기관", noticeDate: "2026-08-15T00:00:00.000Z", baseAmount: 1000000, awardAmount: 970000, originalUrl: "https://www.g2b.go.kr/example" }]);
    expect(row).toMatchObject({ 번호: 1, 구분: "spec", 공고명: "AI 시스템 구축", 공고번호: "R26BK0001", 기관: "테스트 기관", 기초금액: 1000000, 낙찰금액: 970000, 원문링크: "https://www.g2b.go.kr/example" });
  });
});
