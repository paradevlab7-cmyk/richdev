export type NoticeAttachment = { name?: string; url: string; fileName?: string; sizeBytes?: number | string; contentType?: string };

function rawRecord(value: string | null | undefined): Record<string, unknown> { try { const parsed = JSON.parse(value ?? "{}"); return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {}; } catch { return {}; } }
function firstText(raw: Record<string, unknown>, keys: string[]) { const value = keys.map(key => raw[key]).find(value => value !== undefined && value !== null && String(value).trim() && String(value) !== "undefined"); return value === undefined ? undefined : String(value); }

export function getBidContact(rawJson: string | null | undefined) { const raw = rawRecord(rawJson); return { name: firstText(raw, ["ntceInsttOfclNm", "dmndInsttOfclNm", "ofclNm"]), phone: firstText(raw, ["ntceInsttOfclTel", "dmndInsttOfclTel", "ofclTelNo"]) }; }

export function formatFileSize(value: number | string | null | undefined) {
  const bytes = Number(value); if (!Number.isFinite(bytes) || bytes < 0) return "원문 용량 미제공";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
  return `${(bytes / (1024 ** 2)).toFixed(bytes < 10 * 1024 ** 2 ? 1 : 0)} MB`;
}

export function attachmentDisplayName(attachment: NoticeAttachment, index: number) {
  const specSequence = attachment.name?.match(/^specDocFileUrl(\d+)$/i)?.[1];
  return attachment.fileName || (specSequence ? `사전규격 첨부자료 ${specSequence}` : attachment.name || `첨부자료 ${index + 1}`);
}
