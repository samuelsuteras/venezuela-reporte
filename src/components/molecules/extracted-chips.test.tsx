import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ExtractedChips } from "./extracted-chips";

describe("ExtractedChips", () => {
  it("renders nothing when empty", () => {
    const html = renderToStaticMarkup(<ExtractedChips extracted={null} />);
    expect(html).toBe("");
  });
  it("renders cédula + link values with labels", () => {
    const html = renderToStaticMarkup(
      <ExtractedChips extracted={{ cedulas: ["V-12345678"], phones: [], links: ["https://wa.me/1"], names: ["Ana"], addresses: [] }} />,
    );
    expect(html).toContain("V-12345678");
    expect(html).toContain("Ana");
    expect(html).toContain("wa.me");
  });
});
