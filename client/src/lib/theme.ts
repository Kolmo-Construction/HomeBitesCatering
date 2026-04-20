export type ThemePreset = {
  name: string;
  primary: string;
  accent: string;
  description: string;
};

export const themePresets: ThemePreset[] = [
  { name: "Home Bites", primary: "28 33% 52%", accent: "30 100% 50%", description: "Rose taupe & orange" },
  { name: "Fresh Herbs", primary: "140 25% 38%", accent: "75 45% 48%", description: "Sage & olive" },
  { name: "Truffle", primary: "25 25% 28%", accent: "22 65% 48%", description: "Espresso & copper" },
  { name: "Citrus Grove", primary: "90 40% 38%", accent: "48 95% 55%", description: "Basil & lemon" },
  { name: "Berry Tart", primary: "340 45% 42%", accent: "350 70% 72%", description: "Mulberry & blush" },
  { name: "Saffron", primary: "18 55% 45%", accent: "42 95% 55%", description: "Terracotta & gold" },
  { name: "Charcoal Grill", primary: "215 20% 30%", accent: "12 75% 52%", description: "Slate & ember" },
  { name: "Espresso Bar", primary: "20 35% 22%", accent: "32 55% 65%", description: "Coffee & cream" },
  { name: "Vineyard", primary: "320 28% 32%", accent: "355 55% 55%", description: "Plum & pinot" },
  { name: "Coastal", primary: "200 45% 38%", accent: "28 85% 60%", description: "Harbour & apricot" },
];

const DEFAULT_PRESET = "Home Bites";

export function getSavedPreset(): string {
  if (typeof window === "undefined") return DEFAULT_PRESET;
  return localStorage.getItem("themePreset") || DEFAULT_PRESET;
}

export function getSavedDarkMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("theme") === "dark";
}

export function applyTheme(themeName: string, dark: boolean) {
  if (typeof document === "undefined") return;
  const preset = themePresets.find((t) => t.name === themeName) || themePresets[0];
  const root = document.documentElement;

  if (dark) root.classList.add("dark");
  else root.classList.remove("dark");

  root.style.setProperty("--primary", preset.primary);
  root.style.setProperty("--ring", preset.primary);
  root.style.setProperty("--accent", preset.accent);
  root.style.setProperty("--secondary", preset.accent);

  localStorage.setItem("theme", dark ? "dark" : "light");
  localStorage.setItem("themePreset", themeName);
}

export function initTheme() {
  applyTheme(getSavedPreset(), getSavedDarkMode());
}
