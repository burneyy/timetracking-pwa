import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'
import { clsx } from 'clsx'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  PropsWithChildren<{
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  }>

export function Button({
  className,
  variant = 'secondary',
  type = 'button',
  ...props
}: ButtonProps) {
  return <button className={clsx('button', `button-${variant}`, className)} type={type} {...props} />
}
