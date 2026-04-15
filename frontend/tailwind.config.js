/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Plus Jakarta Sans'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        brand: {
          DEFAULT: "#4f46e5",
          light: "#6366f1",
          dark: "#3730a3",
          soft: "#eef2ff",
          border: "#c7d2fe",
        },
        surface: {
          DEFAULT: "#ffffff",
          soft: "#f8fafc",
          muted: "#f1f5f9",
          border: "#e2e8f0",
          hover: "#f8fafc",
        },
        tx: {
          primary: "#0f172a",
          secondary: "#475569",
          muted: "#94a3b8",
          placeholder: "#cbd5e1",
        },
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "card-hover": "0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)",
        modal: "0 20px 60px rgba(0,0,0,0.12), 0 8px 20px rgba(0,0,0,0.06)",
        btn: "0 1px 2px rgba(79,70,229,0.2)",
      },
      animation: {
        "fade-up": "fadeUp 0.3s ease forwards",
        shimmer: "shimmer 1.6s linear infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: 0, transform: "translateY(10px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
    },
  },
  plugins: [],
};
