import fs from "node:fs";
import type { ConnectionOptions } from "mysql2";

const DEFAULT_CA_PATHS = [
  process.env.TIDB_CA_PATH,
  "/etc/ssl/certs/ca-certificates.crt",
  "/etc/ssl/cert.pem",
].filter((value): value is string => Boolean(value));

function readSystemCa() {
  const path = DEFAULT_CA_PATHS.find(candidate => fs.existsSync(candidate));
  return path ? fs.readFileSync(path) : undefined;
}

export function buildTiDbConnectionOptions(url: string): ConnectionOptions {
  const parsed = new URL(url);
  const ca = readSystemCa();
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 4000),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, "") || undefined,
    ssl: {
      minVersion: "TLSv1.2",
      rejectUnauthorized: true,
      ...(ca ? { ca } : {}),
    },
    enableKeepAlive: true,
    connectTimeout: 20_000,
  };
}

export function getTiDbConnectionUrl() {
  return process.env.DATABASE_URL || process.env.TIDB_APP_DATABASE_URL || process.env.TIDB_DATABASE_URL;
}
