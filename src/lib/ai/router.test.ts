import { describe, it, expect } from "vitest";
import { rotate } from "./router";

describe("rotate", () => {
  it("round-robins through all providers", () => {
    const order = ["a", "b", "c"] as const;
    const s = { i: 0 };
    const open = () => false;
    expect(rotate(order, open, s)).toBe("a");
    expect(rotate(order, open, s)).toBe("b");
    expect(rotate(order, open, s)).toBe("c");
    expect(rotate(order, open, s)).toBe("a");
  });

  it("skips providers whose breaker is open", () => {
    const order = ["a", "b", "c"] as const;
    const s = { i: 0 };
    const open = (k: string) => k === "a";
    expect(rotate(order, open, s)).toBe("b");
    expect(rotate(order, open, s)).toBe("c");
  });

  it("returns the first provider when all are open (let it half-open on result)", () => {
    const order = ["a", "b"] as const;
    const s = { i: 0 };
    expect(rotate(order, () => true, s)).toBe("a");
  });

  it("returns null for an empty order", () => {
    const s = { i: 0 };
    expect(rotate([], () => false, s)).toBeNull();
  });
});
