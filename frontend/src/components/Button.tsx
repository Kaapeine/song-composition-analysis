import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost' | 'icon'
  children: React.ReactNode
}

export function Button({ variant = 'default', className = '', children, ...rest }: ButtonProps) {
  const cls = [
    'btn',
    variant === 'primary' ? 'primary' : '',
    variant === 'ghost' ? 'ghost' : '',
    variant === 'icon' ? 'icon-only' : '',
    className,
  ].filter(Boolean).join(' ')
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  )
}
