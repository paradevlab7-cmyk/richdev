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
  spec: "getHrcspSsstndrdInfoList",
  award: "getScsbidListSttus",
  contract: "getCntrctInfoList",
  standard: "getDataSetOpnStdCntrctInfo",
} as const;

function first(...values: unknown[]) { return values.find(v => v !== undefined && v !== null && String(v).trim() !== ""); }
function parseDate(value: unknown) { if (!value) return undefined; const d = new Date(String(value).replace(" ", "T")); return Number.isNaN(d.getTime()) ? undefined : d; }
function parseNumber(value: unknown) { if (value === undefined || value === null || value === "") return undefined; const n = Number(String(value).replace(/,/g, "")); return Number.isFinite(n) ? n.toFixed(2) : undefined; }
function toItems(payload: any): any[] { const body = payload?.response?.body ?? payload?.body ?? payload; const items = body?.items?.item ?? body?.items ?? []; return Array.isArray(items) ? items : items ? [items] : []; }

export async function collectForUser(userId: number, sourceType?: keyof typeof G2B_ENDPOINTS) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  const settings = await getSettings(userId); const serviceKey = decryptSecret(settings?.dataServiceKey); if (!serviceKey) throw new Error("공공데이터 인증키가 설정되지 않았습니다.");
  const keywords = await listKeywords(userId); const types = sourceType ? [sourceType] : Object.keys(G2B_ENDPOINTS) as (keyof typeof G2B_ENDPOINTS)[];
  let total = 0; let matched = 0;
  for (const type of types) {
    const run = await db.insert(collectionRuns).values({ sourceType: type, status: "running" });
    try {
      const end = new Date(); const start = new Date(end.getTime() - 5 * 86400000);
      const url = new URL(`${G2B_ENDPOINTS[type]}/${OPERATIONS[type]}`);
      url.searchParams.set("serviceKey", serviceKey); url.searchParams.set("pageNo", "1"); url.searchParams.set("numOfRows", "100"); url.searchParams.set("type", "json");
      url.searchParams.set("inqryBgnDt", formatApiDate(start)); url.searchParams.set("inqryEndDt", formatApiDate(end));
      const response = await fetch(url); if (!response.ok) throw new Error(`API ${response.status}`); const payload = await response.json(); const items = toItems(payload); total += items.length;
      for (const item of items) {
        const noticeId = String(first(item.bidNtceNo, item.ntceNo, item.cntrctNo, item.untyCntrctNo, item.prcrmntReqNo, item.rgstNo) ?? `${type}-${item.bidNtceNm ?? item.cntrctNm ?? JSON.stringify(item).slice(0, 40)}`);
        const title = String(first(item.bidNtceNm, item.ntceNm, item.cntrctNm, item.prdctNm, item.bsnsNm, "제목 미상"));
        const text = `${title} ${item.cntrctInsttNm ?? item.dminsttNm ?? item.orderInsttNm ?? ""}`.toLowerCase();
        const matchedKeywords = keywords.filter(k => k.isActive && text.includes(k.keyword.toLowerCase())); if (matchedKeywords.length) matched += 1;
        const noticeDate = parseDate(first(item.bidNtceDt, item.ntceDt, item.opengDt, item.cntrctDate, item.regDt));
        const deadline = parseDate(first(item.bidClseDt, item.bidNtceEndDt, item.rcptEndDt));
        const baseAmount = parseNumber(first(item.presmptPrice, item.bssamt, item.cntrctAmt, item.totCntrctAmt)); const awardAmount = parseNumber(first(item.sucsfbidAmt, item.finalSucsfBidAmt, item.cntrctAmt)); const awardRate = parseNumber(first(item.sucsfbidRate, item.bidRate));
        const originalUrl = first(item.bidNtceUrl, item.ntceUrl, item.linkUrl, item.g2bLink) as string | undefined;
        await db.insert(notices).values({ sourceType: type, noticeId, title, agency: String(first(item.cntrctInsttNm, item.dminsttNm, item.orderInsttNm, "")), itemName: String(first(item.prdctNm, item.bidNtceNm, "")), noticeDate, deadline, baseAmount, awardAmount, awardRate, originalUrl, rawJson: JSON.stringify(item), sourceUpdatedAt: new Date() }).onDuplicateKeyUpdate({ set: { title, agency: String(first(item.cntrctInsttNm, item.dminsttNm, "")), rawJson: JSON.stringify(item), sourceUpdatedAt: new Date() } });
      }
      await db.update(collectionRuns).set({ status: "success", fetchedCount: items.length, matchedCount: matched, finishedAt: new Date() }).where(eq(collectionRuns.id, Number((run as any).insertId)));
    } catch (error) { await db.update(collectionRuns).set({ status: "failed", errorMessage: String(error), finishedAt: new Date() }).where(eq(collectionRuns.id, Number((run as any).insertId))); }
  }
  return { total, matched };
}
export async function sendTelegram(userId: number, message: string) { const settings = await getSettings(userId); const token = decryptSecret(settings?.telegramBotToken); if (!settings?.telegramEnabled || !token || !settings.telegramChatId) return false; const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: settings.telegramChatId, text: message, disable_web_page_preview: true }) }); return response.ok; }
function formatApiDate(date: Date) { const p = (n: number) => String(n).padStart(2, "0"); return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}0000`; }
