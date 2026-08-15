import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { count } from "drizzle-orm";
import { ENV } from "./_core/env";
import { InsertUser, users, userSettings, monitoringKeywords, favoriteFilters, notices, savedNotices, collectionRuns } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) _db = drizzle(process.env.DATABASE_URL);
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  const db = await getDb(); if (!db || !user.openId) return;
  const values: InsertUser = { openId: user.openId, name: user.name, email: user.email, loginMethod: user.loginMethod, lastSignedIn: user.lastSignedIn ?? new Date() };
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: { name: values.name, email: values.email, loginMethod: values.loginMethod, lastSignedIn: values.lastSignedIn } });
}
export async function getUserByOpenId(openId: string) { const db = await getDb(); if (!db) return undefined; return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0]; }
export async function getConfiguredCollectionOwner() {
  const db = await getDb();
  if (!db) return undefined;
  const setting = (await db.select({ userId: userSettings.userId }).from(userSettings).orderBy(desc(userSettings.updatedAt)).limit(1))[0];
  if (!setting) return undefined;
  return (await db.select().from(users).where(eq(users.id, setting.userId)).limit(1))[0];
}

export async function listNotices(input: { q?: string; keywords?: string[]; sourceType?: string; agency?: string; contact?: string; from?: Date; to?: Date; limit?: number; offset?: number }) {
  const db = await getDb(); if (!db) return [];
  const filters = [];
  if (input.sourceType && input.sourceType !== "all") filters.push(eq(notices.sourceType, input.sourceType as any));
  if (input.q) filters.push(or(like(notices.title, `%${input.q}%`), like(notices.agency, `%${input.q}%`), like(notices.itemName, `%${input.q}%`), like(notices.rawJson, `%${input.q}%`)));
  if (input.agency) filters.push(or(like(notices.agency, `%${input.agency}%`), like(notices.rawJson, `%${input.agency}%`)));
  if (input.contact) filters.push(like(notices.rawJson, `%${input.contact}%`));
  if (input.keywords?.length) filters.push(or(...input.keywords.map(keyword => or(like(notices.title, `%${keyword}%`), like(notices.agency, `%${keyword}%`), like(notices.itemName, `%${keyword}%`), like(notices.rawJson, `%${keyword}%`)))));
  if (input.from) filters.push(sql`${notices.noticeDate} >= ${input.from}`);
  if (input.to) filters.push(sql`${notices.noticeDate} <= ${input.to}`);
  return db.select().from(notices).where(filters.length ? and(...filters) : undefined).orderBy(desc(notices.noticeDate)).limit(input.limit ?? 500).offset(input.offset ?? 0);
}
export async function getNoticeStats() {
  const db = await getDb();
  if (!db) return { total: 0, bid: 0, spec: 0, award: 0, contract: 0, standard: 0 };
  const rows = await db.select({ sourceType: notices.sourceType, total: count() }).from(notices).groupBy(notices.sourceType);
  const stats = new Map(rows.map(row => [row.sourceType, Number(row.total)]));
  const bid = stats.get("bid") ?? 0; const spec = stats.get("spec") ?? 0; const award = stats.get("award") ?? 0; const contract = stats.get("contract") ?? 0; const standard = stats.get("standard") ?? 0;
  return { total: bid + spec + award + contract + standard, bid, spec, award, contract, standard };
}
export async function getNotice(id: number) { const db = await getDb(); if (!db) return undefined; return (await db.select().from(notices).where(eq(notices.id, id)).limit(1))[0]; }
export async function getCompanyHistory(companyName: string, limit = 50) {
  const db = await getDb();
  const normalizedName = companyName.trim();
  if (!db || !normalizedName) return [];
  const companyMatch = sql<boolean>`(
    JSON_UNQUOTE(JSON_EXTRACT(${notices.rawJson}, '$.rprsntCorpNm')) = ${normalizedName}
    OR JSON_UNQUOTE(JSON_EXTRACT(${notices.rawJson}, '$.bidwinnrNm')) = ${normalizedName}
    OR JSON_UNQUOTE(JSON_EXTRACT(${notices.rawJson}, '$.sucsfbidCorpNm')) = ${normalizedName}
  )`;
  return db.select().from(notices).where(and(or(eq(notices.sourceType, "award"), eq(notices.sourceType, "contract")), companyMatch)).orderBy(desc(notices.noticeDate)).limit(Math.max(1, Math.min(limit, 100)));
}
export async function listKeywords(userId: number) { const db = await getDb(); if (!db) return []; return db.select().from(monitoringKeywords).where(eq(monitoringKeywords.userId, userId)).orderBy(desc(monitoringKeywords.createdAt)); }
export async function listFavoriteFilters(userId: number) { const db = await getDb(); if (!db) return []; return db.select().from(favoriteFilters).where(eq(favoriteFilters.userId, userId)).orderBy(desc(favoriteFilters.updatedAt)); }
export async function listSaved(userId: number) { const db = await getDb(); if (!db) return []; return db.select({ saved: savedNotices, notice: notices }).from(savedNotices).innerJoin(notices, eq(savedNotices.noticeId, notices.id)).where(eq(savedNotices.userId, userId)).orderBy(desc(savedNotices.updatedAt)); }
export async function getSettings(userId: number) { const db = await getDb(); if (!db) return undefined; return (await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1))[0]; }
export async function getCollectionRuns() { const db = await getDb(); if (!db) return []; return db.select().from(collectionRuns).orderBy(desc(collectionRuns.startedAt)).limit(10); }
export async function getCollectionDailyStats(days = 7) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);
  const day = sql<string>`DATE(\`collection_runs\`.\`startedAt\`)`;
  return db.select({
    day,
    success: sql<number>`SUM(CASE WHEN ${collectionRuns.status} = 'success' THEN 1 ELSE 0 END)`,
    failed: sql<number>`SUM(CASE WHEN ${collectionRuns.status} = 'failed' THEN 1 ELSE 0 END)`,
  }).from(collectionRuns).where(sql`${collectionRuns.startedAt} >= ${since}`).groupBy(day).orderBy(day);
}
export async function estimateBid(input: { agency?: string; itemName?: string; baseAmount: number }) {
  const rows = await listNotices({ q: input.itemName || input.agency, sourceType: "award", limit: 200 });
  const filtered = rows.filter(row => (!input.agency || row.agency?.includes(input.agency)) && (!input.itemName || `${row.title} ${row.itemName ?? ""}`.includes(input.itemName)) && row.awardRate);
  const rates = filtered.map(row => Number(row.awardRate)).filter(Number.isFinite).sort((a, b) => a - b);
  if (!rates.length) return { sampleSize: 0, message: "조건에 맞는 과거 낙찰률 데이터가 없습니다." };
  const median = rates[Math.floor(rates.length / 2)]; const low = rates[Math.floor(rates.length * 0.25)]; const high = rates[Math.max(0, Math.ceil(rates.length * 0.75) - 1)];
  return { sampleSize: rates.length, medianRate: median, lowRate: low, highRate: high, expectedBid: Math.round(input.baseAmount * median / 100), minBid: Math.round(input.baseAmount * low / 100), maxBid: Math.round(input.baseAmount * high / 100) };
}
