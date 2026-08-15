import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { count } from "drizzle-orm";
import { ENV } from "./_core/env";
import { InsertUser, users, userSettings, monitoringKeywords, favoriteFilters, notices, savedNotices, collectionRuns, bidAnalysisHistory } from "../drizzle/schema";
import { COLLECTION_SOURCE_TYPES, type CollectionSourceType, estimateCollectionWork, normalizeCollectionDays, normalizeServiceCollectionDefaults } from "../shared/collectionPreferences";

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
export async function getCollectionPreferences(userId: number) {
  const settings = await getSettings(userId);
  let defaults: unknown;
  try { defaults = settings?.serviceCollectionDefaultsJson ? JSON.parse(settings.serviceCollectionDefaultsJson) : undefined; } catch { defaults = undefined; }
  return { lastCollectionDays: normalizeCollectionDays(settings?.lastCollectionDays), serviceDefaults: normalizeServiceCollectionDefaults(defaults) };
}
export async function saveCollectionPreferences(userId: number, input: { lastCollectionDays: number; serviceDefaults: Record<CollectionSourceType, number> }) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  const values = { lastCollectionDays: normalizeCollectionDays(input.lastCollectionDays), serviceCollectionDefaultsJson: JSON.stringify(normalizeServiceCollectionDefaults(input.serviceDefaults)) };
  const current = await getSettings(userId);
  if (current) await db.update(userSettings).set(values).where(eq(userSettings.userId, userId));
  else await db.insert(userSettings).values({ userId, ...values });
  return getCollectionPreferences(userId);
}
export async function getCollectionWorkEstimate(days: number, sourceTypes: CollectionSourceType[]) {
  const db = await getDb();
  if (!db) return estimateCollectionWork(days, sourceTypes, []);
  const rows = await db.select().from(collectionRuns).where(sql`${collectionRuns.sourceType} IN (${sql.join(sourceTypes.map(sourceType => sql`${sourceType}`), sql`, `)})`).orderBy(desc(collectionRuns.startedAt)).limit(150);
  return estimateCollectionWork(days, sourceTypes, rows.map(row => ({ sourceType: row.sourceType, status: row.status, fetchedCount: row.fetchedCount, totalAvailable: row.totalAvailable, queryStartAt: row.queryStartAt, queryEndAt: row.queryEndAt, startedAt: row.startedAt, finishedAt: row.finishedAt })));
}
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
  const minimum = rates[0]; const maximum = rates[rates.length - 1]; const spread = Math.max(maximum - minimum, 0.01);
  const distribution = Array.from({ length: 5 }, (_, index) => {
    const start = minimum + spread * index / 5; const end = index === 4 ? maximum : minimum + spread * (index + 1) / 5;
    return { label: `${start.toFixed(1)}~${end.toFixed(1)}%`, count: rates.filter(rate => index === 4 ? rate >= start && rate <= end : rate >= start && rate < end).length };
  });
  const samples = filtered.map(row => ({ id: row.id, title: row.title, agency: row.agency, noticeDate: row.noticeDate, awardRate: Number(row.awardRate), awardAmount: row.awardAmount ? Number(row.awardAmount) : null })).sort((a, b) => (b.noticeDate?.getTime() ?? 0) - (a.noticeDate?.getTime() ?? 0)).slice(0, 8);
  return { sampleSize: rates.length, medianRate: median, lowRate: low, highRate: high, minRate: minimum, maxRate: maximum, expectedBid: Math.round(input.baseAmount * median / 100), minBid: Math.round(input.baseAmount * low / 100), maxBid: Math.round(input.baseAmount * high / 100), distribution, samples };
}
export async function listBidAnalysisHistory(userId: number) { const db = await getDb(); if (!db) return []; return db.select().from(bidAnalysisHistory).where(eq(bidAnalysisHistory.userId, userId)).orderBy(desc(bidAnalysisHistory.createdAt)).limit(12); }
export async function saveBidAnalysisHistory(userId: number, input: { agency?: string; itemName?: string; baseAmount: number }, result: { sampleSize: number; medianRate: number; lowRate: number; highRate: number; expectedBid: number; minBid: number; maxBid: number }) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  await db.insert(bidAnalysisHistory).values({ userId, agency: input.agency || null, itemName: input.itemName || null, baseAmount: input.baseAmount.toFixed(2), sampleSize: result.sampleSize, medianRate: result.medianRate.toFixed(4), lowRate: result.lowRate.toFixed(4), highRate: result.highRate.toFixed(4), expectedBid: result.expectedBid.toFixed(2), minBid: result.minBid.toFixed(2), maxBid: result.maxBid.toFixed(2) });
  return listBidAnalysisHistory(userId);
}
