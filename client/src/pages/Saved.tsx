import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Bookmark, ExternalLink, Trash2 } from "lucide-react";

const statusLabels = {
  watching: "관심",
  reviewing: "검토 중",
  submitted: "투찰 완료",
  closed: "종료",
} as const;

type SavedStatus = keyof typeof statusLabels;

export default function Saved() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.saved.list.useQuery();
  const update = trpc.saved.update.useMutation({
    onSuccess: () => utils.saved.list.invalidate(),
  });
  const remove = trpc.saved.toggle.useMutation({
    onSuccess: () => utils.saved.list.invalidate(),
  });

  return (
    <DashboardLayout>
      <div className="min-h-screen -m-4 bg-[#f6f8fb] p-5 md:p-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-6">
            <p className="text-xs font-semibold tracking-[.16em] text-primary">WATCHLIST</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">관심공고</h1>
            <p className="mt-2 text-muted-foreground">
              검색 결과에서 저장한 공고를 상태, 메모, 원문 링크와 함께 관리합니다.
            </p>
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base">저장한 공고</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isLoading ? "조회 중" : `${data?.length ?? 0}건`}
                </p>
              </div>
              <Badge variant="outline">개인 관리 목록</Badge>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="p-4 text-left">공고</th>
                    <th className="p-4 text-left">기관</th>
                    <th className="p-4 text-left">상태</th>
                    <th className="p-4 text-left">메모</th>
                    <th className="p-4" />
                  </tr>
                </thead>
                <tbody>
                  {data?.map(item => (
                    <tr key={item.saved.id} className="border-t align-top">
                      <td className="p-4">
                        <p className="font-medium">{item.notice.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.notice.noticeId}
                          {item.notice.noticeDate
                            ? ` · ${new Date(item.notice.noticeDate).toLocaleDateString("ko-KR")}`
                            : ""}
                        </p>
                      </td>
                      <td className="p-4 text-muted-foreground">{item.notice.agency || "-"}</td>
                      <td className="p-4">
                        <select
                          aria-label="관심공고 상태"
                          className="h-9 rounded-md border bg-background px-2 text-sm"
                          defaultValue={item.saved.status}
                          onChange={event =>
                            update.mutate({ id: item.saved.id, status: event.target.value as SavedStatus })
                          }
                        >
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4">
                        <Input
                          aria-label="관심공고 메모"
                          className="min-w-56"
                          defaultValue={item.saved.memo || ""}
                          placeholder="검토 메모를 입력하세요"
                          onBlur={event => update.mutate({ id: item.saved.id, memo: event.target.value })}
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          {item.notice.originalUrl && (
                            <a
                              aria-label="원문 보기"
                              href={item.notice.originalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          <Button
                            aria-label="관심공고 해제"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove.mutate({ noticeId: item.notice.id })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!isLoading && !data?.length && (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-muted-foreground">
                        <Bookmark className="mx-auto mb-3 h-8 w-8 opacity-40" />
                        검색 결과에서 북마크를 선택하면 이 목록에서 관리할 수 있습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
