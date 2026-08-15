import { describe, expect, it } from "vitest";
import { attachmentDisplayName, formatFileSize, getBidContact } from "./noticeMetadata";

describe("notice metadata", () => {
  it("current bid API 담당자와 연락처 필드 별칭을 추출한다", () => {
    expect(getBidContact(JSON.stringify({ ntceInsttOfclNm: "임승재", ntceInsttOfclTel: "010-914-76980" }))).toEqual({ name: "임승재", phone: "010-914-76980" });
  });
  it("첨부 파일명과 용량을 다운로드 전 읽기 쉬운 형식으로 표시한다", () => {
    expect(attachmentDisplayName({ name: "specDocFileUrl1", fileName: "과업지시서.hwp", url: "https://example.test/file" }, 0)).toBe("과업지시서.hwp");
    expect(formatFileSize(428032)).toBe("418 KB");
    expect(formatFileSize(undefined)).toBe("원문 용량 미제공");
  });
});
