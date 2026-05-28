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
        primary: '#0c7c73',
        'primary-active': '#075f59',
        'primary-disabled': '#99f6e4',
        accent: '#b7791f',
        'accent-soft': '#fff1d6',
        ink: '#142b28',
        body: '#314844',
        muted: '#5f746f',
        'muted-soft': '#7f9690',
        hairline: '#c9ddd6',
        'hairline-soft': '#e5f0ec',
        canvas: '#eef7f3',
        'surface-soft': '#e6f1ed',
        'surface-card': '#d8ebe4',
        'surface-strong': '#c2d9d1',
        sidebar: '#0e3a36',
        'sidebar-elevated': '#14554e',
        'sidebar-border': '#21665d',
        'sidebar-text': '#bdd9d3',
        'sidebar-text-active': '#ffffff',
        'on-primary': '#ffffff',
        success: '#047857',
        'success-bg': '#dff8ed',
        'success-text': '#075f48',
        warning: '#b45309',
        'warning-bg': '#fff4d8',
        'warning-text': '#7a3d05',
        error: '#dc2626',
        'error-bg': '#fee2e2',
        'error-text': '#991b1b',
        info: '#2563eb',
        'info-bg': '#dbeafe',
        'info-text': '#1e40af',
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
