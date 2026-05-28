import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/app/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background:   'hsl(var(--background))',
        foreground:   'hsl(var(--foreground))',
        card:         { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        popover:      { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        primary:      { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary:    { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted:        { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent:       { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive:  { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        border:       'hsl(var(--border))',
        input:        'hsl(var(--input))',
        ring:         'hsl(var(--ring))',

        /* Legacy brand tokens — keep for admin compatibility */
        sand:            { DEFAULT: '#F5EFE0', light: '#FAF7F2', dark: '#E8DCC8' },
        terracotta:      { DEFAULT: '#C4622D', dark: '#A84F23', light: '#F0D4C4' },
        sage:            { DEFAULT: '#7A9E7E', light: '#C5D9C6' },
        'warm-brown':    '#3D2B1F',
        'warm-charcoal': '#5C4033',
        'brand-muted':   '#9A8778',
        'brand-border':  '#DDD4C5',

        /* New premium tokens */
        gold:   { DEFAULT: '#CA8A04', light: '#FEF9EC', dark: '#92400E', muted: '#D97706' },
        'stone-950': '#0C0A09',
        'stone-900': '#1C1917',
        'stone-800': '#292524',
        'stone-700': '#44403C',
        'stone-600': '#57534E',
        'stone-500': '#78716C',
        'stone-400': '#A8A29E',
        'stone-300': '#D6D3D1',
        'stone-200': '#E7E5E4',
        'stone-100': '#F5F5F4',
        'stone-50':  '#FAFAF9',
      },
      fontFamily: {
        sans:   ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        arabic: ['var(--font-ibm-plex-arabic)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'heading-xl': ['2.75rem',  { lineHeight: '1.1',  fontWeight: '700' }],
        'heading-lg': ['2rem',     { lineHeight: '1.2',  fontWeight: '700' }],
        'heading-md': ['1.375rem', { lineHeight: '1.3',  fontWeight: '600' }],
        'heading-sm': ['1.125rem', { lineHeight: '1.4',  fontWeight: '500' }],
        'body-lg':    ['1.0625rem',{ lineHeight: '1.75' }],
        'body-md':    ['1rem',     { lineHeight: '1.625' }],
        'body-sm':    ['0.875rem', { lineHeight: '1.5' }],
        caption:      ['0.75rem',  { lineHeight: '1.4' }],
      },
      maxWidth: {
        content: '1200px',
        prose:   '760px',
        auth:    '440px',
      },
      borderRadius: {
        lg:    'var(--radius)',
        md:    'calc(var(--radius) - 2px)',
        sm:    'calc(var(--radius) - 4px)',
        xl:    '12px',
        '2xl': '16px',
        '3xl': '24px',
        pill:  '999px',
      },
      boxShadow: {
        'brand-sm':  '0 1px 3px rgba(28,25,23,0.08)',
        'brand-md':  '0 4px 16px rgba(28,25,23,0.06)',
        'brand-lg':  '0 8px 32px rgba(28,25,23,0.08)',
        card:        '0 1px 2px rgba(28,25,23,0.06), 0 4px 16px rgba(28,25,23,0.04)',
        'gold-sm':   '0 4px 20px rgba(202,138,4,0.15)',
        'gold-md':   '0 8px 32px rgba(202,138,4,0.20)',
        float:       '0 2px 8px rgba(28,25,23,0.06), 0 16px 48px rgba(28,25,23,0.08)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up':   { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'fade-in':        { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'fade-in-scale':  { from: { opacity: '0', transform: 'scale(0.97)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
      animation: {
        'accordion-down':  'accordion-down 0.2s ease-out',
        'accordion-up':    'accordion-up 0.2s ease-out',
        'fade-in':         'fade-in 0.35s ease-out',
        'fade-in-scale':   'fade-in-scale 0.3s ease-out',
      },
    },
  },
  plugins: [],
}

export default config
