import { type ReactNode } from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info'

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface-card text-body border border-hairline',
  success: 'bg-success-bg text-success-text border border-success/20',
  warning: 'bg-warning-bg text-warning-text border border-warning/20',
  error:   'bg-error-bg text-error-text border border-error/20',
  info:    'bg-info-bg text-info-text border border-info/20',
}

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  )
}
