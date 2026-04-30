/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Apple Design System Colors
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
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
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
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Apple-specific colors
        apple: {
          blue: "#007AFF",
          "blue-dark": "#0051D5",
          purple: "#AF52DE",
          "purple-dark": "#8944AB",
          pink: "#FF2D55",
          "pink-dark": "#D1224E",
          red: "#FF3B30",
          "red-dark": "#D63126",
          orange: "#FF9500",
          "orange-dark": "#D67E00",
          yellow: "#FFCC00",
          "yellow-dark": "#D6AB00",
          green: "#34C759",
          "green-dark": "#2BA84A",
          teal: "#5AC8FA",
          "teal-dark": "#4BA8D4",
          indigo: "#5856D6",
          "indigo-dark": "#4845B5",
          gray: "#8E8E93",
          "gray-2": "#AEAEB2",
          "gray-3": "#C7C7CC",
          "gray-4": "#D1D1D6",
          "gray-5": "#E5E5EA",
          "gray-6": "#F2F2F7",
          "bg-light": "#FAFAFC",
          "bg-dark": "#1C1C1E",
          "card-light": "#FFFFFF",
          "card-dark": "#2C2C2E",
        },
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        // Apple Design System - Subtle layered shadows
        apple: "0 0.5px 1px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.03), 0 4px 8px rgba(0, 0, 0, 0.02)",
        "apple-md": "0 0.5px 1px rgba(0, 0, 0, 0.05), 0 4px 8px rgba(0, 0, 0, 0.04), 0 8px 16px rgba(0, 0, 0, 0.03)",
        "apple-lg": "0 0.5px 1px rgba(0, 0, 0, 0.06), 0 4px 8px rgba(0, 0, 0, 0.05), 0 8px 16px rgba(0, 0, 0, 0.04), 0 16px 32px rgba(0, 0, 0, 0.03)",
        "apple-xl": "0 0.5px 1px rgba(0, 0, 0, 0.08), 0 8px 16px rgba(0, 0, 0, 0.06), 0 16px 32px rgba(0, 0, 0, 0.04), 0 32px 64px rgba(0, 0, 0, 0.02)",
        "apple-glow": "0 0 0 3px hsla(var(--primary), 0.15)",
        // Glass card shadow
        "glass": "0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 8px rgba(0, 0, 0, 0.04), 0 8px 16px rgba(0, 0, 0, 0.02)",
        "glass-dark": "0 1px 2px rgba(0, 0, 0, 0.2), 0 4px 8px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1)",
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', '"Segoe UI"', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Segoe UI"', '"PingFang SC"', 'sans-serif'],
        text: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"Segoe UI"', '"PingFang SC"', 'sans-serif'],
        mono: ['"SF Mono"', '"SFMono-Regular"', '"Menlo"', '"Monaco"', '"Consolas"', '"Liberation Mono"', '"Courier New"', 'monospace'],
      },
      transitionTimingFunction: {
        apple: "cubic-bezier(0.25, 0.1, 0.25, 1)",
        "apple-bounce": "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "apple-smooth": "cubic-bezier(0.4, 0.0, 0.2, 1)",
      },
      backdropBlur: {
        apple: "20px",
      },
      saturate: {
        apple: "180%",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
