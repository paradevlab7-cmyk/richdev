import { describe, expect, it } from "vitest";
import { requestCompanyHistoryOpen, subscribeToCompanyHistoryOpen } from "./companyHistoryDialog";

describe("company history dialog interaction", () => {
  it("opens the subscribed dialog handler when a company-name click requests history", () => {
    const eventTarget = new EventTarget();
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", { configurable: true, value: eventTarget });
    let opened = 0;

    const unsubscribe = subscribeToCompanyHistoryOpen(() => { opened += 1; });
    requestCompanyHistoryOpen();
    unsubscribe();
    requestCompanyHistoryOpen();

    expect(opened).toBe(1);
    Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
  });
});
