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
    expect(createSearchQuery("", [], "2026-07-31", "2026-08-15", { agency: "한국도로공사", contact: "이은영" })).toBe("agency=%ED%95%9C%EA%B5%AD%EB%8F%84%EB%A1%9C%EA%B3%B5%EC%82%AC&contact=%EC%9D%B4%EC%9D%80%EC%98%81&from=2026-07-31&to=2026-08-15");
  });
});
