/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      spacing: {
        navbar: "48px",
        sidebar: "200px",
      },
      height: {
        navbar: "48px",
      },
      width: {
        sidebar: "200px",
      },
      colors: {
        primary: {
          DEFAULT: "#1a73e8",
          foreground: "#ffffff",
        },
        sidebar: {
          DEFAULT: "#ffffff",
          foreground: "#24292f",
          accent: "#f6f8fa",
        },
        border: "#d0d7de",
        background: "#f6f8fa",
        foreground: "#24292f",
      },
    },
  },
  plugins: [],
};
