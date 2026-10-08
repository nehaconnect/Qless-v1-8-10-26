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
        background: "#F6F8FC",
        surface: "#FFFFFF",
        "soft-blue": "#EAF2FF",
        "primary-blue": "#3B82F6",
        "deep-blue": "#2563EB",
        "soft-lavender": "#EEF0FF",
        "indigo-accent": "#6366F1",
        "text-primary": "#0F172A",
        "text-secondary": "#64748B",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
      },
      boxShadow: {
        soft: "0 2px 10px rgba(59, 130, 246, 0.08)",
        tactile: "0 4px 14px rgba(37, 99, 235, 0.16)",
        card: "0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
