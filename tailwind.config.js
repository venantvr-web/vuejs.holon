/** @type {import('tailwindcss').Config} */
export default {
  // Dark mode piloté par la classe `dark` sur <html>, gérée par useThemeable.
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Piles de polices alignées sur les variables CSS de src/style.css.
      fontFamily: {
        sans: [
          "'Inter Variable'",
          'Inter',
          'system-ui',
          '-apple-system',
          "'Segoe UI'",
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          "'SF Mono'",
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          "'Liberation Mono'",
          'monospace',
        ],
      },
      // Rayons et ombres mappés sur les design tokens (thème jour/nuit).
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        sm: 'var(--shadow-1)',
        DEFAULT: 'var(--shadow-1)',
        md: 'var(--shadow-2)',
        lg: 'var(--shadow-2)',
        xl: 'var(--shadow-3)',
        '2xl': 'var(--shadow-3)',
      },
    },
  },
  plugins: [],
}
