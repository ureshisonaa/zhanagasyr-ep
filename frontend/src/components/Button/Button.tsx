import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-ink-900 text-ink-0 hover:bg-ink-700',
  secondary: 'bg-ink-100 text-ink-900 hover:bg-ink-200',
  danger: 'bg-danger text-ink-0 hover:opacity-90',
};

const BASE_CLASSES =
  'inline-flex items-center justify-center rounded px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50';

export function Button({
  variant = 'primary',
  className = '',
  disabled = false,
  ...rest
}: ButtonProps): JSX.Element {
  return (
    <button
      className={`${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${className}`}
      disabled={disabled}
      {...rest}
    />
  );
}
