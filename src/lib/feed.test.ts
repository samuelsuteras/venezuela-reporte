import { describe, it, expect } from "vitest";
import { maskCedula } from "./feed";

describe("maskCedula", () => {
  it("keeps prefix + first 3 digits, masks the rest", () => {
    expect(maskCedula("V-12345678")).toBe("V-123#####");
  });
  it("passes through values it can't parse", () => {
    expect(maskCedula("weird")).toBe("weird");
  });
});
