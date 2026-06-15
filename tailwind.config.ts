import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      colors: {
        ink: {
          bg: "#0f1115",
          panel: "#161922",
          panel2: "#1d2230",
          border: "#2a3142",
          text: "#e6e9ef",
          dim: "#9aa4b8",
          accent: "#7aa2f7",
          accent2: "#bb9af7",
          ta: "#1a1f2b",
          tb: "#23283a",
          ok: "#9ece6a",
          warn: "#e0af68",
          danger: "#f7768e",
        },
      },
    },
  },
  plugins: [],
};

export default config;
