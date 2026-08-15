import { describe, expect, it } from "vitest";
import { buildBidOriginalUrl, getOriginalNoticeLabel, getOriginalNoticeUrl, getRawNoticeAttachments, getRelatedBidNumbers, getServiceDetailGroups } from "./noticeDetailModel";

describe("notice detail model", () => {
  it("builds a G2B original link for award data that only provides notice number and order", () => {
    expect(buildBidOriginalUrl({ bidNtceNo: "R26BK01679541", bidNtceOrd: "000" })).toContain("bidPbancNo=R26BK01679541");
    expect(getOriginalNoticeUrl("award", { bidNtceNo: "R26BK01679541", bidNtceOrd: "000" })).toContain("bidPbancOrd=000");
  });

  it("prefers the contract detail link and exposes documented service fields", () => {
    const url = getOriginalNoticeUrl("contract", { cntrctDtlInfoUrl: "https://www.g2b.go.kr/contract/detail" });
    const groups = getServiceDetailGroups("contract", { untyCntrctNo: "R26TA0001", cntrctNm: "계약", totCntrctAmt: "100000", rprsntCorpNm: "푸드원" });
    expect(url).toBe("https://www.g2b.go.kr/contract/detail");
    expect(groups.flatMap(group => group.fields).map(field => field.label)).toEqual(expect.arrayContaining(["통합계약번호", "총계약금액", "대표 계약업체"]));
  });

  it("parses related bid notice numbers from pre-specification data", () => {
    expect(getRelatedBidNumbers({ bidNtceNoList: "R26BK00000001, R26BK00000002" })).toEqual(["R26BK00000001", "R26BK00000002"]);
  });

  it("extracts documented bid and pre-specification file URLs from legacy raw data", () => {
    expect(getRawNoticeAttachments({ ntceSpecDocUrl1: "https://www.g2b.go.kr/bid-file", specDocFileUrl1: "https://www.g2b.go.kr/spec-file" }).map(file => file.name)).toEqual(["입찰공고 첨부자료 1", "사전규격 첨부자료 1"]);
  });

  it("links pre-specification records without a direct API URL to the official G2B specification list", () => {
    expect(getOriginalNoticeUrl("spec", { bfSpecRgstNo: "R26BD00258935" })).toContain("PRCA001_04");
    expect(getOriginalNoticeLabel("spec", { bfSpecRgstNo: "R26BD00258935" })).toBe("나라장터 사전규격 목록 열기");
  });

  it("selects a clickable original-site destination for every service type", () => {
    expect(getOriginalNoticeUrl("bid", { bidNtceUrl: "https://www.g2b.go.kr/bid-direct" })).toBe("https://www.g2b.go.kr/bid-direct");
    expect(getOriginalNoticeUrl("award", { bidNtceNo: "R26BK00000001" })).toContain("bidPbancNo=R26BK00000001");
    expect(getOriginalNoticeUrl("contract", { cntrctDtlInfoUrl: "https://www.g2b.go.kr/contract-direct" })).toBe("https://www.g2b.go.kr/contract-direct");
    expect(getOriginalNoticeUrl("standard", { bidNtceNo: "R26BK00000002" })).toContain("bidPbancNo=R26BK00000002");
    expect(getOriginalNoticeUrl("spec", { bfSpecRgstNo: "R26BD00000001" })).toContain("PRCA001_04");
  });
});
