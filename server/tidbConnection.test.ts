import mysql from "mysql2/promise";
import { describe, expect, it } from "vitest";

describe("TiDB Cloud connection", () => {
  it("authenticates over TLS and executes a lightweight query", async () => {
    const url = process.env.TIDB_APP_DATABASE_URL;
    expect(url).toBeTruthy();

    const connection = await mysql.createConnection(url!);
    try {
      const [rows] = await connection.query("SELECT 1 AS ok");
      expect(rows).toEqual([{ ok: 1 }]);
    } finally {
      await connection.end();
    }
  }, 20_000);

  it("contains the migrated users, notices, settings, and collection tables", async () => {
    const connection = await mysql.createConnection(process.env.TIDB_APP_DATABASE_URL!);
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
