import { describe, expect, it } from "vitest";
import {
  getEventPreset,
  normalizeEventTypeKey,
  listEventTypeKeys,
  derivePdfPaletteFromTheme,
} from "@shared/eventPresets";

describe("normalizeEventTypeKey", () => {
  it("maps canonical keys through unchanged", () => {
    expect(normalizeEventTypeKey("wedding")).toBe("wedding");
    expect(normalizeEventTypeKey("corporate")).toBe("corporate");
    expect(normalizeEventTypeKey("cocktail_party")).toBe("cocktail_party");
  });

  it("normalizes whitespace and hyphens", () => {
    expect(normalizeEventTypeKey("Holiday Party")).toBe("holiday_party");
    expect(normalizeEventTypeKey("baby-shower")).toBe("baby_shower");
  });

  it("aliases 'other' → celebration", () => {
    expect(normalizeEventTypeKey("other")).toBe("celebration");
  });

  it("falls back to celebration for unknown input", () => {
    expect(normalizeEventTypeKey("bar_mitzvah")).toBe("celebration");
    expect(normalizeEventTypeKey(null)).toBe("celebration");
    expect(normalizeEventTypeKey(undefined)).toBe("celebration");
  });
});

describe("getEventPreset", () => {
  it("returns the wedding preset with wedding-specific copy", () => {
    const p = getEventPreset("wedding");
    expect(p.key).toBe("wedding");
    expect(p.copy.proposalKicker).toContain("Wedding");
    expect(p.sections.useHeartAccents).toBe(true);
  });

  it("returns corporate preset without heart accents", () => {
    const p = getEventPreset("corporate");
    expect(p.key).toBe("corporate");
    expect(p.sections.useHeartAccents).toBe(false);
    expect(p.copy.proposalKicker).toContain("Corporate");
  });

  it("preserves user-visible label for unknown event types", () => {
    const p = getEventPreset("bar_mitzvah");
    expect(p.key).toBe("celebration");
    expect(p.label).toBe("Bar Mitzvah");
  });

  it("every registered key resolves to a preset with required surfaces", () => {
    for (const key of listEventTypeKeys()) {
      const p = getEventPreset(key);
      expect(p.theme.primary).toMatch(/^#/);
      expect(p.copy.proposalKicker.length).toBeGreaterThan(0);
      expect(p.defaults.whatsIncluded("plated").length).toBeGreaterThan(0);
    }
  });
});

describe("copy.displayTitle (couple-name duplication guard)", () => {
  it("renders 'A & B' when partner is different", () => {
    const { copy } = getEventPreset("wedding");
    expect(
      copy.displayTitle({ firstName: "Pascal", partnerFirstName: "Jordan" }),
    ).toBe("Pascal & Jordan");
  });

  it("never renders 'Pascal & Pascal' when names collide", () => {
    const { copy } = getEventPreset("wedding");
    const title = copy.displayTitle({
      firstName: "pascal",
      partnerFirstName: "Pascal",
    });
    expect(title.toLowerCase()).not.toContain("pascal & pascal");
    expect(title).toBe("pascal");
  });

  it("drops to solo when partner is empty string", () => {
    const { copy } = getEventPreset("wedding");
    expect(
      copy.displayTitle({ firstName: "Pascal", partnerFirstName: "" }),
    ).toBe("Pascal");
  });

  it("corporate prefers company name", () => {
    const { copy } = getEventPreset("corporate");
    expect(
      copy.displayTitle({
        firstName: "Jane",
        lastName: "Doe",
        company: "Acme Inc",
      }),
    ).toBe("Acme Inc");
  });
});

describe("copy.composeEventTitle", () => {
  it("wedding appends 's Wedding'", () => {
    const { copy, label } = getEventPreset("wedding");
    expect(copy.composeEventTitle("Pascal & Jordan", label)).toBe(
      "Pascal & Jordan's Wedding",
    );
  });

  it("wedding falls back to 'Your Wedding' with no title", () => {
    const { copy, label } = getEventPreset("wedding");
    expect(copy.composeEventTitle(null, label)).toBe("Your Wedding");
  });

  it("corporate does NOT append label to company name", () => {
    const { copy, label } = getEventPreset("corporate");
    expect(copy.composeEventTitle("Acme Inc", label)).toBe("Acme Inc");
  });
});

describe("derivePdfPaletteFromTheme", () => {
  it("uses theme colors for primary/accent/background", () => {
    const { theme } = getEventPreset("wedding");
    const palette = derivePdfPaletteFromTheme(theme);
    expect(palette.primary).toBe(theme.primary);
    expect(palette.accent).toBe(theme.accent);
    expect(palette.background).toBe(theme.background);
    expect(palette.headerText).toMatch(/^#/);
  });
});
