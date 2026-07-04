import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        arc: {
          navy:      "#1e2464",
          navy2:     "#161b4e",
          navy3:     "#0f123a",
          navy9:     "#141738",
          navy7:     "#2b327f",
          blue:      "#8899cc",
          bluePale:  "#b8c4e0",
          blueBg:    "#eef1f8",
          gold:      "#C9A227",
          goldSoft:  "#E6C763",
          goldLight: "#f5e6b8",
          goldDark:  "#92400e",
          cream:     "#FAF7F0",
          paper:     "#ffffff",
          ink:       "#1a1c2e",
          muted:     "#6b6f86",
          line:      "rgba(30,36,100,0.12)",
          bg:        "#f4f5fa",
          text:      "#1a1d3a",
          text2:     "#4a5070",
          text3:     "#8890aa",
          border:    "rgba(30,36,100,0.09)",
          red:       "#e53e3e",
          green:     "#2f855a",
        },
      },
      fontFamily: {
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
        sans:  ["var(--font-manrope)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        "8xl": "1240px",
      },
      boxShadow: {
        arc:       "0 8px 32px rgba(30,36,100,0.12)",
        "arc-dark": "0 20px 60px rgba(0,0,0,0.35)",
        "arc-gold": "0 14px 30px rgba(201,162,39,0.34)",
      },
      borderRadius: {
        arc: "16px",
      },
      animation: {
        marquee: "arcMarquee 26s linear infinite",
        pulse2:  "arcPulse 1.6s ease-in-out infinite",
        float:   "arcFloat 6s ease-in-out infinite",
        ring:    "arcRing 2.4s ease-out infinite",
        blink:   "blink 1.2s infinite",
      },
    },
  },
  plugins: [],
};
export default config;
