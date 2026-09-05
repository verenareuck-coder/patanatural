/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0B2A4A",
          dark: "#071B30",
          light: "#123B63",
        },
        coral: {
          DEFAULT: "#E8734A",
          dark: "#C85A34",
          light: "#F4A583",
          soft: "#FDEBE3",
        },
        ok: { bg: "#E7F6EC", text: "#1E7A42", row: "#F1FBF4" },
        warn: { bg: "#FEF3D6", text: "#92610C", row: "#FFFAEC" },
        bad: { bg: "#FBE7E7", text: "#9B2C2C", row: "#FDF3F3" },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        panel: "0 1px 2px rgba(11,42,74,0.06), 0 1px 12px rgba(11,42,74,0.05)",
      },
    },
  },
  plugins: [],
};
