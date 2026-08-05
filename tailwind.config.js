/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1B2430',
        paper: '#F7F5F1',
        slate: '#5C6470',
        line: '#D8D4CB',
        signal: '#E8A33D',
        clay: '#C1554D',
        moss: '#5F7A61',
        // Portal theme colors
        'portal-nav': '#001433',
        'portal-bg': '#f4f7fb',
        // Slightly lighter accent for focus/selection
        'portal-accent': '#002a66',
        'portal-paper': '#ffffff',
      },
      fontFamily: {
        sans: ['"Segoe UI Variable"', '"Segoe UI"', 'sans-serif'],
        display: ['"Segoe UI Variable"', '"Segoe UI"', 'sans-serif'],
        body: ['"Segoe UI Variable"', '"Segoe UI"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        sm: '2px',
      },
    },
  },
  plugins: [],
}
