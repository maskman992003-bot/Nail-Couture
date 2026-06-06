const { spacing, screens, maxWidth, borderRadius } = require('../../packages/shared/src/theme/layout.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        charcoal: '#121212',
        offwhite: '#F9F9F9',
        gold: '#C5A059',
        cream: '#FDF8F0',
        'soft-gray': '#E8E4DE',
        primary: 'var(--bg-primary)',
        secondary: 'var(--text-secondary)',
      },
      spacing,
      screens,
      maxWidth,
      borderRadius,
      fontFamily: {
        heading: ['Playfair Display', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
