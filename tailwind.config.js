/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#006C75",
        "background-light": "#f8fafc",
        "background-dark": "#0a0a0a",
        "surface-dark": "#1a1a1a",
      },
      fontFamily: {
        "sans": ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        "inter": ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      fontSize: {
        'xs': '0.7rem',
        'sm': '0.8rem',
        'base': '0.875rem',
        'lg': '1rem',
        'xl': '1.125rem',
        '2xl': '1.375rem',
        '3xl': '1.75rem',
        '4xl': '2rem',
      }
    },
  },
  plugins: [],
}
