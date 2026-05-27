import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-ink">
            {label}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          className={`
            h-10 px-3.5 rounded-md border border-hairline bg-white text-ink text-sm
            placeholder:text-muted-soft
            focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink
            disabled:bg-surface-soft disabled:text-muted disabled:cursor-not-allowed
            ${error ? 'border-error focus:border-error focus:ring-error' : ''}
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-ink">
            {label}
          </label>
        )}
        <textarea
          id={id}
          ref={ref}
          className={`
            px-3.5 py-2.5 rounded-md border border-hairline bg-white text-ink text-sm
            placeholder:text-muted-soft
            focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink
            disabled:bg-surface-soft disabled:text-muted disabled:cursor-not-allowed
            resize-none
            ${error ? 'border-error focus:border-error focus:ring-error' : ''}
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
