import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

export type ExportableNotice = {
  title: string;
  noticeId: string;
  sourceType: string;
  agency?: string | null;
  noticeDate?: Date | string | number | null;
  baseAmount?: number | string | null;
  awardAmount?: number | string | null;
  originalUrl?: string | null;
};

const formatDate = (value: ExportableNotice["noticeDate"]) => value ? new Date(value).toLocaleDateString("ko-KR") : "";

export function exportNoticesToExcel(records: ExportableNotice[], fileName: string) {
  const rows = records.map((notice, index) => ({
    번호: index + 1,
    구분: notice.sourceType,
    공고명: notice.title,
    공고번호: notice.noticeId,
    기관: notice.agency && notice.agency !== "undefined" ? notice.agency : "",
    등록일: formatDate(notice.noticeDate),
    기초금액: notice.baseAmount ? Number(notice.baseAmount) : "",
    낙찰금액: notice.awardAmount ? Number(notice.awardAmount) : "",
    원문링크: notice.originalUrl ?? "",
  }));
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet["!cols"] = [{ wch: 8 }, { wch: 14 }, { wch: 46 }, { wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 56 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "나라장터 공고");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

export async function exportElementToImage(elementId: string, fileName: string) {
  const target = document.getElementById(elementId);
  if (!target) return;
  const canvas = await html2canvas(target, { backgroundColor: document.documentElement.classList.contains("dark") ? "#202833" : "#f7f9fc", scale: 2 });
  const link = document.createElement("a");
  link.download = `${fileName}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
