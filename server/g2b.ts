import { getDb, getSettings, listKeywords } from "./db";
import { collectionRuns, notices } from "../drizzle/schema";
import { and, count, desc, eq, gt, gte, lte, or, sql } from "drizzle-orm";
import { decryptSecret } from "./secure";

export const G2B_ENDPOINTS = {
  bid: "https://apis.data.go.kr/1230000/ad/BidPublicInfoService",
  spec: "https://apis.data.go.kr/1230000/ao/HrcspSsstndrdInfoService",
  award: "https://apis.data.go.kr/1230000/as/ScsbidInfoService",
  contract: "https://apis.data.go.kr/1230000/ao/CntrctInfoService",
  standard: "https://apis.data.go.kr/1230000/ao/PubDataOpnStdService",
} as const;

export function resolveCollectionWindowDays(type: keyof typeof G2B_ENDPOINTS, requestedDays: number) {
  const normalizedDays = Math.max(1, Math.min(requestedDays, 180));
  return type === "award" || type === "standard" ? Math.min(normalizedDays, 30) : normalizedDays;
}
export function getCollectionDateParams(type: keyof typeof G2B_ENDPOINTS, start: Date, end: Date) {
  return type === "standard"
    ? { bidNtceBgnDt: formatApiDate(start), bidNtceEndDt: formatApiDate(end) }
    : { inqryBgnDt: formatApiDate(start), inqryEndDt: formatApiDate(end) };
}

const OPERATIONS = {
  bid: "getBidPblancListInfoServc",
  spec: "getPublicPrcureThngInfoServcPPSSrch",
  award: "getScsbidListSttusThng",
  contract: "getCntrctInfoListThng",
  standard: "getDataSetOpnStdBidPblancInfo",
} as const;

function first(...values: unknown[]) { return values.find(v => v !== undefined && v !== null && String(v).trim() !== ""); }
function parseDate(value: unknown) { if (!value) return undefined; const d = new Date(String(value).replace(" ", "T")); return Number.isNaN(d.getTime()) ? undefined : d; }
function parseNumber(value: unknown) { if (value === undefined || value === null || value === "") return undefined; const n = Number(String(value).replace(/,/g, "")); return Number.isFinite(n) ? n.toFixed(2) : undefined; }
function dateWithTime(date: unknown, time: unknown) { return date ? `${date}${time ? ` ${time}` : ""}` : undefined; }
function toItems(payload: any): any[] { const body = payload?.response?.body ?? payload?.body ?? payload; const items = body?.items?.item ?? body?.items ?? []; return Array.isArray(items) ? items : items ? [items] : []; }
function totalCount(payload: any) { const body = payload?.response?.body ?? payload?.body ?? payload; const count = Number(body?.totalCount ?? body?.totalCnt ?? 0); return Number.isFinite(count) ? count : 0; }
function inferSourceType(item: Record<string, unknown>, fallback: keyof typeof G2B_ENDPOINTS): keyof typeof G2B_ENDPOINTS {
  if (item.cntrctNo || item.cntrctNm || item.cntrctCnclsDate) return "contract";
  if (item.sucsfbidAmt || item.sucsfbidRate || item.sucsfbidCorpNm) return "award";
  if (item.prcrmntReqNo || item.rgstNo || item.preStdntNo || item.bfSpecRgstNo) return "spec";
  if (item.bidNtceNo || item.bidNtceNm) return "bid";
  return fallback;
}
export function extractAttachments(item: Record<string, unknown>) {
  return Object.entries(item).flatMap(([key, value]) => {
    if (typeof value !== "string" || !/^https?:\/\//i.test(value)) return [];
    if (!/(atch|attach|file|download|specdoc|docurl)/i.test(key)) return [];
    const sequence = key.match(/(\d+)$/)?.[1];
    const name = /^specDocFileUrl/i.test(key) ? `사전규격 첨부자료 ${sequence ?? ""}`.trim() : /^ntceSpecDocUrl/i.test(key) ? `입찰공고 첨부자료 ${sequence ?? ""}`.trim() : key;
    const fileName = first(item[`${key.replace(/Url/i, "")}Nm`], item[`${key.replace(/Url/i, "")}FileNm`], item[`${key}Nm`], item[`${key}FileNm`], sequence ? item[`specDocFileNm${sequence}`] : undefined, sequence ? item[`fileNm${sequence}`] : undefined);
    const sizeBytes = first(item[`${key.replace(/Url/i, "")}Size`], item[`${key.replace(/Url/i, "")}FileSize`], item[`${key}Size`], item[`${key}FileSize`], sequence ? item[`specDocFileSize${sequence}`] : undefined, sequence ? item[`fileSize${sequence}`] : undefined);
    return [{ name, url: value, ...(fileName ? { fileName: String(fileName) } : {}), ...(parseNumber(sizeBytes) ? { sizeBytes: Number(parseNumber(sizeBytes)) } : {}) }];
  });
}

export function mapG2BNoticeFields(item: Record<string, unknown>, fallback: keyof typeof G2B_ENDPOINTS) {
  const sourceType = fallback;
  const sourceId = String(first(item.bidNtceNo, item.ntceNo, item.cntrctNo, item.untyCntrctNo, item.prcrmntReqNo, item.rgstNo, item.bfSpecRgstNo, item.refNo) ?? `${item.bidNtceNm ?? item.cntrctNm ?? item.prdctClsfcNoNm ?? JSON.stringify(item).slice(0, 40)}`);
  const title = String(first(item.bidNtceNm, item.ntceNm, item.cntrctNm, item.prdctNm, item.prdctClsfcNoNm, item.bfSpecDtil, item.bsnsNm, "제목 미상"));
  const agency = sourceType === "bid"
    ? String(first(item.ntceInsttNm, item.dmndInsttNm, item.dminsttNm, item.orderInsttNm, ""))
    : sourceType === "spec"
      ? String(first(item.orderInsttNm, item.rlDminsttNm, item.dminsttNm, item.ntceInsttNm, ""))
      : String(first(item.cntrctInsttNm, item.dminsttNm, item.ntceInsttNm, item.dmndInsttNm, ""));
  const itemName = String(first(item.prdctNm, item.bidNtceNm, item.prdctClsfcNoNm, item.bfSpecDtil, title));
  const noticeDate = parseDate(first(item.bidNtceDt, item.bidNtceDate, item.ntceDt, item.ntceDate, item.opengDt, item.opengDate, item.cntrctDate, item.cntrctCnclsDate, item.dataBssDate, item.regDt, item.rgstDt, item.bfSpecRgstDt));
  const deadline = parseDate(first(item.bidClseDt, item.bidNtceEndDt, dateWithTime(item.bidClseDate, item.bidClseTm), item.rcptEndDt, item.opninRgstClseDt));
  return { sourceType, noticeId: `${sourceType}:${sourceId}`, title, agency, itemName, noticeDate, deadline, baseAmount: parseNumber(first(item.presmptPrice, item.presmptPrce, item.bssamt, item.asignBdgtAmt, item.cntrctAmt, item.totCntrctAmt)), awardAmount: parseNumber(first(item.sucsfbidAmt, item.finalSucsfBidAmt, item.cntrctAmt)), awardRate: parseNumber(first(item.sucsfbidRate, item.bidRate)), originalUrl: first(item.bidNtceUrl, item.ntceUrl, item.cntrctDtlInfoUrl, item.cntrctInfoUrl, item.linkUrl, item.g2bLink) as string | undefined, attachmentsJson: JSON.stringify(extractAttachments(item)) };
}
function insertId(result: unknown) { const value = (result as any)?.insertId ?? (result as any)?.[0]?.insertId; const id = Number(value); if (!Number.isInteger(id) || id <= 0) throw new Error("수집 이력 ID를 확인할 수 없습니다."); return id; }
function normalizeServiceKey(key: string) { try { return decodeURIComponent(key.trim()); } catch { return key.trim(); } }
export async function getJson(url: URL, options: { fetchImpl?: typeof fetch; retryDelayMs?: number } = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const retryDelayMs = options.retryDelayMs ?? 500;
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetchImpl(url, { signal: controller.signal, headers: { Accept: "application/json" } });
      const body = await response.text();
      if (!response.ok) throw new Error(`API ${response.status}: ${body.slice(0, 300)}`);
      try {
        const parsed = JSON.parse(body);
        const header = parsed?.response?.header;
        if (header?.resultCode && header.resultCode !== "00") throw new Error(`API ${header.resultCode}: ${header.resultMsg ?? "요청 실패"}`);
        return parsed;
      } catch (error) {
        if (error instanceof SyntaxError) throw new Error(`API가 JSON 대신 응답을 반환했습니다: ${body.slice(0, 300)}`);
        throw error;
      }
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, retryDelayMs * (attempt + 1)));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

type ActiveCollectionRun = typeof collectionRuns.$inferSelect;
type BatchResult = { fetched: number; matched: number; failures: { sourceType: string; message: string }[]; runId: number; isComplete: boolean };
export function formatCollectionFailures(failures: { sourceType: string; message: string }[]) { return failures.map(item => `${item.sourceType}: ${item.message}`).join("\n"); }

async function countStoredNotices(type: keyof typeof G2B_ENDPOINTS, start: Date, end: Date) {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select({ total: count() }).from(notices).where(and(eq(notices.sourceType, type), gte(notices.noticeDate, start), lte(notices.noticeDate, end)));
  return Number(rows[0]?.total ?? 0);
}

async function getActiveCollectionRun(type: keyof typeof G2B_ENDPOINTS) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(collectionRuns).where(and(eq(collectionRuns.sourceType, type), or(eq(collectionRuns.status, "running"), eq(collectionRuns.status, "failed")), gt(collectionRuns.totalAvailable, 0), sql`${collectionRuns.totalAvailable} > ${collectionRuns.fetchedCount}`)).orderBy(desc(collectionRuns.startedAt)).limit(1))[0];
}

async function collectTypeBatch(userId: number, type: keyof typeof G2B_ENDPOINTS, options: { pageLimit: number; requestedDays: number; activeRun?: ActiveCollectionRun; isBackground?: boolean }): Promise<BatchResult> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const settings = await getSettings(userId);
  const serviceKey = decryptSecret(settings?.dataServiceKey);
  if (!serviceKey) throw new Error("공공데이터 인증키가 설정되지 않았습니다.");
  const keywords = await listKeywords(userId);
  const end = options.activeRun?.queryEndAt ?? new Date();
  const start = options.activeRun?.queryStartAt ?? new Date(end.getTime() - resolveCollectionWindowDays(type, options.requestedDays) * 86400000);
  if (!options.activeRun) start.setHours(0, 0, 0, 0);
  const startPage = options.activeRun ? options.activeRun.currentPage + 1 : 1;
  const runId = options.activeRun?.id ?? insertId(await db.insert(collectionRuns).values({ sourceType: type, status: "running", startPage, currentPage: startPage - 1, queryStartAt: start, queryEndAt: end, isBackground: Boolean(options.isBackground) }));
  let fetchedCount = options.activeRun?.fetchedCount ?? 0;
  let matchedCount = options.activeRun?.matchedCount ?? 0;
  let totalAvailable = options.activeRun?.totalAvailable ?? 0;
  let currentPage = options.activeRun?.currentPage ?? startPage - 1;
  let batchFetched = 0;
  let batchMatched = 0;
  let reachedEnd = false;
  const pageSize = 100;
  const maxPages = Math.max(1, Math.min(options.pageLimit, 5));

  try {
    for (let pageNo = startPage; pageNo < startPage + maxPages; pageNo += 1) {
      const url = new URL(`${G2B_ENDPOINTS[type]}/${OPERATIONS[type]}`);
      url.searchParams.set("serviceKey", normalizeServiceKey(serviceKey));
      url.searchParams.set("pageNo", String(pageNo));
      url.searchParams.set("numOfRows", String(pageSize));
      url.searchParams.set("type", "json");
      if (type === "award" || type === "spec") url.searchParams.set("inqryDiv", "1");
      Object.entries(getCollectionDateParams(type, start, end)).forEach(([key, value]) => url.searchParams.set(key, value));
      const payload = await getJson(url);
      const items = toItems(payload);
      totalAvailable = totalCount(payload) || totalAvailable;
      if (!items.length) { reachedEnd = true; break; }

      for (const item of items) {
        const mapped = mapG2BNoticeFields(item, type);
        const text = `${mapped.title} ${mapped.agency} ${item.bfSpecDtil ?? ""}`.toLowerCase();
        const matchedKeywords = keywords.filter(k => k.isActive && text.includes(k.keyword.toLowerCase()));
        if (matchedKeywords.length) { matchedCount += 1; batchMatched += 1; }
        await db.insert(notices).values({ ...mapped, rawJson: JSON.stringify(item), sourceUpdatedAt: new Date() }).onDuplicateKeyUpdate({ set: { ...mapped, rawJson: JSON.stringify(item), sourceUpdatedAt: new Date() } });
      }
      fetchedCount += items.length;
      batchFetched += items.length;
      currentPage = pageNo;
      if (items.length < pageSize || (totalAvailable > 0 && fetchedCount >= totalAvailable)) { reachedEnd = true; break; }
    }
    const totalPages = totalAvailable ? Math.ceil(totalAvailable / pageSize) : currentPage;
    const isComplete = reachedEnd || (totalAvailable > 0 && currentPage >= totalPages);
    const storedCount = await countStoredNotices(type, start, end);
    await db.update(collectionRuns).set({ status: isComplete ? "success" : "running", fetchedCount, totalAvailable, storedCount, currentPage, totalPages, matchedCount, isBackground: Boolean(options.isBackground), finishedAt: isComplete ? new Date() : null, errorMessage: null }).where(eq(collectionRuns.id, runId));
    return { fetched: batchFetched, matched: batchMatched, failures: [], runId, isComplete };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const storedCount = await countStoredNotices(type, start, end);
    const keepForRetry = Boolean(options.activeRun && options.isBackground);
    await db.update(collectionRuns).set({ status: keepForRetry ? "running" : "failed", fetchedCount, totalAvailable, storedCount, currentPage, totalPages: totalAvailable ? Math.ceil(totalAvailable / pageSize) : 0, matchedCount, errorMessage: message.slice(0, 2000), finishedAt: keepForRetry ? null : new Date(), isBackground: Boolean(options.isBackground) }).where(eq(collectionRuns.id, runId));
    return { fetched: batchFetched, matched: batchMatched, failures: [{ sourceType: type, message }], runId, isComplete: false };
  }
}

export async function collectSpecBackfill(userId: number) {
  const activeRun = await getActiveCollectionRun("standard") ?? await getActiveCollectionRun("spec");
  if (!activeRun) return { skipped: "no-active-spec-backfill" as const, fetched: 0, matched: 0, isComplete: true };
  return collectTypeBatch(userId, activeRun.sourceType as keyof typeof G2B_ENDPOINTS, { pageLimit: 2, requestedDays: 15, activeRun, isBackground: true });
}

export async function collectForUser(userId: number, sourceType?: keyof typeof G2B_ENDPOINTS, pageLimit = 5, requestedDays = 5) {
  const activeStandardRun = await getActiveCollectionRun("standard");
  const activeSpecRun = await getActiveCollectionRun("spec");
  const types: (keyof typeof G2B_ENDPOINTS)[] = sourceType ? [sourceType] : activeStandardRun ? ["standard"] : activeSpecRun ? ["spec"] : Object.keys(G2B_ENDPOINTS) as (keyof typeof G2B_ENDPOINTS)[];
  let total = 0;
  let matched = 0;
  const failures: { sourceType: string; message: string }[] = [];
  for (const type of types) {
    const activeRun = type === "standard" ? activeStandardRun ?? await getActiveCollectionRun("standard") : type === "spec" ? activeSpecRun ?? await getActiveCollectionRun("spec") : undefined;
    const result = await collectTypeBatch(userId, type, { pageLimit, requestedDays, activeRun });
    total += result.fetched;
    matched += result.matched;
    failures.push(...result.failures);
  }
  return { total, matched, failures };
}
export async function sendTelegram(userId: number, message: string) { const settings = await getSettings(userId); const token = decryptSecret(settings?.telegramBotToken); if (!settings?.telegramEnabled || !token || !settings.telegramChatId) return false; const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: settings.telegramChatId, text: message, disable_web_page_preview: true }) }); return response.ok; }
function formatApiDate(date: Date) { const p = (n: number) => String(n).padStart(2, "0"); return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}${p(date.getHours())}${p(date.getMinutes())}`; }
