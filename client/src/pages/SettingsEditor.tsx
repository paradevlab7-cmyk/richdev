import React, { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type EmailProvider = "owner" | "smtp" | "resend" | "sendgrid" | "mailgun";
type FallbackProvider = "none" | EmailProvider;
const initialForm = { dataServiceKey: "", telegramBotToken: "", telegramChatId: "", notificationEmail: "", emailEnabled: false, telegramEnabled: true, emailProvider: "owner" as EmailProvider, fallbackEmailProvider: "none" as FallbackProvider, emailFrom: "", smtpHost: "", smtpPort: 587, smtpUsername: "", smtpPassword: "", emailApiKey: "", mailgunDomain: "" };
type SettingsForm = typeof initialForm;

function savedToForm(saved: Partial<SettingsForm>): SettingsForm {
  return { ...initialForm, ...saved, emailEnabled: false, dataServiceKey: saved.dataServiceKey ?? "", telegramBotToken: saved.telegramBotToken ?? "", telegramChatId: saved.telegramChatId ?? "", notificationEmail: saved.notificationEmail ?? "", emailFrom: saved.emailFrom ?? "", smtpHost: saved.smtpHost ?? "", smtpPort: saved.smtpPort ?? 587, smtpUsername: saved.smtpUsername ?? "", smtpPassword: saved.smtpPassword ?? "", emailApiKey: saved.emailApiKey ?? "", mailgunDomain: saved.mailgunDomain ?? "" };
}

export default function SettingsEditor() {
  const utils = trpc.useUtils(); const { data: saved } = trpc.settings.get.useQuery(); const { data: runs } = trpc.collection.runs.useQuery();
  const [form, setForm] = useState<SettingsForm>(initialForm); const initialized = useRef(false);
  useEffect(() => { if (saved && !initialized.current) { setForm(savedToForm(saved as Partial<SettingsForm>)); initialized.current = true; } }, [saved]);
  const patch = (item: Partial<SettingsForm>) => { initialized.current = true; setForm(current => ({ ...current, ...item })); };
  const save = trpc.settings.save.useMutation({ onSuccess: async () => { await utils.settings.get.invalidate(); toast.success("설정을 저장했습니다. 입력값을 계속 수정할 수 있습니다."); }, onError: error => toast.error(error.message) });
  return <><div className="mb-6"><p className="text-xs font-semibold tracking-[.16em] text-primary">INTEGRATIONS</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">설정</h1><p className="mt-2 text-muted-foreground">공공데이터 인증키와 텔레그램 단일 알림을 수정·저장할 수 있습니다. 이메일 알림은 비활성화되어 있습니다.</p></div><div className="mb-4 grid gap-3 sm:grid-cols-3"><Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">공공데이터 API</p><p className="mt-2 font-medium">{saved?.dataServiceKey ? "인증키 저장됨" : "설정 필요"}</p></CardContent></Card><Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">텔레그램</p><p className="mt-2 font-medium">{saved?.telegramBotToken ? "연결 정보 저장됨" : "설정 필요"}</p></CardContent></Card><Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">최근 수집</p><p className="mt-2 font-medium">{runs?.[0]?.status === "success" ? "정상 완료" : runs?.[0]?.status === "failed" ? "실패" : "기록 없음"}</p></CardContent></Card></div><Card className="border-0 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Settings2 className="h-4 w-4 text-primary" />연동 및 알림 설정</CardTitle><p className="text-xs font-normal text-muted-foreground">저장된 값은 수정 후 다시 저장할 수 있습니다.</p></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><div className="space-y-1 md:col-span-2"><Label htmlFor="data-service-key">공공데이터 일반 인증키</Label><Input id="data-service-key" aria-label="공공데이터 일반 인증키" type="password" value={form.dataServiceKey} onChange={event => patch({ dataServiceKey: event.target.value })} /></div><div className="space-y-1"><Label htmlFor="telegram-token">텔레그램 봇 토큰</Label><Input id="telegram-token" aria-label="텔레그램 봇 토큰" type="password" value={form.telegramBotToken} onChange={event => patch({ telegramBotToken: event.target.value })} /></div><div className="space-y-1"><Label htmlFor="telegram-chat-id">텔레그램 사용자 ID</Label><Input id="telegram-chat-id" aria-label="텔레그램 사용자 ID" value={form.telegramChatId} onChange={event => patch({ telegramChatId: event.target.value })} /></div><div className="flex items-end gap-5"><label className="flex items-center gap-2 text-sm">텔레그램 알림<Switch checked={form.telegramEnabled} onCheckedChange={telegramEnabled => patch({ telegramEnabled })} /></label><Badge variant="outline" className="h-9 px-3">이메일 알림 비활성화</Badge></div><div className="flex items-center justify-between md:col-span-2"><Badge variant="outline">수정 가능</Badge><Button onClick={() => save.mutate(form)} disabled={save.isPending}><ShieldCheck className="mr-2 h-4 w-4" />{save.isPending ? "저장 중" : "설정 저장"}</Button></div></CardContent></Card></>;
}
