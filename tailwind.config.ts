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
          blue:      "#2c3596",
          bluePale:  "#b8c4e0",
          blueBg:    "#f1f3fb",
          gold:      "#b8863b",
          goldSoft:  "#d8a94e",
          goldLight: "#f5e6b8",
          goldDark:  "#92400e",
          cream:     "#FAF7F0",
          paper:     "#ffffff",
          ink:       "#1a1d33",
          muted:     "#767c9c",
          line:      "#e6e9f4",
          bg:        "#f5f6fb",
          text:      "#22263f",
          text2:     "#5c6280",
          text3:     "#8b91b0",
          border:    "#e6e9f4",
          red:       "#e53e3e",
          green:     "#2f855a",
        },
      },
      fontFamily: {
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
        sans:  ["var(--font-manrope)", "system-ui", "sans-serif"],
        // Portage maquettes « Sacred Modernity »
        playfair: ["var(--font-playfair)", "Georgia", "serif"],
        inter:    ["var(--font-inter)", "system-ui", "sans-serif"],
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
