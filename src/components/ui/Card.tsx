import { type ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: boolean
}

export function Card({ children, className = '', padding = true }: CardProps) {
  return (
    <div className={`bg-white/95 border border-hairline rounded-lg shadow-sm shadow-primary/10 ${padding ? 'p-6' : ''} ${className}`}>
      {children}
    </div>
  )
}
