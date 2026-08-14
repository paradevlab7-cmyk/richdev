import nodemailer from "nodemailer";
import { getSettings, listKeywords, listNotices } from "./db";
import { decryptSecret } from "./secure";
import { notifyOwner } from "./_core/notification";

type Provider = "owner" | "smtp" | "resend" | "sendgrid" | "mailgun";
export type EmailDeliveryResult = { success: boolean; provider?: Provider; error?: string };

function htmlToText(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

async function deliver(provider: Provider, settings: NonNullable<Awaited<ReturnType<typeof getSettings>>>, subject: string, html: string): Promise<EmailDeliveryResult> {
  const to = settings.notificationEmail || "";
  const from = settings.emailFrom || settings.notificationEmail || "";
  if (provider !== "owner" && (!to || !from)) return { success: false, provider, error: "수신 주소 또는 발신 주소가 설정되지 않았습니다." };
  try {
    if (provider === "owner") {
      const success = await notifyOwner({ title: subject, content: htmlToText(html).slice(0, 1800) });
      return success ? { success, provider } : { success, provider, error: "플랫폼 소유자 알림 전송에 실패했습니다." };
    }
    if (provider === "smtp") {
      const password = decryptSecret(settings.smtpPassword);
      if (!settings.smtpHost || !settings.smtpPort || !settings.smtpUsername || !password) return { success: false, provider, error: "SMTP 서버 정보가 완전하지 않습니다." };
      const transporter = nodemailer.createTransport({ host: settings.smtpHost, port: settings.smtpPort, secure: settings.smtpPort === 465, auth: { user: settings.smtpUsername, pass: password } });
      await transporter.sendMail({ from, to, subject, html });
      return { success: true, provider };
    }
    const apiKey = decryptSecret(settings.emailApiKey);
    if (!apiKey) return { success: false, provider, error: "이메일 API 키가 설정되지 않았습니다." };
    if (provider === "resend") {
      const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [to], subject, html }) });
      return response.ok ? { success: true, provider } : { success: false, provider, error: await response.text() };
    }
    if (provider === "sendgrid") {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ personalizations: [{ to: [{ email: to }] }], from: { email: from }, subject, content: [{ type: "text/html", value: html }] }) });
      return response.ok ? { success: true, provider } : { success: false, provider, error: await response.text() };
    }
    if (!settings.mailgunDomain) return { success: false, provider, error: "Mailgun 도메인이 설정되지 않았습니다." };
    const body = new URLSearchParams({ from, to, subject, html });
    const response = await fetch(`https://api.mailgun.net/v3/${settings.mailgunDomain}/messages`, { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" }, body });
    return response.ok ? { success: true, provider } : { success: false, provider, error: await response.text() };
  } catch (error) { return { success: false, provider, error: String(error) }; }
}

export async function sendDigestEmail(userId: number, subject: string, html: string): Promise<EmailDeliveryResult> {
  const settings = await getSettings(userId);
  if (!settings?.emailEnabled) return { success: true };
  const primary = settings.emailProvider as Provider;
  const first = await deliver(primary, settings, subject, html);
  if (first.success || settings.fallbackEmailProvider === "none" || settings.fallbackEmailProvider === primary) return first;
  return deliver(settings.fallbackEmailProvider as Provider, settings, subject, html);
}

export async function buildDailyDigest(userId: number) {
  const from = new Date(Date.now() - 5 * 86400000);
  const [keywords, notices] = await Promise.all([listKeywords(userId), listNotices({ from, limit: 500 })]);
  const active = keywords.filter(keyword => keyword.isActive).map(keyword => keyword.keyword.toLowerCase());
  const matched = notices.filter(notice => active.some(keyword => `${notice.title} ${notice.agency ?? ""} ${notice.itemName ?? ""}`.toLowerCase().includes(keyword)));
  const rows = matched.slice(0, 30).map(notice => `<tr><td>${notice.sourceType}</td><td>${notice.title}</td><td>${notice.agency ?? "-"}</td><td>${notice.noticeDate ? notice.noticeDate.toLocaleDateString("ko-KR") : "-"}</td><td>${notice.originalUrl ? `<a href="${notice.originalUrl}">원문 보기</a>` : "-"}</td></tr>`).join("");
  const html = `<h2>나라장터 최근 5일 키워드 매칭 공고</h2><p>등록 키워드: ${keywords.map(keyword => keyword.keyword).join(", ") || "없음"}</p><p>매칭 공고: <strong>${matched.length}건</strong></p><table border="1" cellpadding="8" cellspacing="0"><thead><tr><th>구분</th><th>공고명</th><th>기관</th><th>등록일</th><th>링크</th></tr></thead><tbody>${rows || "<tr><td colspan='5'>매칭 공고가 없습니다.</td></tr>"}</tbody></table>`;
  return { html, matchedCount: matched.length, totalCount: notices.length };
}
