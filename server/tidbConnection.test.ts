import mysql from "mysql2/promise";
import { describe, expect, it } from "vitest";
import { buildTiDbConnectionOptions, getTiDbConnectionUrl } from "./tidbConnection";

describe("TiDB Cloud connection", () => {
  it("builds explicit TLS options from a TiDB URL", () => {
    const options = buildTiDbConnectionOptions("mysql://acct.root:p%40ss@gateway.example.com:4000/g2b_bid_monitor");
    expect(options).toMatchObject({
      host: "gateway.example.com",
      port: 4000,
      user: "acct.root",
      password: "p@ss",
      database: "g2b_bid_monitor",
      enableKeepAlive: true,
    });
    expect(options.ssl).toMatchObject({ minVersion: "TLSv1.2", rejectUnauthorized: true });
  });

  it("prefers the explicitly managed DATABASE_URL over injected aliases", () => {
    const previous = { DATABASE_URL: process.env.DATABASE_URL, TIDB_APP_DATABASE_URL: process.env.TIDB_APP_DATABASE_URL };
    process.env.DATABASE_URL = "mysql://managed.example/db";
    process.env.TIDB_APP_DATABASE_URL = "mysql://injected.example/db";
    try {
      expect(getTiDbConnectionUrl()).toBe("mysql://managed.example/db");
    } finally {
      if (previous.DATABASE_URL === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous.DATABASE_URL;
      if (previous.TIDB_APP_DATABASE_URL === undefined) delete process.env.TIDB_APP_DATABASE_URL; else process.env.TIDB_APP_DATABASE_URL = previous.TIDB_APP_DATABASE_URL;
    }
  });
  it("authenticates over TLS and executes a lightweight query", async () => {
    const url = getTiDbConnectionUrl();
    expect(url).toBeTruthy();

    const connection = await mysql.createConnection(buildTiDbConnectionOptions(url!));
    try {
      const [rows] = await connection.query("SELECT 1 AS ok");
      expect(rows).toEqual([{ ok: 1 }]);
    } finally {
      await connection.end();
    }
  }, 20_000);

  it("contains the migrated users, notices, settings, and collection tables", async () => {
    const url = getTiDbConnectionUrl();
    expect(url).toBeTruthy();
    const connection = await mysql.createConnection(buildTiDbConnectionOptions(url!));
    try {
      const [rows] = await connection.query("SHOW TABLES");
      const names = (rows as Array<Record<string, string>>).map(row => Object.values(row)[0]);
      expect(names).toEqual(expect.arrayContaining([
        "users",
        "user_settings",
        "notices",
        "collection_runs",
        "__drizzle_migrations",
      ]));
    } finally {
      await connection.end();
    }
  }, 20_000);
});
