import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'display': ['Clash Display', 'system-ui', 'sans-serif'],
        'sans': ['Satoshi', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Singapore Night theme
        primary: '#06B6D4',      // Cyan - Marina Bay lights
        secondary: '#F472B6',    // Pink - city neon
        accent: '#A855F7',       // Purple glow

        // Past/Future accents
        past: '#F59E0B',         // Warm amber
        future: '#06B6D4',       // Cool cyan

        // Backgrounds
        'sg-dark': '#0C0A1D',    // Deep purple-black
        'sg-surface': '#1A1730', // Muted purple surface
        'sg-border': '#2D2A4A',  // Border color

        // Text
        'sg-text': '#FFFFFF',
        'sg-text-muted': '#9CA3AF',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
export default config
