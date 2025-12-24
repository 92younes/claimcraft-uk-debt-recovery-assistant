import React, { useState, useId } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

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
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputId = useId();
  const helpTextId = useId();
  const errorId = useId();
  const successId = useId();

  const currentLength = value?.toString().length || 0;
  const hasError = !!error;
  const hasSuccess = !!success && !hasError;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 ${noMargin ? '' : 'mb-5'} ${wrapperClassName}`}>
      {/* Label */}
      {(label || required) && (
        <div className="flex items-center justify-between">
          {label && (
            <label
              htmlFor={inputId}
              className={`${hideLabel ? 'sr-only' : 'text-sm font-medium text-slate-700'} flex items-center gap-1 mb-0.5`}
            >
              {label}
              {required && <span className="text-teal-500" aria-label="required">*</span>}
            </label>
          )}

          {/* Character Count */}
          {showCharacterCount && maxLength && (
            <span
              className={`text-xs font-mono ${currentLength > maxLength * 0.9 ? 'text-amber-500 font-medium' : 'text-slate-400'}`}
              aria-live="polite"
            >
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
      )}

      {/* Input Container */}
      <div className="relative">
        {/* Icon */}
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {icon}
          </div>
        )}

        {/* Input Field */}
        <input
          id={inputId}
          className={`
            w-full px-4 py-3 bg-white border rounded-xl transition-all duration-200 shadow-soft
            text-base text-slate-900 placeholder:text-slate-500
            focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0
            disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed
            ${icon ? 'pl-11' : ''}
            ${hasError ? 'border-red-300 focus-visible:ring-red-500/30 focus:border-red-500 pr-11' :
              hasSuccess ? 'border-teal-300 focus-visible:ring-teal-500/30 focus:border-teal-500 pr-11' :
              isFocused ? 'border-teal-400 focus-visible:ring-teal-500/30' :
              'border-slate-200 hover:border-slate-300 focus-visible:ring-teal-500/30 focus:border-teal-500'}
            ${className}
          `}
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          maxLength={maxLength}
          aria-required={required}
          aria-invalid={hasError}
          aria-describedby={`
            ${helpText ? helpTextId : ''}
            ${error ? errorId : ''}
            ${success ? successId : ''}
          `.trim()}
          {...props}
        />

        {/* Success Icon */}
        {hasSuccess && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-teal-500 pointer-events-none">
            <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
          </div>
        )}

        {/* Error Icon */}
        {hasError && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 pointer-events-none">
            <AlertCircle className="w-5 h-5" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Help Text */}
      {helpText && !error && !success && (
        <p id={helpTextId} className="text-xs text-slate-500">
          {helpText}
        </p>
      )}

      {/* Error Message */}
      {error && (
        <p id={errorId} className="text-xs text-red-600 flex items-center gap-1" role="alert">
          <AlertCircle className="w-3 h-3" aria-hidden="true" />
          {error}
        </p>
      )}

      {/* Success Message */}
      {success && !error && (
        <p id={successId} className="text-xs text-teal-600 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
          {success}
        </p>
      )}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hideLabel?: boolean;
  options: { value: string; label: string }[];
  error?: string;
  helpText?: string;
  noMargin?: boolean;
  wrapperClassName?: string;
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
  ...props
}) => {
  const selectId = useId();
  const helpTextId = useId();
  const errorId = useId();
  const hasError = !!error;

  return (
    <div className={`flex flex-col gap-1.5 ${noMargin ? '' : 'mb-5'} ${wrapperClassName}`}>
      {(label || required) && label && (
        <label
          htmlFor={selectId}
          className={`${hideLabel ? 'sr-only' : 'text-sm font-medium text-slate-700'} flex items-center gap-1 mb-0.5`}
        >
          {label}
          {required && <span className="text-teal-500" aria-label="required">*</span>}
        </label>
      )}
      <select
        id={selectId}
        className={`
          px-4 py-3 bg-white border rounded-xl transition-all duration-200 shadow-soft
          text-base text-slate-900
          focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 focus:border-teal-500
          disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed
          ${hasError ? 'border-red-300 focus-visible:ring-red-500/30' : 'border-slate-200 hover:border-slate-300'}
          ${className}
        `}
        aria-required={required}
        aria-invalid={hasError}
        aria-describedby={`${helpText ? helpTextId : ''} ${error ? errorId : ''}`.trim()}
        {...props}
      >
        <option value="">-- Select {label || 'an option'} --</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {helpText && !error && (
        <p id={helpTextId} className="text-xs text-slate-500">
          {helpText}
        </p>
      )}

      {error && (
        <p id={errorId} className="text-xs text-red-600 flex items-center gap-1" role="alert">
          <AlertCircle className="w-3 h-3" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
};

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hideLabel?: boolean;
  error?: string;
  success?: string;
  helpText?: string;
  showCharacterCount?: boolean;
  noMargin?: boolean;
  wrapperClassName?: string;
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
  ...props
}) => {
  const textareaId = useId();
  const helpTextId = useId();
  const errorId = useId();
  const successId = useId();

  const currentLength = value?.toString().length || 0;
  const hasError = !!error;
  const hasSuccess = !!success && !hasError;

  return (
    <div className={`flex flex-col gap-1.5 ${noMargin ? '' : 'mb-5'} ${wrapperClassName}`}>
      {(label || required) && (
        <div className="flex items-center justify-between">
          {label && (
            <label
              htmlFor={textareaId}
              className={`${hideLabel ? 'sr-only' : 'text-sm font-medium text-slate-700'} flex items-center gap-1 mb-0.5`}
            >
              {label}
              {required && <span className="text-teal-500" aria-label="required">*</span>}
            </label>
          )}

          {showCharacterCount && maxLength && (
            <span
              className={`text-xs font-mono ${currentLength > maxLength * 0.9 ? 'text-amber-500 font-medium' : 'text-slate-400'}`}
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
          px-4 py-3 bg-white border rounded-xl transition-all duration-200 shadow-soft
          text-base text-slate-900 placeholder:text-slate-500
          focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0
          disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed
          ${hasError ? 'border-red-300 focus-visible:ring-red-500/30 focus:border-red-500' :
            hasSuccess ? 'border-teal-300 focus-visible:ring-teal-500/30 focus:border-teal-500' :
            'border-slate-200 hover:border-slate-300 focus-visible:ring-teal-500/30 focus:border-teal-500'}
          ${className}
        `}
        rows={5}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        aria-required={required}
        aria-invalid={hasError}
        aria-describedby={`
          ${helpText ? helpTextId : ''}
          ${error ? errorId : ''}
          ${success ? successId : ''}
        `.trim()}
        {...props}
      />

      {helpText && !error && !success && (
        <p id={helpTextId} className="text-xs text-slate-500">
          {helpText}
        </p>
      )}

      {error && (
        <p id={errorId} className="text-xs text-red-600 flex items-center gap-1" role="alert">
          <AlertCircle className="w-3 h-3" aria-hidden="true" />
          {error}
        </p>
      )}

      {success && !error && (
        <p id={successId} className="text-xs text-teal-600 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
          {success}
        </p>
      )}
    </div>
  );
};
