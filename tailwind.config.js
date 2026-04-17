/** @type {import('tailwindcss').Config} */
export default {
  // Dark mode piloté par la classe `dark` sur <html>, gérée par useThemeable.
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
