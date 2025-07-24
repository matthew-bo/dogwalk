/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          750: '#334155',
          850: '#1e293b',
          950: '#0f172a'
        }
      },
      animation: {
        'bounce-dog': 'bounce-dog 2s ease-in-out infinite',
        'wiggle': 'wiggle 0.5s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite'
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')
  ],
} 