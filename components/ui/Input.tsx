import React, { useState, useId } from 'react';
import { CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

/**
 * Premium Input Component
 *
 * World-class form inputs with:
 * - Animated focus ring with expanding glow effect
 * - Smooth color transitions on state changes
 * - Spring-physics validation animations
 * - Real-time character counting with visual feedback
 * - Desktop-optimized hover states and cursors
 * - Accessible with proper ARIA attributes
 */

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hideLabel?: boolean;
  error?: string;
  success?: string;
  helpText?: string;
  icon?: React.ReactNode;
  showCharacterCount?: boolean;
  noMargin?: boolean;
  wrapperClassName?: string;
  /** Size variant */
  inputSize?: 'sm' | 'md' | 'lg';
  /** Show password toggle for password inputs */
  showPasswordToggle?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  hideLabel = false,
  error,
  success,
  helpText,
  icon,
  showCharacterCount,
  noMargin = false,
  wrapperClassName = '',
  className = '',
  required,
  maxLength,
  value,
  onChange,
  type = 'text',
  inputSize = 'md',
  showPasswordToggle = false,
  disabled,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputId = useId();
  const helpTextId = useId();
  const errorId = useId();
  const successId = useId();

  const currentLength = value?.toString().length || 0;
  const hasError = !!error;
  const hasSuccess = !!success && !hasError;
  const isPassword = type === 'password';
  const actualType = isPassword && showPassword ? 'text' : type;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e);
    }
  };

  // Size styles
  const sizeStyles = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-5 py-4 text-lg',
  };

  const iconSizeStyles = {
    sm: 'left-3 w-4 h-4',
    md: 'left-4 w-5 h-5',
    lg: 'left-5 w-6 h-6',
  };

  const iconPaddingStyles = {
    sm: 'pl-9',
    md: 'pl-11',
    lg: 'pl-14',
  };

  // Determine border and ring colors based on state - enhanced with premium glow effects
  const getStateStyles = () => {
    if (hasError) {
      return [
        'border-red-300',
        'focus:border-red-500',
        // Enhanced glow with animated ring
        'focus-visible:ring-2 focus-visible:ring-red-500/25',
        'focus-visible:shadow-[0_0_0_3px_rgba(239,68,68,0.08),0_1px_2px_rgba(0,0,0,0.05)]',
      ].join(' ');
    }
    if (hasSuccess) {
      return [
        'border-emerald-300',
        'focus:border-emerald-500',
        'focus-visible:ring-2 focus-visible:ring-emerald-500/25',
        'focus-visible:shadow-[0_0_0_3px_rgba(16,185,129,0.08),0_1px_2px_rgba(0,0,0,0.05)]',
      ].join(' ');
    }
    if (isFocused) {
      return [
        'border-teal-400',
        'ring-2 ring-teal-500/20',
        'shadow-[0_0_0_3px_rgba(20,184,166,0.1),0_1px_3px_rgba(0,0,0,0.08)]',
      ].join(' ');
    }
    return [
      'border-slate-200',
      // Premium hover state
      'hover:border-slate-300 hover:shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
      // Premium focus state with expanding glow
      'focus:border-teal-500',
      'focus-visible:ring-2 focus-visible:ring-teal-500/20',
      'focus-visible:shadow-[0_0_0_3px_rgba(20,184,166,0.1),0_2px_4px_rgba(0,0,0,0.06)]',
    ].join(' ');
  };

  return (
    <div className={`flex flex-col gap-1.5 ${noMargin ? '' : 'mb-5'} ${wrapperClassName}`}>
      {/* Label */}
      {(label || required) && (
        <div className="flex items-center justify-between">
          {label && (
            <label
              htmlFor={inputId}
              className={`
                ${hideLabel ? 'sr-only' : 'text-sm font-medium text-slate-700'}
                flex items-center gap-1 mb-0.5
                transition-colors duration-150
                ${isFocused ? 'text-slate-900' : ''}
              `}
            >
              {label}
              {required && (
                <span className="text-teal-500 font-normal" aria-label="required">*</span>
              )}
            </label>
          )}

          {/* Character Count */}
          {showCharacterCount && maxLength && (
            <span
              className={`
                text-xs font-mono tabular-nums
                transition-colors duration-150
                ${currentLength > maxLength * 0.9
                  ? 'text-amber-500 font-medium'
                  : currentLength > maxLength * 0.75
                    ? 'text-slate-500'
                    : 'text-slate-400'
                }
              `}
              aria-live="polite"
            >
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
      )}

      {/* Input Container */}
      <div className="relative group">
        {/* Icon */}
        {icon && (
          <div className={`
            absolute top-1/2 -translate-y-1/2 pointer-events-none
            transition-colors duration-150
            ${iconSizeStyles[inputSize]}
            ${isFocused ? 'text-teal-500' : hasError ? 'text-red-400' : hasSuccess ? 'text-emerald-500' : 'text-slate-400'}
          `}>
            {icon}
          </div>
        )}

        {/* Input Field */}
        <input
          id={inputId}
          type={actualType}
          className={`
            w-full bg-white border rounded-xl
            text-slate-900 placeholder:text-slate-400/70
            transition-all duration-250 ease-out
            focus:outline-none
            disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200
            ${sizeStyles[inputSize]}
            ${icon ? iconPaddingStyles[inputSize] : ''}
            ${(hasError || hasSuccess || (isPassword && showPasswordToggle)) ? 'pr-11' : ''}
            ${getStateStyles()}
            ${disabled ? '' : 'shadow-[0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.5)]'}
            ${className}
          `}
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          maxLength={maxLength}
          disabled={disabled}
          aria-required={required}
          aria-invalid={hasError}
          aria-describedby={`
            ${helpText ? helpTextId : ''}
            ${error ? errorId : ''}
            ${success ? successId : ''}
          `.trim() || undefined}
          {...props}
        />

        {/* Password Toggle */}
        {isPassword && showPasswordToggle && !hasError && !hasSuccess && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={`
              absolute right-3 top-1/2 -translate-y-1/2
              p-1 rounded-lg
              text-slate-400 hover:text-slate-600
              transition-colors duration-150
              focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50
            `}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Success Icon */}
        {hasSuccess && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none animate-scale-in">
            <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
          </div>
        )}

        {/* Error Icon */}
        {hasError && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 pointer-events-none animate-scale-in">
            <AlertCircle className="w-5 h-5" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Help Text */}
      {helpText && !error && !success && (
        <p id={helpTextId} className="text-xs text-slate-500 leading-relaxed">
          {helpText}
        </p>
      )}

      {/* Error Message */}
      {error && (
        <p
          id={errorId}
          className="text-xs text-red-600 flex items-center gap-1.5 animate-fade-in"
          role="alert"
        >
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      {/* Success Message */}
      {success && !error && (
        <p
          id={successId}
          className="text-xs text-emerald-600 flex items-center gap-1.5 animate-fade-in"
        >
          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          <span>{success}</span>
        </p>
      )}
    </div>
  );
};

/**
 * Premium Select Component
 */
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hideLabel?: boolean;
  options: { value: string; label: string; disabled?: boolean }[];
  error?: string;
  helpText?: string;
  noMargin?: boolean;
  wrapperClassName?: string;
  placeholder?: string;
  inputSize?: 'sm' | 'md' | 'lg';
}

export const Select: React.FC<SelectProps> = ({
  label,
  hideLabel = false,
  options,
  error,
  helpText,
  noMargin = false,
  wrapperClassName = '',
  className = '',
  required,
  placeholder = 'Select...',
  inputSize = 'md',
  disabled,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const selectId = useId();
  const helpTextId = useId();
  const errorId = useId();
  const hasError = !!error;

  const sizeStyles = {
    sm: 'px-3 py-2 text-sm pr-8',
    md: 'px-4 py-3 text-base pr-10',
    lg: 'px-5 py-4 text-lg pr-12',
  };

  return (
    <div className={`flex flex-col gap-1.5 ${noMargin ? '' : 'mb-5'} ${wrapperClassName}`}>
      {(label || required) && label && (
        <label
          htmlFor={selectId}
          className={`
            ${hideLabel ? 'sr-only' : 'text-sm font-medium text-slate-700'}
            flex items-center gap-1 mb-0.5
            transition-colors duration-150
            ${isFocused ? 'text-slate-900' : ''}
          `}
        >
          {label}
          {required && <span className="text-teal-500 font-normal" aria-label="required">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          id={selectId}
          className={`
            w-full bg-white border rounded-xl appearance-none cursor-pointer
            text-slate-900
            transition-all duration-250 ease-out
            focus:outline-none
            disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200
            ${sizeStyles[inputSize]}
            ${hasError
              ? 'border-red-300 focus:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/25 focus-visible:shadow-[0_0_0_3px_rgba(239,68,68,0.08)]'
              : 'border-slate-200 hover:border-slate-300 hover:shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:border-teal-500 focus-visible:ring-2 focus-visible:ring-teal-500/20 focus-visible:shadow-[0_0_0_3px_rgba(20,184,166,0.1)]'
            }
            ${disabled ? '' : 'shadow-[0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.5)]'}
            ${className}
          `}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          aria-required={required}
          aria-invalid={hasError}
          aria-describedby={`${helpText ? helpTextId : ''} ${error ? errorId : ''}`.trim() || undefined}
          {...props}
        >
          <option value="" disabled>{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Custom dropdown arrow */}
        <div className={`
          absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none
          transition-colors duration-150
          ${isFocused ? 'text-teal-500' : 'text-slate-400'}
        `}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {helpText && !error && (
        <p id={helpTextId} className="text-xs text-slate-500 leading-relaxed">
          {helpText}
        </p>
      )}

      {error && (
        <p id={errorId} className="text-xs text-red-600 flex items-center gap-1.5 animate-fade-in" role="alert">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};

/**
 * Premium TextArea Component
 */
interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hideLabel?: boolean;
  error?: string;
  success?: string;
  helpText?: string;
  showCharacterCount?: boolean;
  noMargin?: boolean;
  wrapperClassName?: string;
  /** Auto-resize based on content */
  autoResize?: boolean;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  hideLabel = false,
  error,
  success,
  helpText,
  showCharacterCount,
  noMargin = false,
  wrapperClassName = '',
  className = '',
  required,
  maxLength,
  value,
  onChange,
  autoResize = false,
  disabled,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const textareaId = useId();
  const helpTextId = useId();
  const errorId = useId();
  const successId = useId();

  const currentLength = value?.toString().length || 0;
  const hasError = !!error;
  const hasSuccess = !!success && !hasError;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (autoResize) {
      e.target.style.height = 'auto';
      e.target.style.height = `${e.target.scrollHeight}px`;
    }
    if (onChange) {
      onChange(e);
    }
  };

  const getTextAreaStateStyles = () => {
    if (hasError) {
      return 'border-red-300 focus:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/25 focus-visible:shadow-[0_0_0_3px_rgba(239,68,68,0.08)]';
    }
    if (hasSuccess) {
      return 'border-emerald-300 focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/25 focus-visible:shadow-[0_0_0_3px_rgba(16,185,129,0.08)]';
    }
    return 'border-slate-200 hover:border-slate-300 hover:shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:border-teal-500 focus-visible:ring-2 focus-visible:ring-teal-500/20 focus-visible:shadow-[0_0_0_3px_rgba(20,184,166,0.1)]';
  };

  return (
    <div className={`flex flex-col gap-1.5 ${noMargin ? '' : 'mb-5'} ${wrapperClassName}`}>
      {(label || required) && (
        <div className="flex items-center justify-between">
          {label && (
            <label
              htmlFor={textareaId}
              className={`
                ${hideLabel ? 'sr-only' : 'text-sm font-medium text-slate-700'}
                flex items-center gap-1 mb-0.5
                transition-colors duration-150
                ${isFocused ? 'text-slate-900' : ''}
              `}
            >
              {label}
              {required && <span className="text-teal-500 font-normal" aria-label="required">*</span>}
            </label>
          )}

          {showCharacterCount && maxLength && (
            <span
              className={`
                text-xs font-mono tabular-nums
                transition-colors duration-150
                ${currentLength > maxLength * 0.9
                  ? 'text-amber-500 font-medium'
                  : currentLength > maxLength * 0.75
                    ? 'text-slate-500'
                    : 'text-slate-400'
                }
              `}
              aria-live="polite"
            >
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
      )}

      <textarea
        id={textareaId}
        className={`
          w-full px-4 py-3 bg-white border rounded-xl
          text-base text-slate-900 placeholder:text-slate-400/70
          transition-all duration-250 ease-out
          focus:outline-none
          disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200
          resize-y
          ${getTextAreaStateStyles()}
          ${disabled ? '' : 'shadow-[0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.5)]'}
          ${autoResize ? 'resize-none overflow-hidden' : ''}
          ${className}
        `}
        rows={props.rows || 4}
        value={value}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        maxLength={maxLength}
        disabled={disabled}
        aria-required={required}
        aria-invalid={hasError}
        aria-describedby={`
          ${helpText ? helpTextId : ''}
          ${error ? errorId : ''}
          ${success ? successId : ''}
        `.trim() || undefined}
        {...props}
      />

      {helpText && !error && !success && (
        <p id={helpTextId} className="text-xs text-slate-500 leading-relaxed">
          {helpText}
        </p>
      )}

      {error && (
        <p id={errorId} className="text-xs text-red-600 flex items-center gap-1.5 animate-fade-in" role="alert">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      {success && !error && (
        <p id={successId} className="text-xs text-emerald-600 flex items-center gap-1.5 animate-fade-in">
          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          <span>{success}</span>
        </p>
      )}
    </div>
  );
};

/**
 * Premium Checkbox Component
 */
interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  description?: string;
  error?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  description,
  error,
  className = '',
  id,
  ...props
}) => {
  const checkboxId = id || useId();
  const hasError = !!error;

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={checkboxId}
        className={`
          flex items-start gap-3 cursor-pointer group
          ${props.disabled ? 'cursor-not-allowed opacity-60' : ''}
        `}
      >
        <div className="relative flex-shrink-0 mt-0.5">
          <input
            type="checkbox"
            id={checkboxId}
            className={`
              w-5 h-5 rounded-md border-2 cursor-pointer
              transition-all duration-150 ease-out
              focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2
              checked:bg-teal-600 checked:border-teal-600
              hover:border-slate-400 checked:hover:bg-teal-700 checked:hover:border-teal-700
              disabled:cursor-not-allowed disabled:bg-slate-100
              ${hasError ? 'border-red-300' : 'border-slate-300'}
              ${className}
            `}
            {...props}
          />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
            {label}
          </span>
          {description && (
            <span className="text-xs text-slate-500 mt-0.5">{description}</span>
          )}
        </div>
      </label>
      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1.5 ml-8 animate-fade-in" role="alert">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};
