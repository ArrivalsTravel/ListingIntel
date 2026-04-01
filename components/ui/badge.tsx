import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        {
          'border-transparent bg-primary text-primary-foreground': variant === 'default',
          'border-transparent bg-secondary text-secondary-foreground': variant === 'secondary',
          'border-transparent bg-success text-success-foreground': variant === 'success',
          'border-transparent bg-warning text-warning-foreground': variant === 'warning',
          'border-transparent bg-destructive text-destructive-foreground': variant === 'destructive',
          'border-border text-foreground': variant === 'outline',
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
