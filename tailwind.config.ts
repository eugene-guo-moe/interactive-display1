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
        // Premium Luxury theme
        primary: '#D4AF37',      // Luxury gold
        secondary: '#F7E7CE',    // Champagne
        accent: '#C0C0C0',       // Silver

        // Past/Future accents
        past: '#B8860B',         // Dark gold
        future: '#E5E4E2',       // Platinum

        // Luxury gold shades
        gold: {
          DEFAULT: '#D4AF37',
          light: '#F7E7CE',
          dark: '#B8860B',
        },

        // Luxury silver/platinum shades
        silver: {
          DEFAULT: '#C0C0C0',
          light: '#E5E4E2',
          dark: '#A8A8A8',
        },

        // Backgrounds - Deep blacks
        'sg-dark': '#0A0A0A',    // Pure dark
        'sg-surface': '#141414', // Dark surface
        'sg-border': '#2A2A2A',  // Subtle border

        // Text
        'sg-text': '#FFFFFF',
        'sg-text-muted': '#8A8A8A',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 4s ease-in-out infinite',
        'luxury-reveal': 'luxuryReveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'gold-shimmer': 'goldShimmer 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        luxuryReveal: {
          from: { opacity: '0', transform: 'translateY(20px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        goldShimmer: {
          '0%, 100%': { opacity: '0.8' },
          '50%': { opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
export default config
