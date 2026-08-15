/** @vitest-environment jsdom */
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    collection: {
      runNow: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));

import { CollectionControl } from "./Home";

describe("CollectionControl", () => {
  it("selects the three-month collection period on first render", () => {
    render(<CollectionControl />);

    const periodSelect = screen.getByLabelText("수집 기간") as HTMLSelectElement;
    expect(periodSelect.value).toBe("90");
    expect((screen.getByRole("option", { name: "최근 3개월" }) as HTMLOptionElement).selected).toBe(true);
    expect(screen.getByRole("button", { name: "90일 수집" })).toBeTruthy();
  });
});
