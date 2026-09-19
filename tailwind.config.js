/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#3B82F6',
          dark: '#60A5FA',
          DEFAULT: '#3B82F6',
        },
        background: {
          light: '#FFFFFF',
          dark: '#1A1A2E',
          DEFAULT: '#FFFFFF',
        },
        foreground: {
          light: '#1A1A2E',
          dark: '#E4E4E7',
          DEFAULT: '#1A1A2E',
        },
        muted: {
          DEFAULT: '#71717A',
        },
        success: {
          DEFAULT: '#10B981',
        },
        warning: {
          DEFAULT: '#F59E0B',
        },
        error: {
          DEFAULT: '#EF4444',
        },
        border: {
          light: '#E4E4E7',
          dark: '#27272A',
          DEFAULT: '#E4E4E7',
        },
      },
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