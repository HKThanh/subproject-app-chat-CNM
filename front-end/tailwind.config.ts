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
        primary: {
          50: "#f8fafc",
          // ... add more shades as needed
          900: "#0f172a",
        },
      },
      keyframes: {
        shine: {
          "0%": { backgroundPosition: "0% 0%" },
          "50%": { backgroundPosition: "135% 50%" },
          "100%": { backgroundPosition: "0% 0%" },
        },
        // Add more custom animations if needed
      },
      animation: {
        shine: "shine var(--duration, 14s) linear infinite",
        // Add more custom animations if needed
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui"],
        // Add more custom fonts if needed
      },
      screens: {
        xs: "480px",
        // Add more custom breakpoints if needed
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("@tailwindcss/forms"),
    // Add more plugins as needed
  ],
  darkMode: "class", // Enable dark mode
};

export default config;