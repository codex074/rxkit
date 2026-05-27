import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sarabun', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        inter: ['Inter', 'ui-sans-serif', 'sans-serif'],
      },
      colors: {
        primary: '#111111',
        'primary-active': '#242424',
        'primary-disabled': '#e5e7eb',
        ink: '#111111',
        body: '#374151',
        muted: '#6b7280',
        'muted-soft': '#898989',
        hairline: '#e5e7eb',
        'hairline-soft': '#f3f4f6',
        canvas: '#ffffff',
        'surface-soft': '#f8f9fa',
        'surface-card': '#f5f5f5',
        'surface-strong': '#e5e7eb',
        'surface-dark': '#101010',
        'surface-dark-elevated': '#1a1a1a',
        'on-primary': '#ffffff',
        'on-dark': '#ffffff',
        'on-dark-soft': '#a1a1aa',
        'brand-accent': '#3b82f6',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
    },
  },
  plugins: [],
}

export default config
