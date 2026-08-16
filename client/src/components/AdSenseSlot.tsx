import React, { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { EyeOff, Gem, X, Check } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { useTheme } from "@/contexts/ThemeContext";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>> & { push: (value: Record<string, unknown>) => number };
  }
}

const ADSENSE_SCRIPT_SRC = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6489916860904302";
const ADSENSE_CLIENT = "ca-pub-6489916860904302";
const ADSENSE_SLOT = "8957289425";
const HIDDEN_KEY = "g2b-ads-hidden";
const PREMIUM_KEY = "g2b-premium-mode";
const SETTINGS_EVENT = "g2b-ads-settings-change";
type AdPlacement = "inline" | "detail" | "sidebar";

function readFlag(key: string) { return typeof window !== "undefined" && window.localStorage.getItem(key) === "true"; }
function writeFlag(key: string, value: boolean) { window.localStorage.setItem(key, String(value)); window.dispatchEvent(new Event(SETTINGS_EVENT)); }

export function AdSenseSettingsToggle() {
  const [hidden, setHidden] = useState(() => readFlag(HIDDEN_KEY));
  const [premium, setPremium] = useState(() => readFlag(PREMIUM_KEY));
  const [benefitsOpen, setBenefitsOpen] = useState(false);
  const { premiumTheme, togglePremiumTheme } = useTheme();
  useEffect(() => {
    const sync = () => { setHidden(readFlag(HIDDEN_KEY)); setPremium(readFlag(PREMIUM_KEY)); };
    window.addEventListener(SETTINGS_EVENT, sync); window.addEventListener("storage", sync);
    return () => { window.removeEventListener(SETTINGS_EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  return <div className="mt-3 space-y-2 rounded-lg border border-border/60 bg-background/70 p-2 text-xs group-data-[collapsible=icon]:hidden">
    <p className="px-1 font-medium text-foreground">광고 표시 설정</p>
    <button type="button" onClick={() => setBenefitsOpen(true)} aria-label="프리미엄 모드 혜택 보기" className={`w-full rounded-lg border p-2 text-left transition-all ${premium ? "border-amber-400/70 bg-gradient-to-r from-amber-100/80 to-violet-100/80 text-amber-950 shadow-sm dark:from-amber-950/50 dark:to-violet-950/50 dark:text-amber-100" : "border-primary/25 bg-gradient-to-r from-primary/10 to-violet-500/10 hover:border-primary/50"}`}>
      <span className="flex items-center gap-2 font-semibold"><Gem className={`h-4 w-4 ${premium ? "text-amber-600" : "text-primary"}`} />프리미엄 모드 <span className="ml-auto text-[10px] uppercase tracking-wider">{premium ? "ON" : "혜택"}</span></span>
      <span className="mt-1 block text-[11px] text-muted-foreground">고급 필터 · 테마 · 광고 제거</span>
    </button>
    <Dialog open={benefitsOpen} onOpenChange={setBenefitsOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Gem className="h-5 w-5 text-amber-500" />프리미엄 모드 혜택</DialogTitle><DialogDescription>광고 없이 더 집중해서 나라장터 데이터를 관리할 수 있습니다.</DialogDescription></DialogHeader>
        <div className="space-y-3 py-2 text-sm">{["광고 없는 집중형 화면", "통합 검색의 고급 필터", "프리미엄 골드 테마", "검색 조건과 화면 설정 유지"].map(item => <div key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" />{item}</div>)}</div>
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 text-sm"><span>프리미엄 골드 테마</span><Button variant={premiumTheme ? "default" : "outline"} size="sm" onClick={togglePremiumTheme}>{premiumTheme ? "사용 중" : "적용"}</Button></div>
        <Button className="w-full" onClick={() => { const next = !premium; setPremium(next); writeFlag(PREMIUM_KEY, next); setBenefitsOpen(false); }}>{premium ? "프리미엄 모드 끄기" : "프리미엄 모드 활성화"}</Button>
      </DialogContent>
    </Dialog>
    <button type="button" onClick={() => { setHidden(!hidden); writeFlag(HIDDEN_KEY, !hidden); }} className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left text-muted-foreground hover:bg-accent hover:text-foreground">{hidden ? <EyeOff className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}{hidden ? "광고 다시 표시" : "광고 숨기기"}</button>
  </div>;
}

export default function AdSenseSlot({ placement = "inline" }: { placement?: AdPlacement }) {
  const adRef = useRef<HTMLModElement>(null);
  const [closing, setClosing] = useState(false);
  const [hidden, setHidden] = useState(() => readFlag(HIDDEN_KEY));
  const [premium, setPremium] = useState(() => readFlag(PREMIUM_KEY));
  const [loaded, setLoaded] = useState(false);
  const adsDisabled = hidden || premium;
  useEffect(() => { const sync = () => { setHidden(readFlag(HIDDEN_KEY)); setPremium(readFlag(PREMIUM_KEY)); }; window.addEventListener(SETTINGS_EVENT, sync); window.addEventListener("storage", sync); return () => { window.removeEventListener(SETTINGS_EVENT, sync); window.removeEventListener("storage", sync); }; }, []);
  useEffect(() => {
    if (adsDisabled) return;
    const pushAd = () => { try { window.adsbygoogle = window.adsbygoogle || Object.assign([], { push: () => 0 }); window.adsbygoogle.push({}); } catch { /* AdSense may be unavailable while the site is under review. */ } finally { setLoaded(true); } };
    let script = document.querySelector<HTMLScriptElement>(`script[src="${ADSENSE_SCRIPT_SRC}"]`);
    if (!script) { script = document.createElement("script"); script.async = true; script.src = ADSENSE_SCRIPT_SRC; script.crossOrigin = "anonymous"; document.head.appendChild(script); }
    if (script.dataset.loaded === "true") pushAd(); else script.addEventListener("load", () => { script?.setAttribute("data-loaded", "true"); pushAd(); }, { once: true });
  }, [adsDisabled]);
  const placementClass = placement === "sidebar" ? "my-2 min-h-[120px] rounded-lg px-1 py-1" : placement === "detail" ? "my-5 min-h-[105px] rounded-xl px-2 py-2 sm:min-h-[120px] sm:px-4" : "my-4 min-h-[90px] rounded-xl px-2 py-2 sm:min-h-[110px] sm:px-4";
  if (adsDisabled) return null;
  return <section aria-label="광고" className={`relative w-full overflow-hidden border border-border/50 bg-muted/20 transition-all duration-200 ease-out ${closing ? "my-0 max-h-0 min-h-0 scale-y-0 border-0 py-0 opacity-0" : "max-h-64 opacity-100"} ${placementClass}`}>
    {!loaded && <div aria-label="광고 로딩 중" className="pointer-events-none absolute inset-2 animate-pulse rounded-lg bg-gradient-to-r from-muted/30 via-muted/60 to-muted/30" />}
    <div className="absolute right-2 top-2 z-10"><Button type="button" variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-background/80 text-muted-foreground shadow-sm hover:bg-background hover:text-foreground" aria-label="광고 숨기기" onClick={() => { setClosing(true); window.setTimeout(() => writeFlag(HIDDEN_KEY, true), 220); }}><X className="h-3.5 w-3.5" /></Button></div>
    <ins ref={adRef} className="adsbygoogle relative z-[1] block min-h-[74px] w-full" style={{ display: "block" }} data-ad-client={ADSENSE_CLIENT} data-ad-slot={ADSENSE_SLOT} data-ad-format="auto" data-full-width-responsive="true" />
  </section>;
}
