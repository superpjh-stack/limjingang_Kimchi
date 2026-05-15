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
        // 🌶️ 김치 레드 — Kimchi Red (primary brand)
        primary: {
          DEFAULT: '#DC2626',
          50:  '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#DC2626',
          600: '#B91C1C',
          700: '#991B1B',
          800: '#7F1D1D',
          900: '#450A0A',
        },
        // 🌿 파 블루시안 — Scallion Blue-Cyan (secondary brand)
        scallion: {
          DEFAULT: '#0891B2',
          50:  '#ECFEFF',
          100: '#CFFAFE',
          200: '#A5F3FC',
          300: '#67E8F9',
          400: '#22D3EE',
          500: '#0891B2',
          600: '#0E7490',
          700: '#155E75',
          800: '#164E63',
          900: '#0C2D3D',
        },
        // 사이드바 — 파 딥 오션
        sidebar: {
          bg:           '#0C2D3D',
          hover:        '#143D50',
          active:       '#DC2626',
          text:         '#E0F7FF',
          'text-muted': '#7DD3FC',
        },
        // 성공 / 위험 / 경고
        success: {
          DEFAULT: '#16A34A',
          50:  '#F0FDF4',
          100: '#DCFCE7',
          500: '#16A34A',
          600: '#15803D',
        },
        danger: {
          DEFAULT: '#DC2626',
          50:  '#FEF2F2',
          100: '#FEE2E2',
          500: '#DC2626',
          600: '#B91C1C',
        },
        warning: {
          DEFAULT: '#D97706',
          50:  '#FFFBEB',
          100: '#FEF3C7',
          500: '#D97706',
          600: '#B45309',
        },
        // 중립 슬레이트
        neutral: {
          50:  '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
      },
      fontFamily: {
        sans:  ['"Pretendard Variable"', 'Pretendard', '"Apple SD Gothic Neo"', '"Malgun Gothic"', '-apple-system', 'BlinkMacSystemFont', 'Helvetica', 'Arial', 'sans-serif'],
        serif: ['"Pretendard Variable"', 'Pretendard', 'serif'],
        mono:  ['"JetBrains Mono"', '"SF Mono"', 'ui-monospace', 'Menlo', 'monospace'],
      },
      backgroundImage: {
        'wave-red': `repeating-linear-gradient(
          135deg,
          transparent,
          transparent 18px,
          rgba(220,38,38,0.04) 18px,
          rgba(220,38,38,0.04) 19px
        )`,
        'wave-teal': `repeating-linear-gradient(
          135deg,
          transparent,
          transparent 18px,
          rgba(8,145,178,0.04) 18px,
          rgba(8,145,178,0.04) 19px
        )`,
      },
    },
  },
  plugins: [],
}
export default config
