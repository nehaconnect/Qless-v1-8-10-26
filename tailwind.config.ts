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
        background: "var(--background)",
        surface: "var(--surface)",
        "soft-blue": "var(--qless-soft-mint)",
        "primary-blue": "var(--primary-blue)",
        "deep-blue": "var(--deep-blue)",
        "soft-lavender": "var(--qless-peach)",
        "indigo-accent": "var(--accent-blue)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "qless-primary-mint": "#BFEBDD",
        "qless-soft-mint": "#DFF3E8",
        "qless-cream": "#FFF5E9",
        "qless-peach": "#FFE0C7",
        "qless-green": "#00B894",
        "qless-secondary": "#64839A",
        "qless-navy": "#073653",
        "qless-accent-blue": "#2B7BFF",
        success: "#00B894",
        warning: "#F59E0B",
        danger: "#EF4444",
      },
      boxShadow: {
        soft: "0 2px 10px rgba(7, 54, 83, 0.06)",
        tactile: "0 4px 14px rgba(7, 54, 83, 0.10)",
        card: "0 4px 20px -2px rgba(7, 54, 83, 0.05), 0 2px 6px -1px rgba(7, 54, 83, 0.03)",
      },
    },
  },
  plugins: [],
};

export default config;
