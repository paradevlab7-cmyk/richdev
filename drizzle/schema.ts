import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const userSettings = mysqlTable("user_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  dataServiceKey: text("dataServiceKey"),
  telegramBotToken: text("telegramBotToken"),
  telegramChatId: varchar("telegramChatId", { length: 128 }),
  notificationEmail: varchar("notificationEmail", { length: 320 }),
  emailProvider: mysqlEnum("emailProvider", ["owner", "smtp", "resend", "sendgrid", "mailgun"]).default("owner").notNull(),
  fallbackEmailProvider: mysqlEnum("fallbackEmailProvider", ["none", "owner", "smtp", "resend", "sendgrid", "mailgun"]).default("none").notNull(),
  emailFrom: varchar("emailFrom", { length: 320 }),
  smtpHost: varchar("smtpHost", { length: 320 }),
  smtpPort: int("smtpPort"),
  smtpUsername: varchar("smtpUsername", { length: 320 }),
  smtpPassword: text("smtpPassword"),
  emailApiKey: text("emailApiKey"),
  mailgunDomain: varchar("mailgunDomain", { length: 320 }),
  emailEnabled: boolean("emailEnabled").default(true).notNull(),
  telegramEnabled: boolean("telegramEnabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const monitoringKeywords = mysqlTable("monitoring_keywords", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  keyword: varchar("keyword", { length: 255 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const notices = mysqlTable("notices", {
  id: int("id").autoincrement().primaryKey(),
  sourceType: mysqlEnum("sourceType", ["bid", "spec", "award", "contract", "standard"]).notNull(),
  noticeId: varchar("noticeId", { length: 128 }).notNull().unique(),
  title: text("title").notNull(),
  agency: varchar("agency", { length: 255 }),
  itemName: text("itemName"),
  noticeDate: timestamp("noticeDate"),
  deadline: timestamp("deadline"),
  awardAmount: decimal("awardAmount", { precision: 18, scale: 2 }),
  baseAmount: decimal("baseAmount", { precision: 18, scale: 2 }),
  awardRate: decimal("awardRate", { precision: 8, scale: 4 }),
  originalUrl: text("originalUrl"),
  attachmentsJson: text("attachmentsJson"),
  rawJson: text("rawJson"),
  sourceUpdatedAt: timestamp("sourceUpdatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const noticeKeywords = mysqlTable("notice_keywords", {
  id: int("id").autoincrement().primaryKey(),
  noticeId: int("noticeId").notNull(),
  keywordId: int("keywordId").notNull(),
  matchedAt: timestamp("matchedAt").defaultNow().notNull(),
});

export const savedNotices = mysqlTable("saved_notices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  noticeId: int("noticeId").notNull(),
  status: mysqlEnum("status", ["watching", "reviewing", "submitted", "closed"]).default("watching").notNull(),
  memo: text("memo"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const collectionRuns = mysqlTable("collection_runs", {
  id: int("id").autoincrement().primaryKey(),
  sourceType: varchar("sourceType", { length: 32 }).notNull(),
  status: mysqlEnum("status", ["running", "success", "failed"]).notNull(),
  fetchedCount: int("fetchedCount").default(0).notNull(),
  matchedCount: int("matchedCount").default(0).notNull(),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  finishedAt: timestamp("finishedAt"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Notice = typeof notices.$inferSelect;
