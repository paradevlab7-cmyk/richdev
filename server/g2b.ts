import { getDb, getSettings, listKeywords } from "./db";
import { collectionRuns, notices } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { decryptSecret } from "./secure";

export const G2B_ENDPOINTS = {
  bid: "https://apis.data.go.kr/1230000/ad/BidPublicInfoService",
  spec: "https://apis.data.go.kr/1230000/ao/HrcspSsstndrdInfoService",
  award: "https://apis.data.go.kr/1230000/as/ScsbidInfoService",
  contract: "https://apis.data.go.kr/1230000/ao/CntrctInfoService",
  standard: "https://apis.data.go.kr/1230000/ao/PubDataOpnStdService",
} as const;

const OPERATIONS = {
  bid: "getBidPblancListInfoServc",
  spec: "getPublicPrcureThngInfoServc",
  award: "getScsbidListSttusThng",
  contract: "getCntrctInfoListThng",
  standard: "getDataSetOpnStdBidPblancInfo",
} as const;

function first(...values: unknown[]) { return values.find(v => v !== undefined && v !== null && String(v).trim() !== ""); }
function parseDate(value: unknown) { if (!value) return undefined; const d = new Date(String(value).replace(" ", "T")); return Number.isNaN(d.getTime()) ? undefined : d; }
function parseNumber(value: unknown) { if (value === undefined || value === null || value === "") return undefined; const n = Number(String(value).replace(/,/g, "")); return Number.isFinite(n) ? n.toFixed(2) : undefined; }
function toItems(payload: any): any[] { const body = payload?.response?.body ?? payload?.body ?? payload; const items = body?.items?.item ?? body?.items ?? []; return Array.isArray(items) ? items : items ? [items] : []; }
function totalCount(payload: any) { const body = payload?.response?.body ?? payload?.body ?? payload; const count = Number(body?.totalCount ?? body?.totalCnt ?? 0); return Number.isFinite(count) ? count : 0; }
function inferSourceType(item: Record<string, unknown>, fallback: keyof typeof G2B_ENDPOINTS): keyof typeof G2B_ENDPOINTS {
  if (item.cntrctNo || item.cntrctNm || item.cntrctCnclsDate) return "contract";
  if (item.sucsfbidAmt || item.sucsfbidRate || item.sucsfbidCorpNm) return "award";
  if (item.prcrmntReqNo || item.rgstNo || item.preStdntNo) return "spec";
  if (item.bidNtceNo || item.bidNtceNm) return "bid";
  return fallback;
}
export function extractAttachments(item: Record<string, unknown>) {
  return Object.entries(item).flatMap(([key, value]) => {
    if (typeof value !== "string" || !/^https?:\/\//i.test(value)) return [];
    if (!/(atch|attach|file|download)/i.test(key)) return [];
    return [{ name: key, url: value }];
  });
}
function insertId(result: unknown) { const value = (result as any)?.insertId ?? (result as any)?.[0]?.insertId; const id = Number(value); if (!Number.isInteger(id) || id <= 0) throw new Error("수집 이력 ID를 확인할 수 없습니다."); return id; }
function normalizeServiceKey(key: string) { try { return decodeURIComponent(key.trim()); } catch { return key.trim(); } }
async function getJson(url: URL) { const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 25000); try { const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } }); const body = await response.text(); if (!response.ok) throw new Error(`API ${response.status}: ${body.slice(0, 300)}`); try { const parsed = JSON.parse(body); const header = parsed?.response?.header; if (header?.resultCode && header.resultCode !== "00") throw new Error(`API ${header.resultCode}: ${header.resultMsg ?? "요청 실패"}`); return parsed; } catch (error) { if (error instanceof SyntaxError) throw new Error(`API가 JSON 대신 응답을 반환했습니다: ${body.slice(0, 300)}`); throw error; } } finally { clearTimeout(timeout); } }

export async function collectForUser(userId: number, sourceType?: keyof typeof G2B_ENDPOINTS, pageLimit = 5) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  const settings = await getSettings(userId); const serviceKey = decryptSecret(settings?.dataServiceKey); if (!serviceKey) throw new Error("공공데이터 인증키가 설정되지 않았습니다.");
  const keywords = await listKeywords(userId); const types = sourceType ? [sourceType] : Object.keys(G2B_ENDPOINTS) as (keyof typeof G2B_ENDPOINTS)[];
  let total = 0; let matched = 0; const failures: { sourceType: string; message: string }[] = [];
  for (const type of types) {
    const run = await db.insert(collectionRuns).values({ sourceType: type, status: "running" });
    const runId = insertId(run);
    try {
      const end = new Date();
      const lookbackDays = type === "award" ? 30 : 5;
      const start = new Date(end.getTime() - lookbackDays * 86400000);
      let fetched = 0; let typeMatched = 0; const pageSize = 100; const maxPages = Math.max(1, Math.min(pageLimit, 5));
      for (let pageNo = 1; pageNo <= maxPages; pageNo += 1) {
        const url = new URL(`${G2B_ENDPOINTS[type]}/${OPERATIONS[type]}`);
        url.searchParams.set("serviceKey", normalizeServiceKey(serviceKey)); url.searchParams.set("pageNo", String(pageNo)); url.searchParams.set("numOfRows", String(pageSize)); url.searchParams.set("type", "json");
        if (type === "award") url.searchParams.set("inqryDiv", "1");
        url.searchParams.set("inqryBgnDt", formatApiDate(start)); url.searchParams.set("inqryEndDt", formatApiDate(end));
        const payload = await getJson(url); const items = toItems(payload); const available = totalCount(payload); if (!items.length) break;
        fetched += items.length; total += items.length;
        for (const item of items) {
          const resolvedType = inferSourceType(item, type);
          const sourceId = String(first(item.bidNtceNo, item.ntceNo, item.cntrctNo, item.untyCntrctNo, item.prcrmntReqNo, item.rgstNo) ?? `${item.bidNtceNm ?? item.cntrctNm ?? JSON.stringify(item).slice(0, 40)}`);
          const noticeId = `${resolvedType}:${sourceId}`;
          const title = String(first(item.bidNtceNm, item.ntceNm, item.cntrctNm, item.prdctNm, item.bsnsNm, "제목 미상"));
          const text = `${title} ${item.cntrctInsttNm ?? item.dminsttNm ?? item.orderInsttNm ?? ""}`.toLowerCase();
          const matchedKeywords = keywords.filter(k => k.isActive && text.includes(k.keyword.toLowerCase())); if (matchedKeywords.length) { matched += 1; typeMatched += 1; }
          const noticeDate = parseDate(first(item.bidNtceDt, item.ntceDt, item.opengDt, item.cntrctDate, item.cntrctCnclsDate, item.dataBssDate, item.regDt));
          const deadline = parseDate(first(item.bidClseDt, item.bidNtceEndDt, item.rcptEndDt));
          const baseAmount = parseNumber(first(item.presmptPrice, item.bssamt, item.cntrctAmt, item.totCntrctAmt)); const awardAmount = parseNumber(first(item.sucsfbidAmt, item.finalSucsfBidAmt, item.cntrctAmt)); const awardRate = parseNumber(first(item.sucsfbidRate, item.bidRate));
          const originalUrl = first(item.bidNtceUrl, item.ntceUrl, item.cntrctInfoUrl, item.linkUrl, item.g2bLink) as string | undefined;
          const attachmentsJson = JSON.stringify(extractAttachments(item));
          await db.insert(notices).values({ sourceType: resolvedType, noticeId, title, agency: String(first(item.cntrctInsttNm, item.dminsttNm, item.orderInsttNm, "")), itemName: String(first(item.prdctNm, item.bidNtceNm, "")), noticeDate, deadline, baseAmount, awardAmount, awardRate, originalUrl, attachmentsJson, rawJson: JSON.stringify(item), sourceUpdatedAt: new Date() }).onDuplicateKeyUpdate({ set: { sourceType: resolvedType, title, agency: String(first(item.cntrctInsttNm, item.dminsttNm, "")), itemName: String(first(item.prdctNm, item.bidNtceNm, "")), noticeDate, deadline, baseAmount, awardAmount, awardRate, originalUrl, attachmentsJson, rawJson: JSON.stringify(item), sourceUpdatedAt: new Date() } });
        }
        if (items.length < pageSize || (available > 0 && fetched >= available)) break;
      }
      await db.update(collectionRuns).set({ status: "success", fetchedCount: fetched, matchedCount: typeMatched, finishedAt: new Date() }).where(eq(collectionRuns.id, runId));
    } catch (error) { const message = error instanceof Error ? error.message : String(error); failures.push({ sourceType: type, message }); await db.update(collectionRuns).set({ status: "failed", errorMessage: message.slice(0, 2000), finishedAt: new Date() }).where(eq(collectionRuns.id, runId)); }
  }
  return { total, matched, failures };
}
export async function sendTelegram(userId: number, message: string) { const settings = await getSettings(userId); const token = decryptSecret(settings?.telegramBotToken); if (!settings?.telegramEnabled || !token || !settings.telegramChatId) return false; const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: settings.telegramChatId, text: message, disable_web_page_preview: true }) }); return response.ok; }
function formatApiDate(date: Date) { const p = (n: number) => String(n).padStart(2, "0"); return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}0000`; }
