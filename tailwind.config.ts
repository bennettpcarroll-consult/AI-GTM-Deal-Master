import type { Config } from 'tailwindcss';

/** Colours and type follow the Profit, Not Pilots design system. Pillar accents come from the rubric JSON. */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#ffffff',
        deep: '#f4f5f7',
        ink: '#0e1116',
        charcoal: '#1e2229',
        slate: '#5e6672',
        rule: 'rgb(14 17 22 / 0.08)',
        'rule-strong': 'rgb(14 17 22 / 0.18)',
        hairline: 'rgb(14 20 34 / 0.09)',
        value: { DEFAULT: '#ff9e6b', soft: '#fff0e8', ink: '#b85a24' },
        work: { DEFAULT: '#4c9dff', soft: '#e8f2ff', ink: '#1f6fd1' },
        people: { DEFAULT: '#c77dff', soft: '#f6ebff', ink: '#8a3cc7' },
        scale: { DEFAULT: '#2ec4a6', soft: '#e2f8f3', ink: '#12806b' },
        profit: { DEFAULT: '#0b9f6e', soft: '#ddf5ec', ink: '#08734f' },
        leak: { DEFAULT: '#f03e3e', soft: '#ffe6e6', ink: '#c92a2a' }
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Geist Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      borderRadius: { card: '28px', panel: '16px' },
      boxShadow: {
        lift: '0 1px 1px rgb(14 20 34 / 0.04), 0 8px 20px -12px rgb(14 20 34 / 0.3)',
        card: '0 1px 2px rgb(14 20 34 / 0.05), 0 8px 24px -14px rgb(14 20 34 / 0.1), 0 32px 64px -32px rgb(14 20 34 / 0.18)',
        float: '0 2px 4px rgb(14 20 34 / 0.04), 0 12px 32px -16px rgb(14 20 34 / 0.16), 0 32px 72px -32px rgb(14 20 34 / 0.34)'
      },
      keyframes: {
        rise: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        drop: { from: { transform: 'translateY(-6px)' }, to: { transform: 'translateY(0)' } },
        pop: { '0%': { transform: 'scale(0.9)' }, '60%': { transform: 'scale(1.04)' }, '100%': { transform: 'scale(1)' } }
      },
      animation: { rise: 'rise 240ms ease-out both', drop: 'drop 160ms ease-out both', pop: 'pop 320ms ease-out both' }
    }
  },
  plugins: []
};

export default config;
