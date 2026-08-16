import React, { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { EyeOff, Gem, X } from "lucide-react";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>> & {
      push: (value: Record<string, unknown>) => number;
    };
  }
}

const ADSENSE_SCRIPT_SRC =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6489916860904302";
const ADSENSE_CLIENT = "ca-pub-6489916860904302";
const ADSENSE_SLOT = "8957289425";
const HIDDEN_KEY = "g2b-ads-hidden";
const PREMIUM_KEY = "g2b-premium-mode";
const SETTINGS_EVENT = "g2b-ads-settings-change";

type AdPlacement = "inline" | "detail" | "sidebar";

function readFlag(key: string) {
  return typeof window !== "undefined" && window.localStorage.getItem(key) === "true";
}

function writeFlag(key: string, value: boolean) {
  window.localStorage.setItem(key, String(value));
  window.dispatchEvent(new Event(SETTINGS_EVENT));
}

export function AdSenseSettingsToggle() {
  const [hidden, setHidden] = useState(() => readFlag(HIDDEN_KEY));
  const [premium, setPremium] = useState(() => readFlag(PREMIUM_KEY));

  useEffect(() => {
    const sync = () => {
      setHidden(readFlag(HIDDEN_KEY));
      setPremium(readFlag(PREMIUM_KEY));
    };
    window.addEventListener(SETTINGS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SETTINGS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-border/60 bg-background/70 p-2 text-xs group-data-[collapsible=icon]:hidden">
      <p className="px-1 font-medium text-foreground">광고 표시 설정</p>
      <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
        <input
          type="checkbox"
          checked={premium}
          onChange={(event) => {
            setPremium(event.target.checked);
            writeFlag(PREMIUM_KEY, event.target.checked);
          }}
          className="h-3.5 w-3.5 accent-primary"
        />
        <Gem className="h-3.5 w-3.5" />
        프리미엄 모드
      </label>
      <button
        type="button"
        onClick={() => {
          setHidden(!hidden);
          writeFlag(HIDDEN_KEY, !hidden);
        }}
        className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
        {hidden ? "광고 다시 표시" : "광고 숨기기"}
      </button>
    </div>
  );
}

export default function AdSenseSlot({ placement = "inline" }: { placement?: AdPlacement }) {
  const adRef = useRef<HTMLModElement>(null);
  const [hidden, setHidden] = useState(() => readFlag(HIDDEN_KEY));
  const [premium, setPremium] = useState(() => readFlag(PREMIUM_KEY));
  const [loaded, setLoaded] = useState(false);

  const adsDisabled = hidden || premium;

  useEffect(() => {
    const sync = () => {
      setHidden(readFlag(HIDDEN_KEY));
      setPremium(readFlag(PREMIUM_KEY));
    };
    window.addEventListener(SETTINGS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SETTINGS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (adsDisabled) return;

    const pushAd = () => {
      try {
        window.adsbygoogle = window.adsbygoogle || Object.assign([], { push: () => 0 });
        window.adsbygoogle.push({});
        setLoaded(true);
      } catch {
        setLoaded(true);
      }
    };

    let script = document.querySelector<HTMLScriptElement>(
      `script[src="${ADSENSE_SCRIPT_SRC}"]`
    );

    if (!script) {
      script = document.createElement("script");
      script.async = true;
      script.src = ADSENSE_SCRIPT_SRC;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    }

    if (script.dataset.loaded === "true") {
      pushAd();
    } else {
      script.addEventListener(
        "load",
        () => {
          script?.setAttribute("data-loaded", "true");
          pushAd();
        },
        { once: true }
      );
    }
  }, [adsDisabled]);

  const placementClass = placement === "sidebar"
    ? "my-2 min-h-[120px] rounded-lg px-1 py-1"
    : placement === "detail"
      ? "my-5 min-h-[105px] rounded-xl px-2 py-2 sm:min-h-[120px] sm:px-4"
      : "my-4 min-h-[90px] rounded-xl px-2 py-2 sm:min-h-[110px] sm:px-4";

  if (adsDisabled) {
    return (
      <section aria-label="광고 숨김" className={`w-full border border-dashed border-border/60 bg-muted/10 ${placementClass}`}>
        <div className="flex min-h-[70px] items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          {premium ? <Gem className="h-3.5 w-3.5 text-primary" /> : <EyeOff className="h-3.5 w-3.5" />}
          {premium ? "프리미엄 모드로 광고가 숨겨져 있습니다" : "광고가 숨겨져 있습니다"}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="광고"
      className={`relative w-full overflow-hidden border border-border/50 bg-muted/20 ${placementClass}`}
    >
      {!loaded && (
        <div aria-label="광고 로딩 중" className="pointer-events-none absolute inset-2 animate-pulse rounded-lg bg-gradient-to-r from-muted/30 via-muted/60 to-muted/30" />
      )}
      <div className="absolute right-2 top-2 z-10">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-full bg-background/80 text-muted-foreground shadow-sm hover:bg-background hover:text-foreground"
          aria-label="광고 숨기기"
          onClick={() => writeFlag(HIDDEN_KEY, true)}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ins
        ref={adRef}
        className="adsbygoogle relative z-[1] block min-h-[74px] w-full"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={ADSENSE_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </section>
  );
}
