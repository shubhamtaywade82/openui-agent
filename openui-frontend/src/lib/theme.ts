import type { ThemeProps } from "@openuidev/react-ui"

type Theme = NonNullable<ThemeProps["lightTheme"]>

const typography: Theme = {
  fontBody: "'Instrument Sans', system-ui, sans-serif",
  fontLabel: "'Instrument Sans', system-ui, sans-serif",
  fontHeading: "'Bricolage Grotesque', 'Instrument Sans', system-ui, sans-serif",
  fontNumbers: "'Instrument Sans', system-ui, sans-serif",
}

const CHART_PALETTE_LIGHT = [
  "oklch(0.46 0.08 175)",
  "oklch(0.70 0.13 75)",
  "oklch(0.55 0.10 245)",
  "oklch(0.62 0.15 25)",
  "oklch(0.55 0.10 305)",
]

const CHART_PALETTE_DARK = [
  "oklch(0.77 0.13 170)",
  "oklch(0.80 0.13 80)",
  "oklch(0.74 0.10 245)",
  "oklch(0.74 0.13 25)",
  "oklch(0.74 0.10 305)",
]

export const lightTheme: Theme = {
  ...typography,
  background: "oklch(0.955 0.006 165)",
  foreground: "oklch(0.995 0.002 165)",
  popoverBackground: "oklch(0.995 0.002 165)",
  borderAccent: "oklch(0.46 0.08 175)",
  interactiveAccentDefault: "oklch(0.46 0.08 175)",
  interactiveAccentHover: "oklch(0.40 0.08 175)",
  interactiveAccentPressed: "oklch(0.35 0.07 175)",
  textBrand: "oklch(0.46 0.08 175)",
  textNeutralPrimary: "oklch(0.24 0.02 175)",
  textNeutralSecondary: "oklch(0.45 0.02 175)",
  textNeutralTertiary: "oklch(0.58 0.015 175)",
  chatUserResponseBg: "oklch(0.93 0.02 170)",
  chatUserResponseText: "oklch(0.24 0.02 175)",
  radiusM: "8px",
  radiusL: "10px",
  radiusXl: "14px",
  defaultChartPalette: CHART_PALETTE_LIGHT,
}

export const darkTheme: Theme = {
  ...typography,
  background: "oklch(0.15 0.012 175)",
  foreground: "oklch(0.20 0.013 175)",
  popoverBackground: "oklch(0.24 0.014 175)",
  borderAccent: "oklch(0.77 0.13 170)",
  interactiveAccentDefault: "oklch(0.77 0.13 170)",
  interactiveAccentHover: "oklch(0.82 0.13 170)",
  interactiveAccentPressed: "oklch(0.70 0.12 170)",
  textBrand: "oklch(0.77 0.13 170)",
  textNeutralPrimary: "oklch(0.93 0.01 170)",
  textNeutralSecondary: "oklch(0.74 0.015 170)",
  textNeutralTertiary: "oklch(0.60 0.015 170)",
  chatUserResponseBg: "oklch(0.28 0.025 175)",
  chatUserResponseText: "oklch(0.95 0.01 170)",
  radiusM: "8px",
  radiusL: "10px",
  radiusXl: "14px",
  defaultChartPalette: CHART_PALETTE_DARK,
}
