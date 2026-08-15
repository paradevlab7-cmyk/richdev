import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Clock3, Database, XCircle } from "lucide-react";

function formatNumber(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("ko-KR");
}

function statusMeta(status: "running" | "success" | "failed") {
  if (status === "success") return { label: "완료", icon: CheckCircle2, className: "bg-emerald-50 text-emerald-700" };
  if (status === "failed") return { label: "실패", icon: XCircle, className: "bg-red-50 text-red-700" };
  return { label: "순차 수집 중", icon: Clock3, className: "bg-amber-50 text-amber-700" };
}

export default function CollectionHistory() {
  const { data: runs = [], isLoading } = trpc.collection.runs.useQuery();

  return <DashboardLayout><div className="min-h-screen -m-4 bg-[#f6f8fb] p-5 md:p-8"><div className="mx-auto max-w-[1440px]"><div className="mb-6"><p className="text-xs font-semibold tracking-[.16em] text-primary">COLLECTION HISTORY</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">수집 이력</h1><p className="mt-2 text-muted-foreground">API 전체 결과, 실제 저장된 공고, 페이지 진행 상태를 비교합니다. 사전규격은 5페이지씩 자동으로 이어 수집합니다.</p></div><Card className="border-0 shadow-sm"><CardHeader className="flex-row items-start justify-between gap-4"><div><CardTitle className="flex items-center gap-2 text-base"><Database className="h-4 w-4 text-primary" />최근 수집 실행</CardTitle><p className="mt-1 text-xs text-muted-foreground">저장 건수는 동일 공고 갱신을 제외한 현재 기간 내 DB 보유 건수입니다.</p></div><Badge variant="outline">최근 10회</Badge></CardHeader><CardContent className="space-y-4">{isLoading && <p className="py-8 text-center text-sm text-muted-foreground">수집 이력을 불러오는 중입니다.</p>}{!isLoading && !runs.length && <p className="py-8 text-center text-sm text-muted-foreground">아직 수집 이력이 없습니다.</p>}{runs.map(run => { const status = statusMeta(run.status); const StatusIcon = status.icon; const total = Number(run.totalAvailable ?? 0); const stored = Number(run.storedCount ?? 0); const fetched = Number(run.fetchedCount ?? 0); const progress = total ? Math.min(100, Math.round(fetched / total * 100)) : 0; return <div key={run.id} className="rounded-xl border bg-background p-4"><div className="flex flex-col justify-between gap-3 md:flex-row md:items-center"><div className="flex items-center gap-3"><Badge variant="secondary" className="capitalize">{run.sourceType}</Badge><Badge className={status.className}><StatusIcon className="mr-1 h-3.5 w-3.5" />{status.label}</Badge>{run.isBackground && <Badge variant="outline">백그라운드</Badge>}</div><p className="text-xs text-muted-foreground">{new Date(run.startedAt).toLocaleString("ko-KR")}</p></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-xs text-muted-foreground">API 전체 건수</p><p className="mt-1 text-lg font-semibold">{total ? `${formatNumber(total)}건` : "미확인"}</p></div><div><p className="text-xs text-muted-foreground">실제 저장 건수</p><p className="mt-1 text-lg font-semibold">{stored ? `${formatNumber(stored)}건` : "집계 중"}</p></div><div><p className="text-xs text-muted-foreground">수집 페이지</p><p className="mt-1 text-lg font-semibold">{run.currentPage || 0} / {run.totalPages || "-"}</p></div><div><p className="text-xs text-muted-foreground">이번 실행 수집</p><p className="mt-1 text-lg font-semibold">{formatNumber(fetched)}건</p></div></div>{total > 0 && <div className="mt-4"><div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>진행률</span><span>{progress}% · 수집 {formatNumber(fetched)} / {formatNumber(total)}</span></div><Progress value={progress} /></div>}{run.errorMessage && <p className="mt-3 rounded-md bg-red-50 p-3 text-xs text-red-700">{run.errorMessage}</p>}</div>; })}</CardContent></Card></div></div></DashboardLayout>;
}
