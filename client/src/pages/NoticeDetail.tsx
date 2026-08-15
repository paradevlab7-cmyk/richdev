import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { useLocation, useRoute } from "wouter";

function toAttachments(value: string | null) {
  if (!value) return [] as { name: string; url: string }[];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(item => item?.url) : [];
  } catch {
    return [];
  }
}

export default function NoticeDetail() {
  const [, params] = useRoute("/notice/:id");
  const [, navigate] = useLocation();
  const noticeId = Number(params?.id);
  const { data, isLoading } = trpc.notices.detail.useQuery({ id: noticeId }, { enabled: Number.isInteger(noticeId) });
  const attachments = toAttachments(data?.attachmentsJson ?? null);

  return <DashboardLayout><div className="min-h-screen -m-4 bg-[#f6f8fb] p-5 md:p-8"><div className="mx-auto max-w-5xl"><Button variant="ghost" className="mb-5" onClick={() => navigate("/")}><ArrowLeft className="mr-2 h-4 w-4" />검색으로 돌아가기</Button>{isLoading ? <Card className="border-0 shadow-sm"><CardContent className="p-8 text-muted-foreground">공고 정보를 불러오는 중입니다.</CardContent></Card> : !data ? <Card className="border-0 shadow-sm"><CardContent className="p-8 text-muted-foreground">공고를 찾을 수 없습니다.</CardContent></Card> : <><div className="mb-6"><Badge>{data.sourceType}</Badge><h1 className="mt-3 text-3xl font-semibold tracking-tight">{data.title}</h1><p className="mt-2 text-muted-foreground">{data.agency || "기관 정보 없음"}</p></div><div className="grid gap-5 md:grid-cols-2"><Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-base">공고 정보</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex justify-between gap-5"><span className="text-muted-foreground">공고번호</span><span>{data.noticeId}</span></div><div className="flex justify-between gap-5"><span className="text-muted-foreground">등록일</span><span>{data.noticeDate ? new Date(data.noticeDate).toLocaleDateString("ko-KR") : "-"}</span></div><div className="flex justify-between gap-5"><span className="text-muted-foreground">마감일</span><span>{data.deadline ? new Date(data.deadline).toLocaleString("ko-KR") : "-"}</span></div><div className="flex justify-between gap-5"><span className="text-muted-foreground">금액</span><span>{data.awardAmount || data.baseAmount ? `${Number(data.awardAmount || data.baseAmount).toLocaleString()}원` : "-"}</span></div></CardContent></Card><Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-base">외부 자료</CardTitle></CardHeader><CardContent className="space-y-3">{data.originalUrl ? <a href={data.originalUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline"><ExternalLink className="h-4 w-4" />나라장터 원문 보기</a> : <p className="text-sm text-muted-foreground">원문 링크가 제공되지 않았습니다.</p>}{attachments.map((attachment, index) => <a key={`${attachment.url}-${index}`} href={attachment.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline"><FileText className="h-4 w-4" />{attachment.name || `첨부자료 ${index + 1}`}</a>)}{!attachments.length && <p className="text-sm text-muted-foreground">첨부자료 링크가 제공되지 않았습니다.</p>}</CardContent></Card></div><Card className="mt-5 border-0 shadow-sm"><CardHeader><CardTitle className="text-base">원본 데이터</CardTitle></CardHeader><CardContent><pre className="max-h-96 overflow-auto rounded-md bg-muted p-4 text-xs leading-5">{data.rawJson}</pre></CardContent></Card></>}</div></div></DashboardLayout>;
}
