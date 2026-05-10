/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B2C21', // Dark Forest Green
          light: '#2D4A38',
          dark: '#0F1A14',
        },
        secondary: {
          DEFAULT: '#88B04B', // Sage/Leaf Green
          light: '#A3C677',
          dark: '#6D8E3C',
        },
        accent: {
          DEFAULT: '#F5A623', // Warm Orange/Gold
          light: '#F7B84B',
          dark: '#C4851C',
        },
        background: {
          DEFAULT: '#F8F9FA',
          dark: '#E9ECEF',
        }
      },
    },
  },
  plugins: [],
}
