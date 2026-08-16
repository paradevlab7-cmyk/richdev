// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import AdSenseSlot from "./AdSenseSlot";

const adsPush = vi.fn();

afterEach(() => {
  cleanup();
  document
    .querySelectorAll('script[src*="pagead2.googlesyndication.com"]')
    .forEach((script) => script.remove());
  window.adsbygoogle = Object.assign([], { push: adsPush });
  adsPush.mockReset();
});

describe("AdSenseSlot", () => {
  it("renders the supplied responsive ad slot metadata", () => {
    render(<AdSenseSlot />);

    const slot = screen.getByLabelText("광고").querySelector("ins");
    expect(slot?.getAttribute("data-ad-client")).toBe("ca-pub-6489916860904302");
    expect(slot?.getAttribute("data-ad-slot")).toBe("8957289425");
    expect(slot?.getAttribute("data-full-width-responsive")).toBe("true");
  });

  it("loads the AdSense script only once and pushes after it loads", async () => {
    render(<AdSenseSlot />);
    render(<AdSenseSlot />);

    const scripts = document.querySelectorAll(
      'script[src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6489916860904302"]'
    );
    expect(scripts).toHaveLength(1);

    scripts[0]?.dispatchEvent(new Event("load"));
    await waitFor(() => expect(adsPush).toHaveBeenCalled());
  });
});

