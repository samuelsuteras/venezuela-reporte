import { describe, it, expect } from "vitest";
import { normalizeStrings, emptyExtracted } from "./types";

describe("normalizeStrings", () => {
  it("trims, drops empties/non-strings, dedupes case-insensitively", () => {
    expect(normalizeStrings([" Ana ", "ana", "", 5, "Luis", null])).toEqual(["Ana", "Luis"]);
  });
  it("returns [] for non-arrays", () => { expect(normalizeStrings(undefined)).toEqual([]); });
  it("caps the array length", () => {
    expect(normalizeStrings(["a", "b", "c"], 2)).toEqual(["a", "b"]);
  });
});

describe("emptyExtracted", () => {
  it("is all-empty arrays", () => {
    expect(emptyExtracted()).toEqual({ cedulas: [], phones: [], links: [], names: [], addresses: [] });
  });
});
