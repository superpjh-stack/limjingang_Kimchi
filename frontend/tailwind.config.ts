import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1A73E8',
          50: '#E8F1FD',
          100: '#C5D9FA',
          200: '#9DBEF6',
          300: '#74A3F2',
          400: '#4C88EE',
          500: '#1A73E8',
          600: '#1557B0',
          700: '#103D7A',
          800: '#0B2A55',
          900: '#061730',
        },
        danger: {
          DEFAULT: '#EA4335',
          50: '#FDE9E7',
          100: '#FAC8C3',
          200: '#F6A09A',
          300: '#F27870',
          400: '#EE5F52',
          500: '#EA4335',
          600: '#C73628',
          700: '#9E2A1F',
          800: '#751F17',
          900: '#4D140F',
        },
        success: {
          DEFAULT: '#34A853',
          50: '#E6F4EA',
          100: '#CEEBDA',
          200: '#9DD7B4',
          300: '#6CC38F',
          400: '#4DB570',
          500: '#34A853',
          600: '#2A8A43',
          700: '#1F6B34',
          800: '#154D25',
          900: '#0A2E15',
        },
        warning: {
          DEFAULT: '#FBBC04',
          50: '#FFF8E1',
          100: '#FFECB3',
          200: '#FFE082',
          300: '#FFD54F',
          400: '#FFCA28',
          500: '#FBBC04',
          600: '#F9A825',
          700: '#F57F17',
          800: '#E65100',
          900: '#BF360C',
        },
        sidebar: {
          bg: '#1F497D',
          hover: '#2A5E9E',
          active: '#1A73E8',
          text: '#FFFFFF',
          'text-muted': '#A8C4E0',
        },
      },
      fontFamily: {
        sans: ['Noto Sans KR', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
