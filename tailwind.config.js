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
          light: '#71717A',
          dark: '#A1A1AA',
          DEFAULT: '#71717A',
        },
        success: {
          light: '#10B981',
          dark: '#34D399',
          DEFAULT: '#10B981',
        },
        warning: {
          light: '#F59E0B',
          dark: '#FBBF24',
          DEFAULT: '#F59E0B',
        },
        error: {
          light: '#EF4444',
          dark: '#F87171',
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
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      animation: {
        'fade-in': 'fadeIn 150ms ease-out',
        'fade-out': 'fadeOut 100ms ease-in',
        'slide-up': 'slideUp 150ms ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}