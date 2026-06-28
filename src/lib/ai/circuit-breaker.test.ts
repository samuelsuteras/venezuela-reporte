import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { breaker } from "./circuit-breaker";

describe("circuit breaker", () => {
  beforeEach(() => { breaker.recordSuccess("p"); }); // reset state for key "p"

  it("stays closed under the failure threshold", () => {
    breaker.recordFailure("p");
    breaker.recordFailure("p");
    expect(breaker.isOpen("p")).toBe(false);
  });

  it("opens after 3 failures within the window", () => {
    breaker.recordFailure("p");
    breaker.recordFailure("p");
    breaker.recordFailure("p");
    expect(breaker.isOpen("p")).toBe(true);
  });

  it("recordSuccess closes an open breaker", () => {
    breaker.recordFailure("p"); breaker.recordFailure("p"); breaker.recordFailure("p");
    breaker.recordSuccess("p");
    expect(breaker.isOpen("p")).toBe(false);
  });

  it("half-opens after the open duration elapses", () => {
    vi.useFakeTimers();
    try {
      breaker.recordFailure("p"); breaker.recordFailure("p"); breaker.recordFailure("p");
      expect(breaker.isOpen("p")).toBe(true);
      vi.advanceTimersByTime(5 * 60_000 + 1);
      expect(breaker.isOpen("p")).toBe(false); // half-open probe allowed
    } finally { vi.useRealTimers(); }
  });
});
