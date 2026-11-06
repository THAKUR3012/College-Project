import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./app/**/{**,.client,.server}/**/*.{js,jsx,ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        brand: {
          50: "#fdf3f3",
          100: "#fce6e6",
          200: "#facdcc",
          300: "#f5a7a5",
          400: "#ec6f6b",
          500: "#af1711",
          600: "#7d100b",
          700: "#670d09",
          800: "#520b07",
          900: "#3e0805",
          950: "#220403",
          DEFAULT: "#7d100b",
          foreground: "#ffffff",
        },
        blue: {
          50: "#fdf3f3",
          100: "#fce6e6",
          200: "#facdcc",
          300: "#f5a7a5",
          400: "#ec6f6b",
          500: "#af1711",
          600: "#7d100b",
          700: "#670d09",
          800: "#520b07",
          900: "#3e0805",
          950: "#220403",
          DEFAULT: "#7d100b",
        },
        slate: {
          50: "#f5f8fc",
          900: "#2b2b2b",
        },
        kessc: {
          primary: "#7d100b",
          bg: "#f5f8fc",
          text: "#2b2b2b",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success, 142 76% 36%))",
          foreground: "hsl(var(--success-foreground, 355 100% 97%))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning, 38 92% 50%))",
          foreground: "hsl(var(--warning-foreground, 48 96% 89%))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
} satisfies Config;
