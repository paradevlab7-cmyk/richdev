import React, { useEffect, useRef } from "react";

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

export default function AdSenseSlot() {
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    const pushAd = () => {
      try {
        window.adsbygoogle = window.adsbygoogle || Object.assign([], { push: () => 0 });
        window.adsbygoogle.push({});
      } catch {
        // AdSense may decline an impression while the account or site is under review.
      }
    };

    let script = document.querySelector<HTMLScriptElement>(
      `script[src="${ADSENSE_SCRIPT_SRC}"]`
    );
    const createdScript = !script;

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
      script.addEventListener("load", () => {
        script?.setAttribute("data-loaded", "true");
        pushAd();
      }, { once: true });
    }

    return () => {
      if (createdScript && script?.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <section
      aria-label="광고"
      className="my-4 min-h-[90px] w-full overflow-hidden rounded-xl border border-border/50 bg-muted/20 px-2 py-2 sm:min-h-[110px] sm:px-4"
    >
      <ins
        ref={adRef}
        className="adsbygoogle block min-h-[74px] w-full"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={ADSENSE_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </section>
  );
}
