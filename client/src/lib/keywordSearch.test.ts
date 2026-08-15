import { describe, expect, it } from "vitest";
import { createSearchQuery, toggleKeywordSelection } from "./keywordSearch";

describe("toggleKeywordSelection", () => {
  it("adds multiple keywords for an OR search and removes a selected keyword on repeated click", () => {
    const withRag = toggleKeywordSelection([], "RAG");
    const withBoth = toggleKeywordSelection(withRag, "LLM");
    const withLlmOnly = toggleKeywordSelection(withBoth, "RAG");

    expect(withBoth).toEqual(["RAG", "LLM"]);
    expect(withLlmOnly).toEqual(["LLM"]);
    expect(createSearchQuery("", withBoth, "2026-07-31", "2026-08-15")).toBe("kw=RAG&kw=LLM&from=2026-07-31&to=2026-08-15");
    expect(createSearchQuery("", withLlmOnly, "2026-07-31", "2026-08-15")).toBe("kw=LLM&from=2026-07-31&to=2026-08-15");
  });
});
