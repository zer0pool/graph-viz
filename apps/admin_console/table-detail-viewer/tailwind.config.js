/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1a73e8",
          foreground: "#ffffff",
        },
        border: "#d0d7de",
        background: "#ffffff",
      },
    },
  },
  plugins: [],
};
