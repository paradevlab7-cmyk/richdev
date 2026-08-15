import { describe, expect, it } from "vitest";
import { extractAttachments } from "./g2b";

describe("extractAttachments", () => {
  it("keeps downloadable attachment URLs and ignores ordinary source links", () => {
    const attachments = extractAttachments({
      bidNtceUrl: "https://www.g2b.go.kr/notice/1",
      atchFileUrl: "https://www.g2b.go.kr/files/specification.pdf",
      downloadUrl: "https://www.g2b.go.kr/files/terms.zip",
      fileName: "specification.pdf",
    });

    expect(attachments).toEqual([
      { name: "atchFileUrl", url: "https://www.g2b.go.kr/files/specification.pdf" },
      { name: "downloadUrl", url: "https://www.g2b.go.kr/files/terms.zip" },
    ]);
  });
});
