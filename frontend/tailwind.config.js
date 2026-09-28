/** @type {import('tailwindcss').Config} */
module.exports = {
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
        soft: "0 12px 36px rgb(65 54 43 / 0.08)",
        float: "0 18px 52px rgb(65 54 43 / 0.14)",
      },
    },
  },
  plugins: [],
};
