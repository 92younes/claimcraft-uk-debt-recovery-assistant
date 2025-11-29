import React, { useState, useId } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  success?: string;
  helpText?: string;
  icon?: React.ReactNode;
  showCharacterCount?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  success,
  helpText,
  icon,
  showCharacterCount,
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
    <div className="flex flex-col gap-1.5 mb-4">
      {/* Label */}
      <div className="flex items-center justify-between">
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-slate-300 flex items-center gap-1"
        >
          {label}
          {required && <span className="text-violet-400" aria-label="required">*</span>}
        </label>

        {/* Character Count */}
        {showCharacterCount && maxLength && (
          <span
            className={`text-xs ${currentLength > maxLength * 0.9 ? 'text-amber-400 font-medium' : 'text-slate-500'}`}
            aria-live="polite"
          >
            {currentLength}/{maxLength}
          </span>
        )}
      </div>

      {/* Input Container */}
      <div className="relative">
        {/* Icon */}
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
            {icon}
          </div>
        )}

        {/* Input Field */}
        <input
          id={inputId}
          className={`
            w-full px-4 py-3 bg-dark-700 border rounded-xl transition-all duration-200
            text-slate-100 placeholder-slate-500
            focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-offset-dark-900
            disabled:bg-dark-800 disabled:text-slate-600 disabled:cursor-not-allowed
            ${icon ? 'pl-11' : ''}
            ${hasError ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500' :
              hasSuccess ? 'border-green-500/50 focus:ring-green-500/50 focus:border-green-500 pr-11' :
              isFocused ? 'border-violet-500/50 focus:ring-violet-500/50' :
              'border-dark-600 hover:border-dark-500 focus:ring-violet-500/50 focus:border-violet-500'}
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
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400 pointer-events-none">
            <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
          </div>
        )}

        {/* Error Icon */}
        {hasError && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 pointer-events-none">
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
        <p id={errorId} className="text-xs text-red-400 flex items-center gap-1" role="alert">
          <AlertCircle className="w-3 h-3" aria-hidden="true" />
          {error}
        </p>
      )}

      {/* Success Message */}
      {success && !error && (
        <p id={successId} className="text-xs text-green-400 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
          {success}
        </p>
      )}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
  error?: string;
  helpText?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  helpText,
  className = '',
  required,
  ...props
}) => {
  const selectId = useId();
  const helpTextId = useId();
  const errorId = useId();
  const hasError = !!error;

  return (
    <div className="flex flex-col gap-1.5 mb-4">
      <label
        htmlFor={selectId}
        className="text-sm font-medium text-slate-300 flex items-center gap-1"
      >
        {label}
        {required && <span className="text-violet-400" aria-label="required">*</span>}
      </label>
      <select
        id={selectId}
        className={`
          px-4 py-3 bg-dark-700 border rounded-xl transition-all duration-200
          text-slate-100
          focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500
          disabled:bg-dark-800 disabled:text-slate-600 disabled:cursor-not-allowed
          ${hasError ? 'border-red-500/50 focus:ring-red-500/50' : 'border-dark-600 hover:border-dark-500'}
          ${className}
        `}
        aria-required={required}
        aria-invalid={hasError}
        aria-describedby={`${helpText ? helpTextId : ''} ${error ? errorId : ''}`.trim()}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-dark-700">
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
        <p id={errorId} className="text-xs text-red-400 flex items-center gap-1" role="alert">
          <AlertCircle className="w-3 h-3" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
};

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  success?: string;
  helpText?: string;
  showCharacterCount?: boolean;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  success,
  helpText,
  showCharacterCount,
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
    <div className="flex flex-col gap-1.5 mb-4">
      <div className="flex items-center justify-between">
        <label
          htmlFor={textareaId}
          className="text-sm font-medium text-slate-300 flex items-center gap-1"
        >
          {label}
          {required && <span className="text-violet-400" aria-label="required">*</span>}
        </label>

        {showCharacterCount && maxLength && (
          <span
            className={`text-xs ${currentLength > maxLength * 0.9 ? 'text-amber-400 font-medium' : 'text-slate-500'}`}
            aria-live="polite"
          >
            {currentLength}/{maxLength}
          </span>
        )}
      </div>

      <textarea
        id={textareaId}
        className={`
          px-4 py-3 bg-dark-700 border rounded-xl transition-all duration-200
          text-slate-100 placeholder-slate-500
          focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-offset-dark-900
          disabled:bg-dark-800 disabled:text-slate-600 disabled:cursor-not-allowed
          ${hasError ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500' :
            hasSuccess ? 'border-green-500/50 focus:ring-green-500/50 focus:border-green-500' :
            'border-dark-600 hover:border-dark-500 focus:ring-violet-500/50 focus:border-violet-500'}
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
        <p id={errorId} className="text-xs text-red-400 flex items-center gap-1" role="alert">
          <AlertCircle className="w-3 h-3" aria-hidden="true" />
          {error}
        </p>
      )}

      {success && !error && (
        <p id={successId} className="text-xs text-green-400 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
          {success}
        </p>
      )}
    </div>
  );
};
