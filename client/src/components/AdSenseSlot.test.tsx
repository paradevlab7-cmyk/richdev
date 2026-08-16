// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdSenseSlot, { AdSenseSettingsToggle } from "./AdSenseSlot";
import { ThemeProvider } from "@/contexts/ThemeContext";

const adsPush = vi.fn();

afterEach(() => {
  cleanup();
  window.localStorage.clear();
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

  it("shows a loading placeholder before the AdSense script loads", () => {
    render(<AdSenseSlot />);
    expect(screen.getByLabelText("광고 로딩 중")).toBeTruthy();
  });

  it("shows benefits and persists premium mode from the highlighted settings control", async () => {
    render(<ThemeProvider switchable><AdSenseSettingsToggle /></ThemeProvider>);
    fireEvent.click(screen.getByRole("button", { name: "프리미엄 모드 혜택 보기" }));
    expect(await screen.findByText("프리미엄 모드 혜택")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "프리미엄 모드 활성화" }));
    expect(window.localStorage.getItem("g2b-premium-mode")).toBe("true");
  });

  it("supports the premium theme toggle", async () => {
    render(<ThemeProvider switchable><AdSenseSettingsToggle /></ThemeProvider>);
    fireEvent.click(screen.getByRole("button", { name: "프리미엄 모드 혜택 보기" }));
    await screen.findByText("프리미엄 모드 혜택");
    fireEvent.click(screen.getByRole("button", { name: "적용" }));
    expect(window.localStorage.getItem("premium-theme")).toBe("true");
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

