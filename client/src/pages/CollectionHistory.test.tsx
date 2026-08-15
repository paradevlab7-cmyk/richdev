// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ runs: [] as Array<Record<string, unknown>>, daily: [] as Array<{ day: string; success: number; failed: number }> }));

vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("./Home", () => ({ CollectionControl: () => <div data-testid="collection-control"><p>서비스별 기본 수집 기간 관리</p><p>대용량 수집 예상 · 최근 3개월</p></div> }));
vi.mock("@/components/ui/chart", () => ({ ChartContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, ChartTooltip: () => null, ChartTooltipContent: () => null }));
vi.mock("recharts", () => ({ Bar: () => null, BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, CartesianGrid: () => null, XAxis: () => null, YAxis: () => null }));
vi.mock("@/lib/trpc", () => ({ trpc: { collection: { runs: { useQuery: () => ({ data: mocks.runs, isLoading: false }) }, dailyStats: { useQuery: () => ({ data: mocks.daily, isFetching: false }) } } } }));

import CollectionHistory from "./CollectionHistory";

function run(overrides: Partial<Record<string, unknown>>) { return { id: 1, sourceType: "standard", status: "success", isBackground: false, fetchedCount: 100, totalAvailable: 100, storedCount: 100, currentPage: 1, totalPages: 1, startedAt: new Date("2026-08-15T06:07:54Z"), errorMessage: null, ...overrides }; }
afterEach(() => { cleanup(); mocks.runs = []; mocks.daily = []; });

describe("CollectionHistory", () => {
  it("hosts collection controls and the three-month large-collection estimate on the collection history page", () => {
    render(<CollectionHistory />);
    expect(screen.getByText("수집 설정 및 실행")).toBeTruthy();
    expect(screen.getByTestId("collection-control")).toBeTruthy();
    expect(screen.getByText("서비스별 기본 수집 기간 관리")).toBeTruthy();
    expect(screen.getByText("대용량 수집 예상 · 최근 3개월")).toBeTruthy();
  });

  it("does not show a superseded date-parameter note as an error but retains genuine failed error logs", () => {
    mocks.runs = [run({ errorMessage: "Superseded after PubDataOpnStdService date-parameter correction" }), run({ id: 2, status: "failed", errorMessage: "fetch failed" })];
    render(<CollectionHistory />);
    expect(screen.queryByText("Superseded after PubDataOpnStdService date-parameter correction")).toBeNull();
    expect(screen.getByText("fetch failed")).toBeTruthy();
    expect(screen.getByRole("button", { name: /오류 로그/ })).toBeTruthy();
  });
});
