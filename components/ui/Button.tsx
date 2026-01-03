import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Premium Button Component
 *
 * A world-class button with Stripe-level polish:
 * - Subtle inner shine effect for depth
 * - Satisfying pressed state with spring physics feel
 * - Smooth gradient transitions on hover
 * - Premium shadow cascade system
 * - Accessible focus states with animated rings
 */

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'warning'
  | 'danger'
  | 'outline'
  | 'ghost'
  | 'link'
  | 'gradient';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  iconOnly?: boolean;
  /** Subtle animation on hover */
  animate?: boolean;
  /** Show subtle shine effect (default true for primary/gradient) */
  shine?: boolean;
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
  animate = true,
  shine,
  className = '',
  disabled,
  ...props
}) => {
  // Determine if shine effect should show (default true for primary/gradient/warning/danger)
  const showShine = shine ?? (variant === 'primary' || variant === 'gradient' || variant === 'warning' || variant === 'danger');

  // Base styles with premium feel
  const baseStyles = [
    'group inline-flex items-center justify-center',
    'font-semibold',
    'rounded-xl',
    'cursor-pointer',
    'select-none',
    'border',
    'relative overflow-hidden',
    // Focus styles - enhanced animated ring
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
    // Disabled styles
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
    // Smooth transitions - refined timing for premium feel
    'transition-all duration-200 ease-out',
    // Micro-interaction: satisfying spring-like press effect
    animate ? 'active:scale-[0.97] active:shadow-inner-sm' : '',
    // GPU acceleration for buttery smooth animations
    'transform-gpu',
    // Subtle hover lift for depth
    animate && variant !== 'ghost' && variant !== 'link' ? 'hover:-translate-y-[1px]' : '',
  ].join(' ');

  // Variant styles with premium shadows, refined gradients, and polished interactions
  const variantStyles: Record<ButtonVariant, string> = {
    primary: [
      'text-white border-teal-600/80',
      // Premium shadow with colored glow
      'shadow-[0_1px_2px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.15)]',
      // Refined gradient with subtle top highlight
      'bg-gradient-to-b from-teal-500 via-teal-550 to-teal-600',
      // Hover: deeper color with enhanced shadow
      'hover:from-teal-500 hover:via-teal-600 hover:to-teal-700',
      'hover:shadow-[0_2px_4px_rgba(0,0,0,0.12),0_4px_8px_rgba(0,0,0,0.1),0_8px_16px_rgba(20,184,166,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]',
      'hover:border-teal-700/80',
      'focus-visible:ring-teal-500/50',
      // Active: pressed depth
      'active:from-teal-600 active:via-teal-650 active:to-teal-700',
    ].join(' '),
    secondary: [
      'bg-white text-slate-700 border-slate-200/80',
      // Refined shadow for secondary
      'shadow-[0_1px_2px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)]',
      'hover:bg-gradient-to-b hover:from-white hover:to-slate-50',
      'hover:border-slate-300 hover:text-slate-900',
      'hover:shadow-[0_2px_4px_rgba(0,0,0,0.08),0_4px_8px_rgba(0,0,0,0.06)]',
      'focus-visible:ring-slate-400/50',
      'active:bg-slate-50',
    ].join(' '),
    warning: [
      'text-white border-amber-500/80',
      'shadow-[0_1px_2px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.2)]',
      'bg-gradient-to-b from-amber-400 via-amber-450 to-amber-500',
      'hover:from-amber-400 hover:via-amber-500 hover:to-amber-600',
      'hover:shadow-[0_2px_4px_rgba(0,0,0,0.12),0_4px_8px_rgba(0,0,0,0.1),0_8px_16px_rgba(245,158,11,0.15)]',
      'hover:border-amber-600/80',
      'focus-visible:ring-amber-500/50',
      'active:from-amber-500 active:via-amber-550 active:to-amber-600',
    ].join(' '),
    danger: [
      'text-white border-red-600/80',
      'shadow-[0_1px_2px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.15)]',
      'bg-gradient-to-b from-red-500 via-red-550 to-red-600',
      'hover:from-red-500 hover:via-red-600 hover:to-red-700',
      'hover:shadow-[0_2px_4px_rgba(0,0,0,0.12),0_4px_8px_rgba(0,0,0,0.1),0_8px_16px_rgba(239,68,68,0.15)]',
      'hover:border-red-700/80',
      'focus-visible:ring-red-500/50',
      'active:from-red-600 active:via-red-650 active:to-red-700',
    ].join(' '),
    outline: [
      'bg-white/50 text-teal-600 border-teal-200',
      'shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
      'hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700',
      'hover:shadow-[0_2px_4px_rgba(20,184,166,0.08)]',
      'focus-visible:ring-teal-500/50',
      'active:bg-teal-100/50',
    ].join(' '),
    ghost: [
      'bg-transparent text-slate-600 border-transparent',
      'hover:bg-slate-100/80 hover:text-slate-900',
      'focus-visible:ring-slate-400/50',
      'active:bg-slate-200/60',
    ].join(' '),
    link: [
      'bg-transparent text-teal-600 border-transparent',
      'hover:text-teal-700 hover:underline underline-offset-4 decoration-teal-400/50',
      'focus-visible:ring-teal-500/50',
      'p-0 h-auto shadow-none',
      'active:text-teal-800',
    ].join(' '),
    gradient: [
      'text-white border-transparent',
      'bg-gradient-to-r from-teal-500 via-teal-600 to-emerald-500',
      // Premium glow shadow
      'shadow-[0_2px_4px_rgba(0,0,0,0.1),0_4px_8px_rgba(20,184,166,0.2),inset_0_1px_0_rgba(255,255,255,0.15)]',
      'hover:from-teal-400 hover:via-teal-500 hover:to-emerald-400',
      'hover:shadow-[0_4px_8px_rgba(0,0,0,0.12),0_8px_16px_rgba(20,184,166,0.25),0_12px_24px_rgba(16,185,129,0.15)]',
      'focus-visible:ring-teal-500/50',
      'active:from-teal-600 active:via-teal-700 active:to-emerald-600',
    ].join(' '),
  };

  // Size styles with proper touch targets
  const sizeStyles: Record<ButtonSize, string> = {
    xs: 'px-2.5 py-1.5 text-xs gap-1.5 min-h-[28px]',
    sm: 'px-3 py-2 text-sm gap-1.5 min-h-[32px]',
    md: 'px-4 py-2.5 text-sm gap-2 min-h-[40px]',
    lg: 'px-6 py-3 text-base gap-2 min-h-[48px]',
    xl: 'px-8 py-4 text-lg gap-2.5 min-h-[56px]',
  };

  // Icon only adjustments
  const iconOnlySizeStyles: Record<ButtonSize, string> = {
    xs: 'p-1.5 min-h-[28px] min-w-[28px]',
    sm: 'p-2 min-h-[32px] min-w-[32px]',
    md: 'p-2.5 min-h-[40px] min-w-[40px]',
    lg: 'p-3 min-h-[48px] min-w-[48px]',
    xl: 'p-4 min-h-[56px] min-w-[56px]',
  };

  // Icon sizes
  const iconSizeStyles: Record<ButtonSize, string> = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6',
  };

  // Loading spinner sizes
  const spinnerSize: Record<ButtonSize, string> = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6',
  };

  const widthClass = fullWidth ? 'w-full' : '';
  const sizeClass = iconOnly ? iconOnlySizeStyles[size] : sizeStyles[size];

  // Combine all classes
  const combinedClassName = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${sizeClass}
    ${widthClass}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <button
      className={combinedClassName}
      disabled={disabled || isLoading}
      {...props}
    >
      {/* Shine overlay effect - subtle moving highlight */}
      {showShine && !disabled && !isLoading && (
        <span
          className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none"
          aria-hidden="true"
        >
          <span
            className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/10 to-transparent"
          />
        </span>
      )}

      {/* Loading spinner */}
      {isLoading && (
        <Loader2
          className={`${spinnerSize[size]} animate-spin ${children ? 'mr-2' : ''}`}
          aria-hidden="true"
        />
      )}

      {/* Left icon */}
      {!isLoading && icon && (
        <span
          className={`${iconSizeStyles[size]} flex-shrink-0 relative`}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}

      {/* Button text */}
      {!iconOnly && children && (
        <span className="truncate relative">{children}</span>
      )}

      {/* Right icon */}
      {!isLoading && rightIcon && !iconOnly && (
        <span
          className={`${iconSizeStyles[size]} flex-shrink-0 relative`}
          aria-hidden="true"
        >
          {rightIcon}
        </span>
      )}
    </button>
  );
};

/**
 * Icon Button - Convenience wrapper for icon-only buttons
 */
export interface IconButtonProps extends Omit<ButtonProps, 'iconOnly' | 'children' | 'rightIcon'> {
  icon: React.ReactNode;
  'aria-label': string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  variant = 'ghost',
  size = 'md',
  ...props
}) => {
  return (
    <Button
      variant={variant}
      size={size}
      icon={icon}
      iconOnly
      {...props}
    />
  );
};

/**
 * Button Group - Container for grouping related buttons
 */
export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Attach buttons together without gaps */
  attached?: boolean;
  /** Vertical stack on mobile */
  vertical?: boolean;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  attached = false,
  vertical = false,
  className = '',
  ...props
}) => {
  const baseClass = vertical
    ? attached
      ? 'flex flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none [&>*:not(:first-child)]:-mt-px'
      : 'flex flex-col gap-2'
    : attached
      ? 'inline-flex [&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none [&>*:not(:first-child)]:-ml-px'
      : 'inline-flex gap-2';

  return (
    <div className={`${baseClass} ${className}`} role="group" {...props}>
      {children}
    </div>
  );
};

export default Button;
