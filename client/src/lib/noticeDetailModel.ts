export type RawNotice = Record<string, unknown>;
export type DetailField = { label: string; value?: string };
export type DetailGroup = { title: string; fields: DetailField[] };

export function parseNoticeRaw(value: string | null | undefined): RawNotice { try { const parsed = JSON.parse(value ?? "{}"); return parsed && typeof parsed === "object" ? parsed : {}; } catch { return {}; } }
export function rawText(raw: RawNotice, ...keys: string[]) { const value = keys.map(key => raw[key]).find(value => value !== undefined && value !== null && String(value).trim() && String(value) !== "undefined"); return value === undefined ? undefined : String(value); }
const fields = (raw: RawNotice, entries: [string, string[]][]): DetailField[] => entries.map(([label, keys]) => ({ label, value: rawText(raw, ...keys) })).filter(field => field.value);

export function buildBidOriginalUrl(raw: RawNotice) {
  const number = rawText(raw, "bidNtceNo", "ntceNo");
  if (!number) return undefined;
  const order = rawText(raw, "bidNtceOrd", "ntceOrd") ?? "000";
  return `https://www.g2b.go.kr/link/PNPE027_01/single/?bidPbancNo=${encodeURIComponent(number)}&bidPbancOrd=${encodeURIComponent(order)}`;
}

export function getOriginalNoticeUrl(sourceType: string, raw: RawNotice, storedUrl?: string | null) {
  const directUrl = storedUrl || rawText(raw, "bidNtceUrl", "ntceUrl", "cntrctDtlInfoUrl", "cntrctInfoUrl", "linkUrl", "g2bLink");
  if (directUrl) return directUrl;
  if (sourceType === "spec") return "https://www.g2b.go.kr/link/PRCA001_04/single/?srch=0002&flag=cnrtSl";
  return (sourceType === "bid" || sourceType === "award" || sourceType === "standard") ? buildBidOriginalUrl(raw) : undefined;
}

export function getOriginalNoticeLabel(sourceType: string, raw: RawNotice, storedUrl?: string | null) {
  const hasDirectUrl = Boolean(storedUrl || rawText(raw, "bidNtceUrl", "ntceUrl", "cntrctDtlInfoUrl", "cntrctInfoUrl", "linkUrl", "g2bLink"));
  return sourceType === "spec" && !hasDirectUrl ? "나라장터 사전규격 목록 열기" : "나라장터 원문 보기";
}

export function getRelatedBidNumbers(raw: RawNotice) {
  return (rawText(raw, "bidNtceNoList") ?? "").split(/[,\s]+/).map(value => value.trim()).filter(Boolean);
}

export function getRawNoticeAttachments(raw: RawNotice) {
  return Object.entries(raw).flatMap(([key, value]) => {
    if (typeof value !== "string" || !/^https?:\/\//i.test(value) || !/(atch|attach|file|download|specdoc|docurl)/i.test(key)) return [];
    const sequence = key.match(/(\d+)$/)?.[1];
    const name = /^specDocFileUrl/i.test(key) ? `사전규격 첨부자료 ${sequence ?? ""}`.trim() : /^ntceSpecDocUrl/i.test(key) ? `입찰공고 첨부자료 ${sequence ?? ""}`.trim() : key;
    return [{ name, url: value }];
  });
}

export function getServiceDetailGroups(sourceType: string, raw: RawNotice): DetailGroup[] {
  const sharedInstitution: DetailGroup[] = [{ title: "기관·담당자", fields: fields(raw, [["공고/발주기관", ["ntceInsttNm", "orderInsttNm", "cntrctInsttNm"]], ["수요기관", ["dmndInsttNm", "dminsttNm", "rlDminsttNm"]], ["담당부서", ["ntceInsttOfclDeptNm", "dmndInsttOfclDeptNm", "cntrctInsttChrgDeptNm"]], ["담당자", ["ntceInsttOfclNm", "dmndInsttOfclNm", "cntrctInsttOfclNm", "ofclNm"]], ["연락처", ["ntceInsttOfclTel", "ntceInsttOfclTelNo", "dmndInsttOfclTel", "cntrctInsttOfclTelNo", "ofclTelNo"]], ["이메일", ["ntceInsttOfclEmailAdrs", "dmndInsttOfclEmailAdrs"]]]) }];
  if (sourceType === "spec") return [
    { title: "사전규격 개요", fields: fields(raw, [["업무구분", ["bsnsDivNm"]], ["참조번호", ["refNo"]], ["사전규격등록번호", ["bfSpecRgstNo"]], ["품명·사업명", ["prdctClsfcNoNm"]], ["배정예산", ["asignBdgtAmt"]], ["SW 사업 대상", ["swBizObjYn"]]]) },
    ...sharedInstitution,
    { title: "검토·납품 일정", fields: fields(raw, [["접수일시", ["rcptDt"]], ["의견등록 마감", ["opninRgstClseDt"]], ["납품기한", ["dlvrTmlmtDt"]], ["납품일수", ["dlvrDaynum"]], ["등록일시", ["rgstDt"]], ["변경일시", ["chgDt"]]]) },
    { title: "품목·연계 공고", fields: fields(raw, [["물품상세목록", ["prdctDtlList"]], ["연계 입찰공고번호", ["bidNtceNoList"]]]) },
  ];
  if (sourceType === "award") return [
    { title: "낙찰 결과", fields: fields(raw, [["입찰공고번호", ["bidNtceNo"]], ["공고차수·재입찰", ["bidNtceOrd", "rbidNo"]], ["참가업체수", ["prtcptCnum"]], ["최종낙찰금액", ["sucsfbidAmt"]], ["최종낙찰률", ["sucsfbidRate"]], ["실개찰일시", ["rlOpengDt"]], ["최종낙찰일", ["fnlSucsfDate"]]]) },
    { title: "최종 낙찰업체", fields: fields(raw, [["업체명", ["bidwinnrNm", "sucsfbidCorpNm"]], ["사업자번호", ["bidwinnrBizno"]], ["대표자", ["bidwinnrCeoNm"]], ["주소", ["bidwinnrAdrs"]], ["전화", ["bidwinnrTelNo"]], ["담당자", ["fnlSucsfCorpOfcl"]]]) },
    ...sharedInstitution,
  ];
  if (sourceType === "contract") return [
    { title: "계약 개요", fields: fields(raw, [["통합계약번호", ["untyCntrctNo"]], ["확정계약번호", ["dcsnCntrctNo"]], ["계약참조번호", ["cntrctRefNo"]], ["계약명", ["cntrctNm"]], ["업무구분", ["bsnsDivNm"]], ["계약체결일", ["cntrctCnclsDate", "cntrctDate"]], ["계약기간", ["cntrctPrd"]], ["계약방법", ["cntrctCnclsMthdNm"]]]) },
    { title: "계약 금액·조건", fields: fields(raw, [["총계약금액", ["totCntrctAmt"]], ["금차계약금액", ["thtmCntrctAmt"]], ["보증금률", ["grntymnyRate"]], ["지급구분", ["payDivNm"]], ["지체상금률", ["dfrcmpnstRt"]], ["근거법률", ["baseLawNm"]], ["근거내역", ["baseDtls"]]]) },
    ...sharedInstitution,
    { title: "수요·계약 상대자", fields: fields(raw, [["수요기관목록", ["dminsttList"]], ["업체목록", ["corpList"]], ["채권자", ["crdtrNm"]], ["공고번호", ["ntceNo"]], ["요청번호", ["reqNo"]]]) },
  ];
  return [
    { title: "공고·입찰 일정", fields: fields(raw, [["공고번호", ["bidNtceNo"]], ["공고차수", ["bidNtceOrd"]], ["참조공고", ["refNtceNo", "refNo"]], ["공고상태", ["bidNtceSttusNm", "ntceKindNm"]], ["업무구분", ["bsnsDivNm"]], ["입찰개시", ["bidBeginDt", "bidBeginDate"]], ["입찰마감", ["bidClseDt", "bidClseDate"]], ["개찰일시", ["opengDt", "opengDate"]], ["개찰장소", ["opengPlce"]]]) },
    ...sharedInstitution,
    { title: "계약·예산·제한 조건", fields: fields(raw, [["입찰방식", ["bidMethdNm", "elctrnBidYn"]], ["계약체결방법", ["cntrctCnclsMthdNm"]], ["계약체결형태", ["cntrctCnclsSttusNm"]], ["낙찰자결정방법", ["bidwinrDcsnMthdNm"]], ["배정예산", ["asignBdgtAmt"]], ["추정가격", ["presmptPrce", "presmptPrice"]], ["예정가격결정방법", ["rsrvtnPrceDcsnMthdNm"]], ["지역제한", ["prtcptPsblRgnNm"]], ["업종제한", ["bidprcPsblIndstrytyNm"]]]) },
    { title: "설명회·공동수급", fields: fields(raw, [["설명회 여부", ["presnatnOprtnYn"]], ["설명회 일시", ["presnatnOprtnDate", "presnatnOprtnTm"]], ["설명회 장소", ["presnatnOprtnPlce"]], ["참가자격등록 마감", ["bidPrtcptQlfctRgstClseDate", "bidQlfctRgstDt"]], ["공동수급 마감", ["cmmnReciptAgrmntClseDate", "cmmnSpldmdAgrmntClseDt"]], ["공동수급 방식", ["cmmnReciptMethdNm", "cmmnSpldmdAgrmntRcptdocMethd"]]]) },
  ];
}
