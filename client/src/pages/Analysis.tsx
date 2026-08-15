import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { BarChart3, Calculator } from "lucide-react";
import { useState } from "react";

export default function Analysis() {
  const [agency, setAgency] = useState("");
  const [itemName, setItemName] = useState("");
  const [baseAmount, setBaseAmount] = useState("");
  const [submitted, setSubmitted] = useState<{ agency?: string; itemName?: string; baseAmount: number } | null>(null);
  const result = trpc.analysis.estimate.useQuery(submitted ?? { baseAmount: 1 }, { enabled: Boolean(submitted) });
  const submit = () => { const amount = Number(baseAmount.replace(/,/g, "")); if (Number.isFinite(amount) && amount > 0) setSubmitted({ agency: agency.trim() || undefined, itemName: itemName.trim() || undefined, baseAmount: amount }); };

  return <DashboardLayout><div className="min-h-screen -m-4 bg-[#f6f8fb] p-5 md:p-8"><div className="mx-auto max-w-4xl"><div className="mb-6"><p className="text-xs font-semibold tracking-[.16em] text-primary">BID ANALYSIS</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">예상 투찰가 분석</h1><p className="mt-2 text-muted-foreground">동일 기관·품목의 축적된 낙찰 이력을 바탕으로 낙찰률 분포와 참고 범위를 계산합니다.</p></div><Card className="border-0 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Calculator className="h-4 w-4 text-primary" />분석 조건</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><div className="space-y-1"><Label>기관명</Label><Input value={agency} onChange={event => setAgency(event.target.value)} placeholder="예: 조달청" /></div><div className="space-y-1"><Label>품목·공고 키워드</Label><Input value={itemName} onChange={event => setItemName(event.target.value)} placeholder="예: 전산장비" /></div><div className="space-y-1 md:col-span-2"><Label>기초금액(원)</Label><Input inputMode="numeric" value={baseAmount} onChange={event => setBaseAmount(event.target.value)} placeholder="예: 100000000" onKeyDown={event => event.key === "Enter" && submit()} /></div><div className="flex justify-end md:col-span-2"><Button onClick={submit}><BarChart3 className="mr-2 h-4 w-4" />분석 실행</Button></div></CardContent></Card>{submitted && <Card className="mt-5 border-0 shadow-sm"><CardHeader><CardTitle className="text-base">분석 결과</CardTitle></CardHeader><CardContent>{result.isLoading ? <p className="text-sm text-muted-foreground">낙찰 이력을 분석하는 중입니다.</p> : result.data?.sampleSize ? <div className="grid gap-4 sm:grid-cols-4"><div><p className="text-xs text-muted-foreground">표본 수</p><p className="mt-1 text-2xl font-semibold">{result.data.sampleSize}건</p></div><div><p className="text-xs text-muted-foreground">중앙 낙찰률</p><p className="mt-1 text-2xl font-semibold">{result.data.medianRate?.toFixed(2)}%</p></div><div><p className="text-xs text-muted-foreground">예상 투찰가</p><p className="mt-1 text-2xl font-semibold">{result.data.expectedBid?.toLocaleString()}원</p></div><div><p className="text-xs text-muted-foreground">참고 범위</p><p className="mt-1 text-lg font-semibold">{result.data.minBid?.toLocaleString()}~{result.data.maxBid?.toLocaleString()}원</p></div></div> : <p className="text-sm text-muted-foreground">{result.data?.message || "조건에 맞는 과거 낙찰 데이터가 없습니다. 낙찰정보 수집 후 다시 시도하세요."}</p>}<p className="mt-5 border-t pt-4 text-xs leading-5 text-muted-foreground">이 결과는 축적된 공개 낙찰 데이터의 통계적 참고값이며, 시장·원가·경쟁 상황을 반영한 실제 투찰 의사결정이나 수익을 보장하지 않습니다.</p></CardContent></Card>}</div></div></DashboardLayout>;
}
