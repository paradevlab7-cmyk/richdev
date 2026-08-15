// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({ save: vi.fn(), invalidate: vi.fn(), historyData: [] as Array<{ id: number; agency: string | null; itemName: string | null; baseAmount: string; expectedBid: string; sampleSize: number }> }));

vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ analysis: { history: { invalidate: mocks.invalidate } } }),
    analysis: {
      estimate: { useQuery: () => ({ data: { sampleSize: 12, medianRate: 90, lowRate: 88, highRate: 92, minRate: 82, maxRate: 97, expectedBid: 90000000, minBid: 88000000, maxBid: 92000000, distribution: [{ label: "82.0~85.0%", count: 1 }, { label: "85.0~88.0%", count: 2 }, { label: "88.0~91.0%", count: 5 }, { label: "91.0~94.0%", count: 3 }, { label: "94.0~97.0%", count: 1 }], samples: [{ id: 1, title: "전산장비 구매", agency: "조달청", noticeDate: new Date("2026-08-01"), awardRate: 90.1, awardAmount: 90100000 } ] }, isLoading: false }) },
      trend: { useQuery: () => ({ data: [{ date: "2026-08-01", averageRate: 89.2, count: 3 }, { date: "2026-08-02", averageRate: 90.1, count: 4 }], isLoading: false }) },
      history: { useQuery: () => ({ data: mocks.historyData, isLoading: false }) },
      save: { useMutation: () => ({ mutate: mocks.save, isPending: false }) },
    },
  },
}));

import Analysis from "./Analysis";

afterEach(() => { cleanup(); mocks.save.mockReset(); mocks.invalidate.mockReset(); mocks.historyData = []; });

describe("Analysis", () => {
  it("formats a quick amount and displays distribution, samples, and save action after analysis", async () => {
    const user = userEvent.setup({ document: globalThis.document });
    render(<Analysis />);
    await user.click(screen.getByRole("button", { name: "100,000,000원" }));
    expect((screen.getByLabelText("기초금액(원)") as HTMLInputElement).value).toBe("100,000,000");

    await user.click(screen.getByRole("button", { name: "분석 실행" }));
    expect(screen.getByText("통계상 예상 투찰가")).toBeTruthy();
    expect(screen.getAllByText("90,000,000원").length).toBeGreaterThan(0);
    expect(screen.getByText("낙찰률 분포")).toBeTruthy();
    expect(screen.getByText("전산장비 구매")).toBeTruthy();
    expect(screen.getByText("투찰가 시나리오 비교")).toBeTruthy();
    expect(screen.getByText("과거 낙찰률 추세")).toBeTruthy();
    expect(screen.getByRole("button", { name: "기록 저장" })).toBeTruthy();
  });

  it("calculates a cost-and-margin floor and compares it against the statistical scenarios", async () => {
    const user = userEvent.setup({ document: globalThis.document });
    render(<Analysis />);
    await user.type(screen.getByLabelText("총원가(원)"), "80000000");
    await user.clear(screen.getByLabelText("목표 마진율(%)"));
    await user.type(screen.getByLabelText("목표 마진율(%)"), "20");
    expect(screen.getByText("하한선 100,000,000원")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "100,000,000원" }));
    await user.click(screen.getByRole("button", { name: "분석 실행" }));
    expect(screen.getByText("원가·마진 하한선")).toBeTruthy();
    expect(screen.getByText("통계 중앙")).toBeTruthy();
    expect(screen.getByText(/일부 통계 시나리오가 입력한 목표 마진 하한선보다 낮습니다/)).toBeTruthy();
  });

  it("saves the submitted analysis and restores conditions when a saved record is selected", async () => {
    mocks.historyData = [{ id: 7, agency: "조달청", itemName: "전산장비", baseAmount: "50000000.00", expectedBid: "45000000.00", sampleSize: 8 }];
    const user = userEvent.setup({ document: globalThis.document });
    render(<Analysis />);
    await user.click(screen.getByRole("button", { name: "50,000,000원" }));
    await user.click(screen.getByRole("button", { name: "분석 실행" }));
    await user.click(screen.getByRole("button", { name: "기록 저장" }));
    expect(mocks.save).toHaveBeenCalledWith({ agency: undefined, itemName: undefined, baseAmount: 50000000 });

    await user.click(screen.getByRole("button", { name: /조달청/ }));
    expect((screen.getByLabelText("기관명") as HTMLInputElement).value).toBe("조달청");
    expect((screen.getByLabelText("품목·공고 키워드") as HTMLInputElement).value).toBe("전산장비");
    expect((screen.getByLabelText("기초금액(원)") as HTMLInputElement).value).toBe("50,000,000");
  });
});
