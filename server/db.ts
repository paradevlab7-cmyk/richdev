import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { ENV } from "./_core/env";
import { InsertUser, users, userSettings, monitoringKeywords, notices, savedNotices, collectionRuns } from "../drizzle/schema";

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

export async function listNotices(input: { q?: string; sourceType?: string; from?: Date; to?: Date; limit?: number }) {
  const db = await getDb(); if (!db) return [];
  const filters = [];
  if (input.sourceType && input.sourceType !== "all") filters.push(eq(notices.sourceType, input.sourceType as any));
  if (input.q) filters.push(or(like(notices.title, `%${input.q}%`), like(notices.agency, `%${input.q}%`), like(notices.itemName, `%${input.q}%`)));
  if (input.from) filters.push(sql`${notices.noticeDate} >= ${input.from}`);
  if (input.to) filters.push(sql`${notices.noticeDate} <= ${input.to}`);
  return db.select().from(notices).where(filters.length ? and(...filters) : undefined).orderBy(desc(notices.noticeDate)).limit(input.limit ?? 100);
}
export async function getNotice(id: number) { const db = await getDb(); if (!db) return undefined; return (await db.select().from(notices).where(eq(notices.id, id)).limit(1))[0]; }
export async function listKeywords(userId: number) { const db = await getDb(); if (!db) return []; return db.select().from(monitoringKeywords).where(eq(monitoringKeywords.userId, userId)).orderBy(desc(monitoringKeywords.createdAt)); }
export async function listSaved(userId: number) { const db = await getDb(); if (!db) return []; return db.select({ saved: savedNotices, notice: notices }).from(savedNotices).innerJoin(notices, eq(savedNotices.noticeId, notices.id)).where(eq(savedNotices.userId, userId)).orderBy(desc(savedNotices.updatedAt)); }
export async function getSettings(userId: number) { const db = await getDb(); if (!db) return undefined; return (await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1))[0]; }
export async function getCollectionRuns() { const db = await getDb(); if (!db) return []; return db.select().from(collectionRuns).orderBy(desc(collectionRuns.startedAt)).limit(10); }
export async function estimateBid(input: { agency?: string; itemName?: string; baseAmount: number }) {
  const rows = await listNotices({ q: input.itemName || input.agency, sourceType: "award", limit: 200 });
  const filtered = rows.filter(row => (!input.agency || row.agency?.includes(input.agency)) && (!input.itemName || `${row.title} ${row.itemName ?? ""}`.includes(input.itemName)) && row.awardRate);
  const rates = filtered.map(row => Number(row.awardRate)).filter(Number.isFinite).sort((a, b) => a - b);
  if (!rates.length) return { sampleSize: 0, message: "조건에 맞는 과거 낙찰률 데이터가 없습니다." };
  const median = rates[Math.floor(rates.length / 2)]; const low = rates[Math.floor(rates.length * 0.25)]; const high = rates[Math.max(0, Math.ceil(rates.length * 0.75) - 1)];
  return { sampleSize: rates.length, medianRate: median, lowRate: low, highRate: high, expectedBid: Math.round(input.baseAmount * median / 100), minBid: Math.round(input.baseAmount * low / 100), maxBid: Math.round(input.baseAmount * high / 100) };
}
