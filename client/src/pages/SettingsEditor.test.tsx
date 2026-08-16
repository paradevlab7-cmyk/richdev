// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ saveMutate: vi.fn(), invalidate: vi.fn(), saved: { dataServiceKey: "saved-key", telegramBotToken: "saved-token", telegramChatId: "12345", notificationEmail: "old@example.com", emailEnabled: true, telegramEnabled: true, emailProvider: "owner", fallbackEmailProvider: "none", emailFrom: null, smtpHost: null, smtpPort: 587, smtpUsername: null, smtpPassword: "", emailApiKey: "", mailgunDomain: null } }));
vi.mock("@/lib/trpc", () => ({ trpc: { useUtils: () => ({ settings: { get: { invalidate: mocks.invalidate } } }), settings: { get: { useQuery: () => ({ data: mocks.saved }) }, save: { useMutation: () => ({ mutate: mocks.saveMutate, isPending: false }) } }, collection: { runs: { useQuery: () => ({ data: [] }) } } } }));

import SettingsEditor from "./SettingsEditor";
afterEach(() => { cleanup(); mocks.saveMutate.mockReset(); mocks.invalidate.mockReset(); });

describe("SettingsEditor", () => {
  it("keeps a user's edited saved value and resubmits the edited form", async () => {
    const { rerender } = render(<SettingsEditor />);
    const apiKey = await screen.findByLabelText("공공데이터 일반 인증키") as HTMLInputElement;
    expect(apiKey.value).toBe("saved-key");
    fireEvent.change(apiKey, { target: { value: "updated-key" } });
    expect(apiKey.value).toBe("updated-key");
    rerender(<SettingsEditor />);
    expect((screen.getByLabelText("공공데이터 일반 인증키") as HTMLInputElement).value).toBe("updated-key");
    expect(screen.queryByLabelText("이메일 수신 주소")).toBeNull();
    expect(screen.queryByLabelText("기본 이메일 발송")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "설정 저장" }));
    await waitFor(() => expect(mocks.saveMutate).toHaveBeenCalledWith(expect.objectContaining({ dataServiceKey: "updated-key", telegramBotToken: "saved-token", telegramChatId: "12345", emailEnabled: false })));
  });
});
