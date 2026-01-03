import React from 'react';

/**
 * Premium Badge/Pill Component
 *
 * A versatile badge component for status indicators, counts, and labels.
 * Follows Stripe-level design patterns with multiple variants and sizes.
 */

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'secondary'
  | 'outline'
  | 'ghost';

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Display as a dot indicator (no text, just colored dot) */
  dot?: boolean;
  /** Pulsing animation for attention */
  pulse?: boolean;
  /** Icon to display before text */
  icon?: React.ReactNode;
  /** Make the badge removable with a close button */
  onRemove?: () => void;
  /** Round the badge to a circle (useful for counts) */
  rounded?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
  pulse = false,
  icon,
  onRemove,
  rounded = false,
  className = '',
  ...props
}) => {
  // Base styles
  const baseStyles = [
    'inline-flex items-center justify-center font-medium',
    'transition-all duration-150 ease-out',
    'select-none whitespace-nowrap',
  ].join(' ');

  // Variant styles
  const variantStyles: Record<BadgeVariant, string> = {
    default: 'bg-slate-100 text-slate-700 border border-slate-200',
    primary: 'bg-teal-50 text-teal-700 border border-teal-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    error: 'bg-red-50 text-red-700 border border-red-200',
    info: 'bg-blue-50 text-blue-700 border border-blue-200',
    secondary: 'bg-white text-slate-600 border border-slate-200 shadow-soft-xs',
    outline: 'bg-transparent text-slate-600 border border-slate-300',
    ghost: 'bg-transparent text-slate-500 border border-transparent',
  };

  // Size styles
  const sizeStyles: Record<BadgeSize, string> = {
    xs: 'text-2xs px-1.5 py-0.5 gap-1',
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  // Border radius based on rounded prop
  const radiusStyles = rounded ? 'rounded-full' : 'rounded-md';

  // Dot indicator styles
  if (dot) {
    const dotSizeStyles: Record<BadgeSize, string> = {
      xs: 'w-1.5 h-1.5',
      sm: 'w-2 h-2',
      md: 'w-2.5 h-2.5',
      lg: 'w-3 h-3',
    };

    const dotColorStyles: Record<BadgeVariant, string> = {
      default: 'bg-slate-400',
      primary: 'bg-teal-500',
      success: 'bg-emerald-500',
      warning: 'bg-amber-500',
      error: 'bg-red-500',
      info: 'bg-blue-500',
      secondary: 'bg-slate-400',
      outline: 'bg-slate-400',
      ghost: 'bg-slate-400',
    };

    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`} {...props}>
        <span className="relative flex">
          <span
            className={`${dotSizeStyles[size]} ${dotColorStyles[variant]} rounded-full`}
          />
          {pulse && (
            <span
              className={`absolute inset-0 ${dotSizeStyles[size]} ${dotColorStyles[variant]} rounded-full animate-pulse-ring`}
            />
          )}
        </span>
        {children && (
          <span className={`text-${size === 'xs' ? '2xs' : size === 'sm' ? 'xs' : 'sm'} text-slate-600`}>
            {children}
          </span>
        )}
      </span>
    );
  }

  // Icon size based on badge size
  const iconSizeClass = size === 'xs' || size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <span
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${radiusStyles}
        ${pulse ? 'animate-pulse-soft' : ''}
        ${className}
      `}
      {...props}
    >
      {icon && (
        <span className={`${iconSizeClass} flex-shrink-0`}>
          {icon}
        </span>
      )}
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 -mr-0.5 p-0.5 rounded-full hover:bg-black/10 transition-colors"
          aria-label="Remove"
        >
          <svg
            className={iconSizeClass}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
};

/**
 * Status Badge - Pre-configured badge for common status indicators
 */
export type StatusType = 'draft' | 'review' | 'sent' | 'overdue' | 'court' | 'judgment' | 'paid' | 'pending' | 'active' | 'completed' | 'failed';

interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: StatusType;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, ...props }) => {
  const statusConfig: Record<StatusType, { variant: BadgeVariant; label: string }> = {
    draft: { variant: 'default', label: 'Draft' },
    review: { variant: 'info', label: 'Review' },
    sent: { variant: 'success', label: 'Sent' },
    overdue: { variant: 'warning', label: 'Overdue' },
    court: { variant: 'info', label: 'Court' },
    judgment: { variant: 'warning', label: 'Judgment' },
    paid: { variant: 'success', label: 'Paid' },
    pending: { variant: 'default', label: 'Pending' },
    active: { variant: 'primary', label: 'Active' },
    completed: { variant: 'success', label: 'Completed' },
    failed: { variant: 'error', label: 'Failed' },
  };

  const config = statusConfig[status] || statusConfig.draft;

  return (
    <Badge variant={config.variant} {...props}>
      {props.children || config.label}
    </Badge>
  );
};

/**
 * Count Badge - Pre-configured badge for displaying counts/numbers
 */
interface CountBadgeProps extends Omit<BadgeProps, 'rounded'> {
  count: number;
  max?: number;
  showZero?: boolean;
}

export const CountBadge: React.FC<CountBadgeProps> = ({
  count,
  max = 99,
  showZero = false,
  size = 'sm',
  variant = 'primary',
  ...props
}) => {
  if (count === 0 && !showZero) return null;

  const displayCount = count > max ? `${max}+` : count.toString();

  return (
    <Badge variant={variant} size={size} rounded {...props}>
      {displayCount}
    </Badge>
  );
};

export default Badge;
