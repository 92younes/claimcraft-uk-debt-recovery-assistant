import React from 'react';

/**
 * Premium Card Component
 *
 * A versatile card component with multiple variants for different use cases.
 * Follows Stripe-level design patterns with:
 * - Refined shadow cascade for depth hierarchy
 * - Smooth hover transitions with subtle lift effect
 * - Premium border treatments
 * - Desktop-optimized interactive states
 */

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'ghost' | 'gradient' | 'interactive';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  /** Make the entire card clickable */
  as?: 'div' | 'button' | 'article' | 'section';
  /** Disable hover effects (for interactive variant) */
  noHover?: boolean;
  /** Add a colored left border accent */
  accent?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'none';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(({
  children,
  variant = 'default',
  padding = 'md',
  as: Component = 'div',
  noHover = false,
  accent = 'none',
  className = '',
  ...props
}, ref) => {
  // Base styles with refined transitions
  const baseStyles = 'relative rounded-xl transition-all duration-250 ease-out transform-gpu';

  // Variant styles with premium shadows and refined borders
  const variantStyles: Record<CardVariant, string> = {
    default: [
      'bg-white border border-slate-200/80',
      'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_4px_rgba(0,0,0,0.02)]',
    ].join(' '),
    elevated: [
      'bg-white border border-slate-100',
      'shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.03)]',
    ].join(' '),
    outlined: 'bg-white border border-slate-200 shadow-none',
    ghost: 'bg-slate-50/60 border border-transparent hover:bg-slate-50',
    gradient: [
      'bg-gradient-to-br from-white via-white to-slate-50/80 border border-slate-200/60',
      'shadow-[0_1px_2px_rgba(0,0,0,0.03),0_2px_4px_rgba(0,0,0,0.02)]',
    ].join(' '),
    interactive: [
      'bg-white border border-slate-200/80 cursor-pointer',
      'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_4px_rgba(0,0,0,0.02)]',
      noHover ? '' : [
        'hover:shadow-[0_2px_4px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.03)]',
        'hover:border-slate-300/80',
        'hover:-translate-y-0.5',
        'active:translate-y-0',
        'active:shadow-[0_1px_2px_rgba(0,0,0,0.06)]',
      ].join(' '),
    ].filter(Boolean).join(' '),
  };

  // Padding styles
  const paddingStyles: Record<CardPadding, string> = {
    none: '',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-6',
    xl: 'p-6 sm:p-8',
  };

  // Accent styles
  const accentStyles: Record<typeof accent, string> = {
    none: '',
    primary: 'border-l-4 border-l-teal-500',
    success: 'border-l-4 border-l-emerald-500',
    warning: 'border-l-4 border-l-amber-500',
    error: 'border-l-4 border-l-red-500',
    info: 'border-l-4 border-l-blue-500',
  };

  const combinedClassName = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${paddingStyles[padding]}
    ${accentStyles[accent]}
    ${className}
  `.trim();

  return (
    <Component
      ref={ref as any}
      className={combinedClassName}
      {...props}
    >
      {children}
    </Component>
  );
});

Card.displayName = 'Card';

/**
 * Card Header - Structured header section for cards
 */
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  /** Smaller, more compact header */
  compact?: boolean;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  description,
  icon,
  action,
  compact = false,
  className = '',
  children,
  ...props
}) => {
  if (children) {
    return (
      <div className={`${compact ? 'pb-3' : 'pb-4'} ${className}`} {...props}>
        {children}
      </div>
    );
  }

  return (
    <div className={`flex items-start justify-between gap-4 ${compact ? 'pb-3' : 'pb-4'} ${className}`} {...props}>
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center text-teal-600">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          {title && (
            <h3 className={`font-semibold text-slate-900 ${compact ? 'text-sm' : 'text-base'}`}>
              {title}
            </h3>
          )}
          {description && (
            <p className={`text-slate-500 mt-0.5 ${compact ? 'text-xs' : 'text-sm'}`}>
              {description}
            </p>
          )}
        </div>
      </div>
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
};

/**
 * Card Body - Main content section
 */
export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Remove default padding */
  flush?: boolean;
}

export const CardBody: React.FC<CardBodyProps> = ({
  children,
  flush = false,
  className = '',
  ...props
}) => {
  return (
    <div className={`${flush ? '' : 'py-1'} ${className}`} {...props}>
      {children}
    </div>
  );
};

/**
 * Card Footer - Footer section with optional divider
 */
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Show a divider line above footer */
  divider?: boolean;
  /** Align content to the right */
  alignRight?: boolean;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  divider = true,
  alignRight = false,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`
        pt-4 mt-4
        ${divider ? 'border-t border-slate-100' : ''}
        ${alignRight ? 'flex justify-end gap-3' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * Stat Card - Pre-configured card for displaying statistics
 */
export interface StatCardProps extends Omit<CardProps, 'children'> {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  helpText?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  trend,
  helpText,
  variant = 'default',
  ...props
}) => {
  return (
    <Card variant={variant} padding="md" {...props} className="group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {value}
          </p>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${
              trend.isPositive ? 'text-emerald-600' : 'text-red-600'
            }`}>
              <svg
                className={`w-3 h-3 transition-transform duration-200 ${trend.isPositive ? 'group-hover:-translate-y-0.5' : 'rotate-180 group-hover:translate-y-0.5'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              <span className="tabular-nums">{Math.abs(trend.value)}%</span>
            </div>
          )}
          {helpText && (
            <p className="text-xs text-slate-400 mt-2">{helpText}</p>
          )}
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100/80 flex items-center justify-center text-teal-600 flex-shrink-0 transition-all duration-200 group-hover:shadow-[0_2px_8px_rgba(20,184,166,0.15)] group-hover:scale-105">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};

/**
 * Feature Card - Pre-configured card for feature highlights
 */
export interface FeatureCardProps extends Omit<CardProps, 'children'> {
  icon: React.ReactNode;
  title: string;
  description: string;
  iconColor?: 'primary' | 'success' | 'warning' | 'error' | 'info';
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  iconColor = 'primary',
  ...props
}) => {
  const iconColorStyles = {
    primary: 'from-teal-50 to-teal-100/80 text-teal-600 group-hover:shadow-[0_2px_8px_rgba(20,184,166,0.15)]',
    success: 'from-emerald-50 to-emerald-100/80 text-emerald-600 group-hover:shadow-[0_2px_8px_rgba(16,185,129,0.15)]',
    warning: 'from-amber-50 to-amber-100/80 text-amber-600 group-hover:shadow-[0_2px_8px_rgba(245,158,11,0.15)]',
    error: 'from-red-50 to-red-100/80 text-red-600 group-hover:shadow-[0_2px_8px_rgba(239,68,68,0.15)]',
    info: 'from-blue-50 to-blue-100/80 text-blue-600 group-hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)]',
  };

  return (
    <Card variant="interactive" padding="lg" {...props} className="group">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${iconColorStyles[iconColor]} flex items-center justify-center mb-4 transition-all duration-200 group-hover:scale-105`}>
        {icon}
      </div>
      <h3 className="font-semibold text-slate-900 mb-2 group-hover:text-teal-700 transition-colors duration-200">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </Card>
  );
};

export default Card;
