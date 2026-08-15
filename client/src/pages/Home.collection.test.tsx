/** @vitest-environment jsdom */
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({ preferenceData: undefined as { lastCollectionDays: number; serviceDefaults: { bid: number; spec: number; award: number; contract: number; standard: number } } | undefined, estimateData: [] as Array<{ sourceType: string; effectiveDays: number; estimatedCount: number | null; estimatedSeconds: number | null; historyRuns: number }>, save: vi.fn(), run: vi.fn(), setData: vi.fn(), invalidate: vi.fn() }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ collection: { preferences: { get: { setData: mocks.setData } }, estimate: { invalidate: mocks.invalidate } } }),
    collection: {
      preferences: { get: { useQuery: () => ({ data: mocks.preferenceData, isLoading: false }) }, save: { useMutation: () => ({ mutate: mocks.save, isPending: false }) } },
      estimate: { useQuery: () => ({ data: mocks.estimateData, isLoading: false }) },
      runNow: { useMutation: () => ({ mutate: mocks.run, isPending: false }) },
    },
  },
}));

import { CollectionControl } from "./Home";

afterEach(() => { cleanup(); mocks.preferenceData = undefined; mocks.estimateData = []; mocks.save.mockReset(); mocks.run.mockReset(); mocks.setData.mockReset(); mocks.invalidate.mockReset(); });

describe("CollectionControl", () => {
  it("selects the three-month collection period on first render", () => {
    render(<CollectionControl />);

    const periodSelect = screen.getByLabelText("수집 기간") as HTMLSelectElement;
    expect(periodSelect.value).toBe("90");
    expect(periodSelect.selectedOptions[0]?.textContent).toBe("최근 3개월");
    expect(screen.getByRole("button", { name: "90일 수집" })).toBeTruthy();
  });

  it("restores a user's last selected period and persists a newly selected period", async () => {
    mocks.preferenceData = { lastCollectionDays: 60, serviceDefaults: { bid: 90, spec: 90, award: 30, contract: 90, standard: 30 } };
    const user = userEvent.setup();
    render(<CollectionControl />);
    const periodSelect = screen.getByLabelText("수집 기간") as HTMLSelectElement;
    await waitFor(() => expect(periodSelect.value).toBe("60"));

    await user.selectOptions(periodSelect, "30");
    expect(mocks.save).toHaveBeenCalledWith({ lastCollectionDays: 30, serviceDefaults: { bid: 90, spec: 90, award: 30, contract: 90, standard: 30 } });

    mocks.preferenceData = { lastCollectionDays: 30, serviceDefaults: { bid: 90, spec: 90, award: 30, contract: 90, standard: 30 } };
    cleanup();
    render(<CollectionControl />);
    await waitFor(() => expect((screen.getByLabelText("수집 기간") as HTMLSelectElement).value).toBe("30"));
  });

  it("uses service-specific defaults when that execution mode is selected", async () => {
    mocks.preferenceData = { lastCollectionDays: 90, serviceDefaults: { bid: 60, spec: 90, award: 30, contract: 180, standard: 30 } };
    const user = userEvent.setup();
    render(<CollectionControl />);

    await user.selectOptions(screen.getByLabelText("수집 실행 방식"), "service-defaults");
    await user.click(screen.getByRole("button", { name: "서비스별 수집" }));

    expect(mocks.run).toHaveBeenCalledWith({ days: 90, serviceDefaults: { bid: 60, spec: 90, award: 30, contract: 180, standard: 30 } });
  });

  it("renders service-specific large-collection counts and completion-time estimates", () => {
    mocks.estimateData = [{ sourceType: "spec", effectiveDays: 90, estimatedCount: 16133, estimatedSeconds: 12660, historyRuns: 2 }, { sourceType: "standard", effectiveDays: 30, estimatedCount: 33687, estimatedSeconds: 463320, historyRuns: 3 }];
    render(<CollectionControl />);

    expect(screen.getByText("대용량 수집 예상 · 최근 3개월")).toBeTruthy();
    expect(screen.getByText("예상 16,133건")).toBeTruthy();
    expect(screen.getByText("완료 약 3.5시간")).toBeTruthy();
    expect(screen.getByText("완료 약 128.7시간")).toBeTruthy();
  });
});
