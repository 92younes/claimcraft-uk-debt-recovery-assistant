import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'warning' | 'danger' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  iconOnly?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  rightIcon,
  fullWidth = false,
  iconOnly = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white ' +
    'disabled:opacity-50 disabled:cursor-not-allowed ' +
    'shadow-soft';
  
  const variants = {
    primary:
      'bg-teal-600 enabled:hover:bg-teal-700 text-white focus-visible:ring-teal-500 shadow-lg ' +
      'motion-safe:enabled:hover:shadow-teal-500/25 motion-safe:enabled:hover:-translate-y-0.5',
    secondary:
      'bg-white enabled:hover:bg-slate-50 text-slate-700 border border-slate-200 enabled:hover:border-slate-300 focus-visible:ring-slate-300',
    warning:
      'bg-amber-500 enabled:hover:bg-amber-600 text-white focus-visible:ring-amber-500 shadow-lg ' +
      'motion-safe:enabled:hover:shadow-amber-500/25 motion-safe:enabled:hover:-translate-y-0.5',
    danger:
      'bg-red-600 enabled:hover:bg-red-700 text-white focus-visible:ring-red-500 shadow-lg motion-safe:enabled:hover:shadow-red-500/25',
    outline:
      'bg-transparent border-2 border-teal-600 text-teal-600 enabled:hover:bg-teal-50 focus-visible:ring-teal-500',
    ghost:
      'bg-transparent enabled:hover:bg-slate-100 text-slate-600 enabled:hover:text-slate-900 shadow-none',
    link:
      'bg-transparent text-teal-600 enabled:hover:underline shadow-none p-0 h-auto'
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-8 py-3 text-base'
  };

  const widthClass = fullWidth ? 'w-full' : '';
  const iconOnlyClass = iconOnly ? 'px-3' : '';

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${iconOnlyClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {!isLoading && icon && <span className={children ? 'mr-2' : ''}>{icon}</span>}
      {!iconOnly && children}
      {!isLoading && rightIcon && !iconOnly && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};

