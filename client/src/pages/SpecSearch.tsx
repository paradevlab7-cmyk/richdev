import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { createSearchQuery, toggleKeywordSelection } from "@/lib/keywordSearch";
import { toDateInput } from "@/lib/searchPeriod";
import { filterAndSortSpecRows, getSpecStatus, type SpecSort, type SpecStatus } from "@/lib/specFilters";
import { appendUniqueById } from "@/lib/pageResults";
import { Bookmark, CalendarDays, ChevronDown, Clock3, Search, SlidersHorizontal } from "lucide-react";

const statusLabels: Record<SpecStatus, string> = { all: "전체 상태", active: "진행 중", closing: "마감 임박", closed: "마감", unknown: "일정 미확인" };
const statusStyles: Record<Exclude<SpecStatus, "all">, string> = { active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300", closing: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300", closed: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300", unknown: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" };

function SpecSkeletonRows() {
  return <div className="space-y-3 border-t p-4" aria-label="추가 공고를 불러오는 중">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="grid grid-cols-[120px_1fr_132px] items-center gap-4"><Skeleton className="h-7 w-20" /><div className="space-y-2"><Skeleton className="h-4 w-4/5" /><Skeleton className="h-3 w-2/5" /></div><Skeleton className="h-7 w-24 justify-self-end" /></div>)}</div>;
}

export default function SpecSearch() {
  const [location, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const initialFrom = params.get("from") ?? toDateInput(15);
  const initialTo = params.get("to") ?? toDateInput();
  const initialKeywords = params.getAll("kw");
  const [q, setQ] = useState(() => params.get("q") ?? "");
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [selectedKeywords, setSelectedKeywords] = useState(initialKeywords);
  const [submitted, setSubmitted] = useState({ q: params.get("q") ?? "", from: initialFrom, to: initialTo, keywords: initialKeywords });
  const [status, setStatus] = useState<SpecStatus>("all");
  const [sort, setSort] = useState<SpecSort>("latest");
  const [page, setPage] = useState(0);
  const [loadedRows, setLoadedRows] = useState<any[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { data: keywords = [] } = trpc.keywords.list.useQuery();
  const { data: pageRows, isLoading, isFetching } = trpc.notices.list.useQuery({ sourceType: "spec", q: submitted.q || undefined, keywords: submitted.keywords.length ? submitted.keywords : undefined, from: submitted.from, to: submitted.to, limit: 25, offset: page * 25 });
  const { data: saved = [] } = trpc.saved.list.useQuery();
  const utils = trpc.useUtils();
  const [localSaved, setLocalSaved] = useState<Record<number, boolean>>({});
  const bookmark = trpc.saved.toggle.useMutation({ onSuccess: () => { utils.saved.list.invalidate(); utils.notices.stats.invalidate(); } });
  useEffect(() => { if (pageRows && !isFetching) { setLoadedRows(current => page === 0 ? pageRows : appendUniqueById(current, pageRows)); setIsLoadingMore(false); } }, [page, pageRows, isFetching]);
  const rows = useMemo(() => filterAndSortSpecRows(loadedRows, status, sort), [loadedRows, status, sort]);
  const runSearch = (nextKeywords = selectedKeywords) => { const normalized = q.trim(); setSelectedKeywords(nextKeywords); setLoadedRows([]); setPage(0); setIsLoadingMore(false); setSubmitted({ q: normalized, from, to, keywords: nextKeywords }); window.history.replaceState(null, "", `${location}?${createSearchQuery(normalized, nextKeywords, from, to)}`); };
  const loadMore = () => { if (!isFetching && pageRows?.length === 25) { setIsLoadingMore(true); setPage(current => current + 1); } };
  const isSaved = (id: number) => localSaved[id] ?? saved.some(item => item.notice.id === id);
  const toggleSaved = (id: number) => { const before = isSaved(id); setLocalSaved(current => ({ ...current, [id]: !before })); bookmark.mutate({ noticeId: id }, { onError: () => setLocalSaved(current => ({ ...current, [id]: before })) }); };
  return <DashboardLayout><div className="min-h-screen -m-3 bg-background p-3 sm:-m-5 sm:p-5 lg:-m-6 lg:p-6"><div className="mx-auto max-w-[1440px]"><div className="mb-6"><p className="text-xs font-semibold tracking-[.16em] text-primary">PRE-SPECIFICATION</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">사전규격공고</h1><p className="mt-2 text-muted-foreground">날짜, 등록 키워드, 일정 상태와 정렬 기준을 조합해 수집된 사전규격 정보를 빠르게 선별합니다.</p></div><Card className="app-surface mb-5 border-0"><CardContent className="p-4 sm:p-5"><div className="grid gap-3 lg:grid-cols-[1fr_170px_170px_auto]"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={q} onChange={event => setQ(event.target.value)} onKeyDown={event => event.key === "Enter" && runSearch()} placeholder="공고명·품목·기관 키워드" /></div><Input type="date" value={from} onChange={event => setFrom(event.target.value)} /><Input type="date" value={to} onChange={event => setTo(event.target.value)} /><Button onClick={() => runSearch()}><Search className="mr-2 h-4 w-4" />검색</Button></div><div className="mt-4 grid gap-3 border-t pt-4 md:grid-cols-2"><div className="space-y-1"><label className="flex items-center gap-1.5 text-xs text-muted-foreground"><SlidersHorizontal className="h-3.5 w-3.5" />일정 상태</label><select aria-label="사전규격 일정 상태" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={status} onChange={event => setStatus(event.target.value as SpecStatus)}><option value="all">전체 상태</option><option value="active">진행 중</option><option value="closing">마감 임박 (3일)</option><option value="closed">마감</option><option value="unknown">일정 미확인</option></select></div><div className="space-y-1"><label className="flex items-center gap-1.5 text-xs text-muted-foreground"><ChevronDown className="h-3.5 w-3.5" />정렬 기준</label><select aria-label="사전규격 정렬 기준" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={sort} onChange={event => setSort(event.target.value as SpecSort)}><option value="latest">등록일 최신순</option><option value="oldest">등록일 오래된순</option><option value="deadline">마감일 임박순</option><option value="amount">예산 높은순</option><option value="title">공고명 가나다순</option></select></div></div>{keywords.length > 0 && <div className="mt-4 border-t pt-4"><p className="mb-2 text-xs text-muted-foreground">등록 키워드 <span className="text-primary">복수 선택은 OR 검색 · 다시 누르면 해제</span></p><div className="flex flex-wrap gap-2">{keywords.map(keyword => { const active = selectedKeywords.includes(keyword.keyword); return <button key={keyword.id} onClick={() => runSearch(toggleKeywordSelection(selectedKeywords, keyword.keyword))} className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "bg-background text-muted-foreground hover:border-primary hover:bg-primary/5 hover:text-primary"}`}>{keyword.keyword}</button>; })}</div></div>}</CardContent></Card><Card className="app-surface border-0"><CardHeader className="flex-row items-center justify-between"><div><CardTitle className="text-base">선별 결과</CardTitle><p className="mt-1 text-xs text-muted-foreground">{isLoading && page === 0 ? "조회 중" : `${rows.length}건 · ${page + 1}페이지 표시`}</p></div><Badge variant="outline">사전규격</Badge></CardHeader><CardContent className="overflow-x-auto p-0"><table className="w-full min-w-[860px] text-sm"><thead className="bg-muted/40 text-muted-foreground"><tr><th className="p-4 text-left">상태</th><th className="p-4 text-left">공고명</th><th className="p-4 text-left">기관</th><th className="p-4 text-left">등록일</th><th className="p-4 text-left">마감일</th><th className="p-4 text-right">예산</th><th className="p-4" /></tr></thead><tbody>{rows.map(row => { const rowStatus = getSpecStatus(row); const savedNow = isSaved(row.id); return <tr key={row.id} className="data-grid-row hover:bg-muted/30"><td className="p-4"><Badge className={statusStyles[rowStatus]}>{statusLabels[rowStatus]}</Badge></td><td className="p-4"><button className="text-left" onClick={() => navigate(`/notice/${row.id}`)}><p className="font-medium hover:text-primary hover:underline">{row.title}</p><p className="text-xs text-muted-foreground">{row.noticeId}</p></button></td><td className="p-4 text-muted-foreground">{row.agency && row.agency !== "undefined" ? row.agency : "-"}</td><td className="p-4 text-muted-foreground">{row.noticeDate ? new Date(row.noticeDate).toLocaleDateString("ko-KR") : "-"}</td><td className="p-4 text-muted-foreground">{row.deadline ? new Date(row.deadline).toLocaleDateString("ko-KR") : "일정 미확인"}</td><td className="p-4 text-right">{row.baseAmount ? `${Number(row.baseAmount).toLocaleString()}원` : "-"}</td><td className="p-4"><Button aria-label={savedNow ? "관심공고 해제" : "관심공고 저장"} variant="ghost" size="icon" className={savedNow ? "bg-red-50 text-red-500 dark:bg-red-950/40" : "text-muted-foreground"} onClick={() => toggleSaved(row.id)}><Bookmark className={savedNow ? "h-4 w-4 fill-current" : "h-4 w-4"} /></Button></td></tr>; })}{!isLoading && !rows.length && <tr><td colSpan={7} className="p-12 text-center text-muted-foreground"><CalendarDays className="mx-auto mb-3 h-8 w-8 opacity-40" />조건에 맞는 사전규격 공고가 없습니다.</td></tr>}</tbody></table>{(isLoadingMore || (page > 0 && isFetching)) && <SpecSkeletonRows />}{pageRows?.length === 25 && !isFetching && <div className="border-t bg-muted/15 p-4 text-center"><Button variant="outline" onClick={loadMore}><Clock3 className="mr-2 h-4 w-4" />더 보기 · 25건</Button></div>}</CardContent></Card></div></div></DashboardLayout>;
}
