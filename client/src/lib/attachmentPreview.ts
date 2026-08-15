import type { NoticeAttachment } from "./noticeMetadata";

export type AttachmentKind = "pdf" | "hwp" | "word" | "spreadsheet" | "presentation" | "image" | "archive" | "text" | "other";

export function getAttachmentExtension(attachment: NoticeAttachment) {
  const source = attachment.fileName || attachment.name || attachment.url.split("?")[0] || "";
  return source.split(".").pop()?.toLowerCase() ?? "";
}

export function getAttachmentKind(attachment: NoticeAttachment): AttachmentKind {
  const extension = getAttachmentExtension(attachment);
  if (extension === "pdf") return "pdf";
  if (["hwp", "hwpx"].includes(extension)) return "hwp";
  if (["doc", "docx", "odt"].includes(extension)) return "word";
  if (["xls", "xlsx", "csv", "ods"].includes(extension)) return "spreadsheet";
  if (["ppt", "pptx", "odp"].includes(extension)) return "presentation";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension)) return "image";
  if (["zip", "rar", "7z", "tar", "gz"].includes(extension)) return "archive";
  if (["txt", "md", "json", "xml", "html"].includes(extension)) return "text";
  return "other";
}

export function supportsInlinePreview(attachment: NoticeAttachment) { return ["pdf", "image"].includes(getAttachmentKind(attachment)); }
export function attachmentPreviewMessage(attachment: NoticeAttachment) { return supportsInlinePreview(attachment) ? "브라우저에서 미리보기를 열 수 있습니다." : `${getAttachmentExtension(attachment).toUpperCase() || "이"} 파일은 브라우저 미리보기를 지원하지 않습니다. 다운로드 후 전용 프로그램에서 열어주세요.`; }
