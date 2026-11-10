/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        brand: { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81' },
        ink: { 900: '#0f1222', 950: '#090b17' },
      },
      boxShadow: {
        soft: '0 1px 2px rgb(16 24 40 / .04), 0 6px 20px -6px rgb(16 24 40 / .10)',
        glow: '0 10px 40px -10px rgb(79 70 229 / .55)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        pulsering: { '0%': { transform: 'scale(.8)', opacity: '.8' }, '100%': { transform: 'scale(2.2)', opacity: '0' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        float: 'float 5s ease-in-out infinite',
        pulsering: 'pulsering 1.6s ease-out infinite',
      },
    },
  },
  plugins: [],
};
