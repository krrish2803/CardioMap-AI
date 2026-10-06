/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#070B14',
        surface: {
          DEFAULT: '#0D1527',
          elevated: '#131F37',
          card: '#0F1A30',
        },
        border: {
          DEFAULT: '#1E2D4A',
          subtle: '#152138',
          glow: '#00F0FF33',
        },
        cyan: {
          accent: '#00F0FF',
          glow: '#38BDF8',
          dark: '#0284C7',
        },
        risk: {
          minimal: '#3B82F6', // Blue
          mild: '#FACC15',    // Yellow
          moderate: '#FB923C',// Orange
          severe: '#D946EF',  // Magenta / Fuchsia
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 25px -5px rgba(0, 240, 255, 0.3)',
        'glow-lg': '0 0 45px -5px rgba(0, 240, 255, 0.4)',
        'risk-glow': '0 0 25px -5px var(--risk-glow-color, rgba(217, 70, 239, 0.4))',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
