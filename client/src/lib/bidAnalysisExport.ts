import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import type { BidScenario } from "./bidScenario";

export type BidTrendPoint = { date: string; averageRate: number; count: number };

export function buildBidAnalysisExportData(input: { agency?: string; itemName?: string; baseAmount: number; totalCost: number; targetMarginRate: number; commissionRate: number; trendDays: number; scenarios: BidScenario[]; trend: BidTrendPoint[] }) {
  const summary = [{ 항목: "기관", 값: input.agency || "전체 기관" }, { 항목: "품목·공고 키워드", 값: input.itemName || "전체 품목" }, { 항목: "기초금액", 값: input.baseAmount }, { 항목: "총원가", 값: input.totalCost }, { 항목: "목표 마진율(%)", 값: input.targetMarginRate }, { 항목: "수수료율(%)", 값: input.commissionRate }, { 항목: "추세 조회 기간(일)", 값: input.trendDays }, { 항목: "생성 시각", 값: new Date().toLocaleString("ko-KR") }];
  const scenarios = input.scenarios.map((row, index) => ({ 번호: index + 1, 시나리오: row.name, 근거: row.source, 투찰가: row.price, 낙찰률: row.rate ?? "", 예상수수료: row.commissionFee, 예상이익금: row.expectedProfit ?? "", 마진율: row.marginRate ?? "", 설명: row.note }));
  const trend = input.trend.map(row => ({ 날짜: row.date, 평균낙찰률: row.averageRate, 표본수: row.count }));
  return { summary, scenarios, trend };
}

export function exportBidAnalysisToExcel(input: Parameters<typeof buildBidAnalysisExportData>[0], fileName = "투찰가_시나리오_분석") {
  const data = buildBidAnalysisExportData(input); const workbook = XLSX.utils.book_new();
  const summarySheet = XLSX.utils.json_to_sheet(data.summary); summarySheet["!cols"] = [{ wch: 24 }, { wch: 30 }];
  const scenarioSheet = XLSX.utils.json_to_sheet(data.scenarios); scenarioSheet["!cols"] = [{ wch: 8 }, { wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 24 }];
  const trendSheet = XLSX.utils.json_to_sheet(data.trend); trendSheet["!cols"] = [{ wch: 16 }, { wch: 16 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "분석 요약"); XLSX.utils.book_append_sheet(workbook, scenarioSheet, "시나리오 비교"); XLSX.utils.book_append_sheet(workbook, trendSheet, "낙찰률 추세"); XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

export async function exportBidAnalysisToPdf(elementId: string, fileName = "투찰가_시나리오_분석") {
  const target = document.getElementById(elementId); if (!target) return false;
  const canvas = await html2canvas(target, { backgroundColor: document.documentElement.classList.contains("dark") ? "#0f172a" : "#f7f9fc", scale: 2, useCORS: true });
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" }); const pageWidth = pdf.internal.pageSize.getWidth() - 48; const pageHeight = pdf.internal.pageSize.getHeight() - 48; const imageHeight = canvas.height * pageWidth / canvas.width;
  const ratio = Math.min(1, pageHeight / imageHeight); const renderWidth = pageWidth * ratio; const renderHeight = imageHeight * ratio; pdf.addImage(canvas.toDataURL("image/png"), "PNG", 24, 24, renderWidth, renderHeight); pdf.save(`${fileName}.pdf`); return true;
}
