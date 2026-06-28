import { describe, it, expect } from "vitest";
import { extractCedulas, extractPhones, extractLinks } from "./patterns";

describe("extractCedulas", () => {
  it("normalizes dotted, spaced, and lowercase forms", () => {
    expect(extractCedulas("cédula V-12345678")).toEqual(["V-12345678"]);
    expect(extractCedulas("V12.345.678")).toEqual(["V-12345678"]);
    expect(extractCedulas("titular e-1234567")).toEqual(["E-1234567"]);
    expect(extractCedulas("RIF J-31000000")).toEqual(["J-31000000"]);
  });
  it("dedupes repeats", () => {
    expect(extractCedulas("V-12345678 y de nuevo V12.345.678")).toEqual(["V-12345678"]);
  });
  it("returns [] when none", () => { expect(extractCedulas("sin id")).toEqual([]); });
});

describe("extractPhones", () => {
  it("normalizes VE mobile + landline + intl to +58", () => {
    expect(extractPhones("llama 0414-1234567")).toEqual(["+584141234567"]);
    expect(extractPhones("+58 412 1234567")).toEqual(["+584121234567"]);
    expect(extractPhones("04241234567")).toEqual(["+584241234567"]);
    expect(extractPhones("fijo 0212-5551234")).toEqual(["+582125551234"]);
  });
  it("returns [] for non-VE / junk numbers", () => {
    expect(extractPhones("123")).toEqual([]);
  });
});

describe("extractLinks", () => {
  it("strips trailing punctuation and adds https", () => {
    expect(extractLinks("ver https://wa.me/58414.")).toEqual(["https://wa.me/58414"]);
    expect(extractLinks("www.cruzroja.org.ve, ayuda")).toEqual(["https://www.cruzroja.org.ve/"]);
  });
  it("drops invalid and returns [] when none", () => {
    expect(extractLinks("no hay enlace")).toEqual([]);
  });
});
