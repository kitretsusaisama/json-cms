'use client';

import React from 'react';
import Link from 'next/link';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      href,
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = '',
      disabled,
      ...props
    },
    ref
  ): JSX.Element => {
    const baseClasses =
      'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

    const variantClasses: Record<ButtonVariant, string> = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
      secondary: 'bg-secondary-600 text-white hover:bg-secondary-700 active:bg-secondary-800',
      outline:
        'border border-neutral-300 bg-transparent hover:bg-neutral-100 active:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800 dark:active:bg-neutral-700',
      ghost: 'bg-transparent hover:bg-neutral-100 active:bg-neutral-200 dark:hover:bg-neutral-800 dark:active:bg-neutral-700',
      destructive: 'bg-error-600 text-white hover:bg-error-700 active:bg-error-800',
    };

    const sizeClasses: Record<ButtonSize, string> = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 py-2 text-sm',
      lg: 'h-12 px-6 py-3 text-base',
      xl: 'h-14 px-8 py-4 text-lg',
    };

    const widthClasses = fullWidth ? 'w-full' : '';
    const buttonClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClasses} ${className}`;

    const loadingSpinner = (
      <svg
        className="mr-2 h-4 w-4 animate-spin"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );

    const buttonContent = (
      <>
        {isLoading && loadingSpinner}
        {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </>
    );

    if (href) {
      return (
        <Link href={href} className={buttonClasses} {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
          {buttonContent}
        </Link>
      );
    }

    return (
      <button ref={ref} className={buttonClasses} disabled={disabled || isLoading} {...props}>
        {buttonContent}
      </button>
    );
  }
);

Button.displayName = 'Button';