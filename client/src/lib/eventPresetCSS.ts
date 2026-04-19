/**
 * Client-side bridge from `shared/eventPresets` → React CSSProperties.
 *
 * Kept separate from the shared module so the latter has zero React/DOM
 * dependencies and is safe to import in server code (PDF generator, etc.).
 */
import type { CSSProperties } from "react";
import type { EventTheme } from "@shared/eventPresets";

export function applyThemeCSS(theme: EventTheme): CSSProperties {
  return {
    "--theme-primary": theme.primary,
    "--theme-secondary": theme.secondary,
    "--theme-accent": theme.accent,
    "--theme-bg": theme.background,
    "--theme-text": theme.textPrimary,
    "--theme-text-secondary": theme.textSecondary,
    "--theme-heading-font": theme.fontHeading,
    "--theme-body-font": theme.fontBody,
    "--theme-gradient": theme.gradient,
    "--theme-border": theme.borderAccent,
  } as CSSProperties;
}
