/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './evm/**/*.{js,ts,jsx,tsx,mdx}',
    './solana/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // This activates the .dark class-based dark mode
  theme: {
    extend: {
      colors: {
        dark: {
          100: '#e6e6e6',
          200: '#cccccc',
          300: '#b3b3b3',
          400: '#999999',
          500: '#808080',
          600: '#666666',
          700: '#1a1a24', // Panel background
          800: '#151520', // Darker shade for gradient
          900: '#0f0f1a',  // Background
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};
