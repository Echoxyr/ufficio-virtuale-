/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontSize: {
        'touch': ['18px', '1.4'],
      },
      spacing: {
        'touch': '44px',
      }
    },
  },
  plugins: [],
}
