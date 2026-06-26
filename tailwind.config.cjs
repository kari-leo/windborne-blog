/** @type {import('tailwindcss').Config} */
const defaultTheme = require("tailwindcss/defaultTheme")
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue,mjs}"],
  darkMode: "class", // allows toggling dark mode manually
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "sans-serif", ...defaultTheme.fontFamily.sans],
        mono: ["Geist Mono", "JetBrains Mono Variable", "ui-monospace", ...defaultTheme.fontFamily.mono],
        serif: ["Instrument Serif", "Georgia", "Cambria", ...defaultTheme.fontFamily.serif],
      },
      letterSpacing: {
        tighter: "-0.03em",
        tight: "-0.015em",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
}
