/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        dark: {
          bg: "#0f0f1a",
          card: "#1a1a2e",
          surface: "#16213e",
          border: "#2d2d4e",
          text: "#e2e8f0",
          muted: "#94a3b8",
        },
        sepia: {
          bg: "#f4e8d0",
          card: "#ede0c4",
          surface: "#e8d5b0",
          text: "#3d2b1f",
        },
      },
      fontFamily: {
        serif: ["Georgia", "serif"],
        mono: ["Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};
