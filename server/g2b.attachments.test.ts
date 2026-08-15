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

  it("stores API-provided file names and byte sizes next to each attachment URL", () => {
    const attachments = extractAttachments({
      specDocFileUrl1: "https://www.g2b.go.kr/files/task.hwp",
      specDocFileNm1: "과업지시서.hwp",
      specDocFileSize1: "428032",
    });

    expect(attachments).toEqual([{ name: "사전규격 첨부자료 1", fileName: "과업지시서.hwp", sizeBytes: 428032, url: "https://www.g2b.go.kr/files/task.hwp" }]);
  });
});
