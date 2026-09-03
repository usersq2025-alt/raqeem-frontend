import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "primary-orange": "#F48232",
        "primary-orange-dark": "#D9651A",
        "text-navy": "#1A2B47",
        "text-gray": "#808080",
        "background-white": "#FFFFFF",
      },
      fontFamily: {
        sans: ["var(--font-cairo)", "var(--font-nunito)", "sans-serif"],
        "sans-ltr": ["var(--font-nunito)", "var(--font-cairo)", "sans-serif"],
      },
      animation: {
        "float-slow": "float-slow 4.8s ease-in-out infinite",
        "float-delayed": "float-slow 5.6s ease-in-out 0.8s infinite",
        "float-soft": "float-slow 6.2s ease-in-out 1.4s infinite",
        "otp-shake": "otp-shake 0.5s ease",
        "otp-pop": "otp-pop 0.22s ease",
        "otp-check": "otp-check 0.38s cubic-bezier(0.34, 1.4, 0.64, 1)",
        "success-mascot": "success-mascot 0.62s cubic-bezier(0.34, 1.45, 0.64, 1) both",
        "success-in": "success-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
      keyframes: {
        "float-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "otp-shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-6px)" },
          "40%": { transform: "translateX(6px)" },
          "60%": { transform: "translateX(-4px)" },
          "80%": { transform: "translateX(4px)" },
        },
        "otp-pop": {
          "0%": { transform: "scale(1)" },
          "45%": { transform: "scale(1.08)" },
          "100%": { transform: "scale(1)" },
        },
        "otp-check": {
          "0%": { transform: "scale(0.55)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "success-mascot": {
          "0%": { opacity: "0", transform: "scale(0.55) translateY(8px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "success-in": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
