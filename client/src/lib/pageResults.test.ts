import { describe, expect, it } from "vitest";
import { appendUniqueById } from "./pageResults";

describe("appendUniqueById", () => {
  it("merges a newly fetched page without duplicating a boundary record", () => {
    expect(appendUniqueById([{ id: 1 }, { id: 2 }], [{ id: 2 }, { id: 3 }])).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });
});
