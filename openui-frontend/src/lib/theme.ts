import type { ThemeProps } from "@openuidev/react-ui"

type Theme = NonNullable<ThemeProps["lightTheme"]>

const typography: Theme = {
  fontBody: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
  fontLabel: "'Plus Jakarta Sans', system-ui, sans-serif",
  fontHeading: "'Plus Jakarta Sans', 'Bricolage Grotesque', system-ui, sans-serif",
  fontNumbers: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
}

const CHART_PALETTE_LIGHT = [
  "oklch(0.58 0.22 280)",
  "oklch(0.66 0.17 165)",
  "oklch(0.70 0.18 55)",
  "oklch(0.62 0.20 345)",
  "oklch(0.58 0.19 230)",
]

const CHART_PALETTE_DARK = [
  "oklch(0.72 0.22 275)",
  "oklch(0.75 0.16 165)",
  "oklch(0.78 0.17 55)",
  "oklch(0.73 0.19 345)",
  "oklch(0.70 0.18 230)",
]

export const lightTheme: Theme = {
  ...typography,
  background: "oklch(0.985 0.005 265)",
  foreground: "oklch(1 0 0)",
  popoverBackground: "oklch(1 0 0)",
  borderDefault: "oklch(0.92 0.008 265)",
  borderInteractive: "oklch(0.86 0.015 265)",
  borderAccent: "oklch(0.55 0.22 280)",
  interactiveAccentDefault: "oklch(0.55 0.22 280)",
  interactiveAccentHover: "oklch(0.48 0.22 280)",
  interactiveAccentPressed: "oklch(0.42 0.20 280)",
  textBrand: "oklch(0.52 0.22 280)",
  textNeutralPrimary: "oklch(0.18 0.025 265)",
  textNeutralSecondary: "oklch(0.46 0.025 265)",
  textNeutralTertiary: "oklch(0.62 0.018 265)",
  chatUserResponseBg: "oklch(0.94 0.025 280)",
  chatUserResponseText: "oklch(0.18 0.025 265)",
  highlight: "oklch(0.93 0.03 280)",
  highlightSubtle: "oklch(0.965 0.012 280)",
  radiusM: "10px",
  radiusL: "14px",
  radiusXl: "18px",
  defaultChartPalette: CHART_PALETTE_LIGHT,
}

export const darkTheme: Theme = {
  ...typography,
  background: "oklch(0.12 0.02 265)",
  foreground: "oklch(0.165 0.025 265)",
  popoverBackground: "oklch(0.19 0.028 265)",
  borderDefault: "oklch(0.24 0.025 265)",
  borderInteractive: "oklch(0.32 0.035 265)",
  borderAccent: "oklch(0.70 0.21 275)",
  interactiveAccentDefault: "oklch(0.68 0.22 275)",
  interactiveAccentHover: "oklch(0.74 0.21 275)",
  interactiveAccentPressed: "oklch(0.62 0.20 275)",
  textBrand: "oklch(0.78 0.18 275)",
  textNeutralPrimary: "oklch(0.96 0.008 265)",
  textNeutralSecondary: "oklch(0.72 0.02 265)",
  textNeutralTertiary: "oklch(0.52 0.02 265)",
  chatUserResponseBg: "oklch(0.22 0.035 275)",
  chatUserResponseText: "oklch(0.97 0.008 265)",
  highlight: "oklch(0.24 0.035 275)",
  highlightSubtle: "oklch(0.18 0.022 275)",
  radiusM: "10px",
  radiusL: "14px",
  radiusXl: "18px",
  defaultChartPalette: CHART_PALETTE_DARK,
}
