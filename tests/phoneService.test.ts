import { describe, expect, it } from "vitest";
import {
  normalizePhoneNumber,
  formatPhoneForDisplay,
} from "../server/services/phoneService";

describe("normalizePhoneNumber", () => {
  it("normalizes 10-digit US numbers to +1 E.164", () => {
    expect(normalizePhoneNumber("4155552671")).toBe("+14155552671");
    expect(normalizePhoneNumber("(415) 555-2671")).toBe("+14155552671");
    expect(normalizePhoneNumber("415-555-2671")).toBe("+14155552671");
    expect(normalizePhoneNumber("415.555.2671")).toBe("+14155552671");
  });

  it("normalizes 11-digit numbers starting with 1", () => {
    expect(normalizePhoneNumber("14155552671")).toBe("+14155552671");
    expect(normalizePhoneNumber("1 (415) 555-2671")).toBe("+14155552671");
  });

  it("preserves existing E.164 format", () => {
    expect(normalizePhoneNumber("+14155552671")).toBe("+14155552671");
    expect(normalizePhoneNumber("+442071234567")).toBe("+442071234567");
  });

  it("returns empty string for empty input", () => {
    expect(normalizePhoneNumber("")).toBe("");
  });

  it("is idempotent — repeated normalization is a no-op", () => {
    const once = normalizePhoneNumber("(415) 555-2671");
    expect(normalizePhoneNumber(once)).toBe(once);
  });
});

describe("formatPhoneForDisplay", () => {
  it("formats a US E.164 to (xxx) xxx-xxxx", () => {
    expect(formatPhoneForDisplay("+14155552671")).toBe("(415) 555-2671");
  });

  it("formats unformatted 10-digit input", () => {
    expect(formatPhoneForDisplay("4155552671")).toBe("(415) 555-2671");
  });

  it("returns empty string for empty input", () => {
    expect(formatPhoneForDisplay("")).toBe("");
  });
});
