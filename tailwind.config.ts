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
        primary: '#2563eb',
        'primary-active': '#1d4ed8',
        'primary-disabled': '#bfdbfe',
        ink: '#111827',
        body: '#374151',
        muted: '#6b7280',
        'muted-soft': '#9ca3af',
        hairline: '#e5e7eb',
        'hairline-soft': '#f3f4f6',
        canvas: '#ffffff',
        'surface-soft': '#f8fafc',
        'surface-card': '#f1f5f9',
        'surface-strong': '#e2e8f0',
        sidebar: '#0f172a',
        'sidebar-elevated': '#1e293b',
        'sidebar-border': '#1e293b',
        'sidebar-text': '#94a3b8',
        'sidebar-text-active': '#ffffff',
        'on-primary': '#ffffff',
        success: '#059669',
        'success-bg': '#d1fae5',
        'success-text': '#065f46',
        warning: '#d97706',
        'warning-bg': '#fef3c7',
        'warning-text': '#92400e',
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
