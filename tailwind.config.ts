import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eefaf3',
          100: '#d6f2e1',
          200: '#aee4c6',
          300: '#7ad0a5',
          400: '#48b483',
          500: '#279867',
          600: '#187a52',
          700: '#146143',
          800: '#134d37',
          900: '#11402f',
        },
      },
    },
  },
  plugins: [],
};

export default config;
