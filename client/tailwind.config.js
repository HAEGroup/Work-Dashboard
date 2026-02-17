/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        redrock: {
          DEFAULT: '#8B2500',
          50: '#FFF5F0',
          100: '#FFE8DB',
          200: '#FFCDB3',
          300: '#FFB08A',
          400: '#D45A30',
          500: '#8B2500',
          600: '#751F00',
          700: '#5E1900',
          800: '#481300',
          900: '#310D00',
        },
        sandstone: {
          DEFAULT: '#D4A574',
          50: '#FDF8F3',
          100: '#F9EDE0',
          200: '#F0D8BD',
          300: '#E5C29A',
          400: '#D4A574',
          500: '#C18A50',
          600: '#A6703A',
          700: '#85592E',
          800: '#644323',
          900: '#432C17',
        },
        slate: {
          DEFAULT: '#2D3436',
          50: '#F0F1F1',
          100: '#D6D8D9',
          200: '#ADB1B3',
          300: '#848A8C',
          400: '#596264',
          500: '#2D3436',
          600: '#252B2D',
          700: '#1D2224',
          800: '#15191A',
          900: '#0D1011',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
