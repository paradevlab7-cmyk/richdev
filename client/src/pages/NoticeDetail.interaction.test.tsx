/** @vitest-environment jsdom */
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("wouter", () => ({ useLocation: () => ["/notice/1", mocks.navigate], useRoute: () => [true, { id: "1" }] }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    notices: {
      detail: { useQuery: () => ({ data: { id: 1, sourceType: "contract", title: "푸드원 급식용 식재료 구매 계약", noticeId: "contract:R26TA02094778", agency: "대구광역시교육청", noticeDate: new Date("2026-08-08T00:00:00Z"), deadline: null, awardAmount: "3771000", baseAmount: "3771000", originalUrl: null, attachmentsJson: null, rawJson: JSON.stringify({ rprsntCorpNm: "푸드원", rprsntCorpBizrno: "123-45-67890", cntrctInsttNm: "대구광역시교육청" }) }, isLoading: false }) },
      companyHistory: { useQuery: () => ({ data: [{ id: 1, sourceType: "contract", title: "푸드원 급식용 식재료 구매 계약", agency: "대구광역시교육청", noticeDate: new Date("2026-08-08T00:00:00Z"), awardAmount: "3771000", baseAmount: "3771000" }], isLoading: false }) },
    },
  },
}));

import NoticeDetail from "./NoticeDetail";

afterEach(cleanup);

describe("NoticeDetail company history modal", () => {
  it("opens the company history dialog after clicking the representative company in the service-detail tab", async () => {
    const user = userEvent.setup();
    render(<NoticeDetail />);

    await user.click(screen.getByRole("tab", { name: "서비스 상세" }));
    await user.click(screen.getByRole("button", { name: "푸드원의 과거 낙찰 및 계약 이력 보기" }));

    expect(await screen.findByText("푸드원 업체 이력")).toBeTruthy();
    expect(screen.getByText("저장된 낙찰정보·계약정보에서 동일 업체명으로 조회한 최근 이력입니다.")).toBeTruthy();
  });
});
