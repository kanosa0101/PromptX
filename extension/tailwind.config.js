/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{vue,ts,html}', '../shared/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#3B82F6',
          dark: '#60A5FA'
        },
        background: {
          light: '#FFFFFF',
          dark: '#1A1A2E'
        },
        foreground: {
          light: '#1A1A2E',
          dark: '#E4E4E7'
        },
        border: {
          light: '#E5E7EB',
          dark: '#374151'
        }
      },
      animation: {
        'fade-in': 'fadeIn 150ms ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        }
      }
    }
  },
  plugins: []
}