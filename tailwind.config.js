/** @type {import('tailwindcss').Config} */
import { colors } from './shared/ui/tokens.js'

export default {
  darkMode: 'class',
  content: ['./src/**/*.{vue,ts,tsx}', './shared/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors,
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 150ms ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
