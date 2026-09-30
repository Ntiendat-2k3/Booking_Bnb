/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,jsx}",
    "./src/components/**/*.{js,jsx}",
    "./src/features/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "rgb(var(--color-accent) / <alpha-value>)",
          dark: "rgb(var(--color-accent-strong) / <alpha-value>)",
        },
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        "on-ink": "rgb(var(--color-on-ink) / <alpha-value>)",
        "on-brand": "rgb(var(--color-on-accent) / <alpha-value>)",
        "on-danger": "rgb(var(--color-on-danger) / <alpha-value>)",
        "muted-ink": "rgb(var(--color-muted-ink) / <alpha-value>)",
        canvas: "rgb(var(--color-canvas) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        "muted-surface": "rgb(var(--color-muted-surface) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
        positive: "rgb(var(--color-positive) / <alpha-value>)",
        caution: "rgb(var(--color-caution) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)",
      },
      fontFamily: {
        sans: [
          "var(--font-be-vietnam-pro)",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        float: "var(--shadow-float)",
      },
      borderRadius: {
        xl: "var(--radius-control)",
        "2xl": "var(--radius-panel)",
        "3xl": "var(--radius-feature)",
        control: "var(--radius-control)",
        panel: "var(--radius-panel)",
        feature: "var(--radius-feature)",
      },
    },
  },
  plugins: [],
};
