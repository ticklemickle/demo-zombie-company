import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          950: "#06142A",
          900: "#0B1F3A",
          850: "#0E2A4B",
          800: "#10335C",
          700: "#184B82",
        },
      },
      boxShadow: {
        soft: "0 10px 30px rgba(2, 12, 27, .10)",
      },
    },
  },
  plugins: [],
} satisfies Config;
