import crypto from "node:crypto";

const key = crypto.createHash("sha256").update(process.env.JWT_SECRET || "g2b-bid-monitor-secret").digest();
export function encryptSecret(value?: string | null) { if (!value) return value; const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv("aes-256-gcm", key, iv); const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]); return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`; }
export function decryptSecret(value?: string | null) { if (!value || !value.includes(".")) return value || undefined; try { const [iv, tag, body] = value.split("."); const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url")); decipher.setAuthTag(Buffer.from(tag, "base64url")); return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8"); } catch { return undefined; } }
