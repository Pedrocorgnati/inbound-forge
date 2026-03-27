import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-muted text-foreground',
        primary: 'bg-primary-light text-primary',
        success: 'bg-success-bg text-[#065F46]',
        warning: 'bg-warning-bg text-[#92400E]',
        danger: 'bg-danger-bg text-[#991B1B]',
        error: 'bg-error-bg text-[#991B1B]',
        info: 'bg-info-bg text-[#1E40AF]',
        // Channel badges
        instagram: 'bg-[#FCE7F3] text-[#9D174D]',
        linkedin: 'bg-[#DBEAFE] text-[#1E40AF]',
        blog: 'bg-[#D1FAE5] text-[#065F46]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
