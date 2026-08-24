import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        dalili: {
          navy: "#0E1B2D",
          green: "#0FA67A",
          mint: "#4CC9A0",
          gold: "#F5B400",
          cloud: "#F2F4F7",
          ink: "#102033",
        },
      },
      boxShadow: {
        soft: "0 16px 45px rgba(14, 27, 45, 0.08)",
      },
    },
  },
  plugins: [],
};
export default config;
