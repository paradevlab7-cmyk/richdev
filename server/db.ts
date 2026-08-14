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
