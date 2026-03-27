import React from 'react'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/utils'

interface UserAvatarProps {
  name: string | null | undefined
  size?: 'sm' | 'md' | 'lg'
  className?: string
  'data-testid'?: string
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-xl',
}

export function UserAvatar({ name, size = 'sm', className, 'data-testid': dataTestId }: UserAvatarProps) {
  const initials = getInitials(name)

  return (
    <div
      role="img"
      data-testid={dataTestId}
      aria-label={`Avatar de ${name ?? 'usuário'}`}
      className={cn(
        'flex items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shrink-0 select-none',
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  )
}
