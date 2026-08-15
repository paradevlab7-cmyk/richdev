import { describe, expect, it } from "vitest";
import { attachmentPreviewMessage, getAttachmentKind, supportsInlinePreview } from "./attachmentPreview";

describe("attachment preview metadata", () => {
  it("PDF·HWP·이미지의 확장자 유형을 구분한다", () => {
    expect(getAttachmentKind({ fileName: "제안요청서.pdf", url: "https://example.test/a" })).toBe("pdf");
    expect(getAttachmentKind({ fileName: "과업지시서.hwp", url: "https://example.test/b" })).toBe("hwp");
    expect(getAttachmentKind({ fileName: "도면.png", url: "https://example.test/c" })).toBe("image");
  });
  it("브라우저가 직접 표시할 수 없는 HWP는 다운로드 안내를 제공한다", () => {
    const hwp = { fileName: "과업지시서.hwp", url: "https://example.test/file" };
    expect(supportsInlinePreview(hwp)).toBe(false);
    expect(attachmentPreviewMessage(hwp)).toContain("다운로드 후");
  });
});
