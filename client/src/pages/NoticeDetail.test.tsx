import { describe, expect, it } from "vitest";
import { AttachmentLinks, toAttachments } from "./NoticeDetail";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";

describe("toAttachments", () => {
  it("keeps valid 나라장터 attachment URLs for detail-page links", () => {
    const attachments = toAttachments(JSON.stringify([
      { name: "specDocFileUrl1", url: "https://www.g2b.go.kr/pn/pnz/pnza/UntyAtchFile/downloadFile.do?bfSpecRegNo=R26BD00259135&fileType=BFDTL&fileSeq=1" },
      { name: "invalid" },
    ]));

    expect(attachments).toEqual([
      { name: "specDocFileUrl1", url: "https://www.g2b.go.kr/pn/pnz/pnza/UntyAtchFile/downloadFile.do?bfSpecRegNo=R26BD00259135&fileType=BFDTL&fileSeq=1" },
    ]);
  });
});

describe("AttachmentLinks", () => {
  it("renders a clickable attachment anchor for a real G2B file URL", () => {
    const url = "https://www.g2b.go.kr/pn/pnz/pnza/UntyAtchFile/downloadFile.do?bfSpecRegNo=R26BD00259135&fileType=BFDTL&fileSeq=1";
    const html = renderToStaticMarkup(<AttachmentLinks attachments={[{ name: "specDocFileUrl1", url }]} />);

    expect(html).toContain(`href=\"${url.replace(/&/g, "&amp;")}\"`);
    expect(html).toContain("specDocFileUrl1");
  });
});
