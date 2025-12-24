import React, { useState, useId, useEffect } from 'react';
import { Calendar, AlertCircle } from 'lucide-react';

interface DateInputProps {
  label?: string;
  hideLabel?: boolean;
  error?: string;
  helpText?: string;
  value: string; // ISO format (YYYY-MM-DD)
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  noMargin?: boolean;
  wrapperClassName?: string;
  min?: string; // ISO format
  max?: string; // ISO format
  /** Convenience prop: sets max to today's date (prevents future dates) */
  maxToday?: boolean;
}

// Helper to get today's date in ISO format
const getTodayISO = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * DateInput Component
 *
 * Handles UK date format (DD/MM/YYYY) for display and manual entry
 * while maintaining ISO format (YYYY-MM-DD) internally for consistency.
 *
 * Features:
 * - Accepts manual typing in DD/MM/YYYY format
 * - Converts to ISO format for storage
 * - Validates date format and values
 * - Provides fallback to native date picker
 */
export const DateInput: React.FC<DateInputProps> = ({
  label,
  hideLabel = false,
  error,
  helpText,
  value,
  onChange,
  required,
  disabled,
  className = '',
  noMargin = false,
  wrapperClassName = '',
  min,
  max,
  maxToday = false
}) => {
  // Calculate effective max date
  const effectiveMax = maxToday ? getTodayISO() : max;
  const inputId = useId();
  const helpTextId = useId();
  const errorId = useId();

  // Display format: DD/MM/YYYY for UK users
  const [displayValue, setDisplayValue] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Convert ISO (YYYY-MM-DD) to UK format (DD/MM/YYYY) for display
  const isoToUK = (isoDate: string): string => {
    if (!isoDate) return '';
    try {
      const [year, month, day] = isoDate.split('-');
      if (year && month && day) {
        return `${day}/${month}/${year}`;
      }
      return '';
    } catch {
      return '';
    }
  };

  // Convert UK format (DD/MM/YYYY) to ISO (YYYY-MM-DD)
  const ukToISO = (ukDate: string): string | null => {
    if (!ukDate) return null;

    // Remove any extra spaces
    ukDate = ukDate.trim();

    // Try to parse DD/MM/YYYY
    const parts = ukDate.split('/');
    if (parts.length !== 3) return null;

    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];

    // Validate parts
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) return null;
    if (dayNum < 1 || dayNum > 31) return null;
    if (monthNum < 1 || monthNum > 12) return null;
    if (year.length !== 4 || yearNum < 1900 || yearNum > 2100) return null;

    const isoDate = `${year}-${month}-${day}`;

    // Validate the date is actually valid (e.g., not 31/02/2023)
    const testDate = new Date(isoDate);
    if (isNaN(testDate.getTime())) return null;

    // Check if the parsed date matches what we expect
    if (testDate.getFullYear() !== yearNum ||
        testDate.getMonth() + 1 !== monthNum ||
        testDate.getDate() !== dayNum) {
      return null;
    }

    return isoDate;
  };

  // Initialize display value from prop
  useEffect(() => {
    if (value) {
      setDisplayValue(isoToUK(value));
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setDisplayValue(input);
    setLocalError(null);

    // Don't validate while typing
    if (input.length < 10) {
      return;
    }

    // Try to parse and convert to ISO
    const isoDate = ukToISO(input);
    if (isoDate) {
      // Check min/max constraints
      if (min && isoDate < min) {
        setLocalError(`Date cannot be before ${isoToUK(min)}`);
        return;
      }
      if (effectiveMax && isoDate > effectiveMax) {
        setLocalError(maxToday ? 'Date cannot be in the future' : `Date cannot be after ${isoToUK(effectiveMax)}`);
        return;
      }

      onChange(isoDate);
    } else if (input.length === 10) {
      // Only show error if they've finished typing
      setLocalError('Invalid date format. Use DD/MM/YYYY');
    }
  };

  const handleBlur = () => {
    setIsFocused(false);

    // On blur, validate and reformat if needed
    if (displayValue && displayValue.length >= 8) {
      const isoDate = ukToISO(displayValue);
      if (isoDate) {
        setDisplayValue(isoToUK(isoDate)); // Normalize display
        setLocalError(null);
      } else {
        setLocalError('Invalid date. Please use DD/MM/YYYY format');
      }
    } else if (displayValue && displayValue.length < 8) {
      setLocalError('Incomplete date. Please use DD/MM/YYYY format');
    }
  };

  const hasError = !!(error || localError);
  const errorMessage = error || localError || '';

  return (
    <div className={`flex flex-col gap-1.5 ${noMargin ? '' : 'mb-5'} ${wrapperClassName}`}>
      {/* Label */}
      {(label || required) && label && (
        <label
          htmlFor={inputId}
          className={`${hideLabel ? 'sr-only' : 'text-sm font-medium text-slate-700'} flex items-center gap-1 mb-0.5`}
        >
          {label}
          {required && <span className="text-teal-500" aria-label="required">*</span>}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        {/* Calendar Icon */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <Calendar className="w-4 h-4" />
        </div>

        {/* Text Input for UK Format */}
        <input
          type="text"
          id={inputId}
          className={`
            w-full px-4 py-3 bg-white border rounded-xl transition-all duration-200 shadow-soft
            text-base text-slate-900 placeholder-slate-400 pl-11
            focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0
            disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed
            ${hasError ? 'border-red-300 focus-visible:ring-red-500/30 focus:border-red-500 pr-11' :
              isFocused ? 'border-teal-400 focus-visible:ring-teal-500/30' :
              'border-slate-200 hover:border-slate-300 focus-visible:ring-teal-500/30 focus:border-teal-500'}
            ${className}
          `}
          value={displayValue}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          placeholder="DD/MM/YYYY"
          disabled={disabled}
          maxLength={10}
          aria-required={required}
          aria-invalid={hasError}
          aria-describedby={`
            ${helpText ? helpTextId : ''}
            ${errorMessage ? errorId : ''}
          `.trim()}
        />

        {/* Error Icon */}
        {hasError && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 pointer-events-none">
            <AlertCircle className="w-5 h-5" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Help Text */}
      {helpText && !hasError && (
        <p id={helpTextId} className="text-xs text-slate-500">
          {helpText}
        </p>
      )}

      {/* Error Message */}
      {errorMessage && (
        <p id={errorId} className="text-xs text-red-600 flex items-center gap-1" role="alert">
          <AlertCircle className="w-3 h-3" aria-hidden="true" />
          {errorMessage}
        </p>
      )}

      {/* Format hint */}
      {!helpText && !hasError && (
        <p className="text-xs text-slate-400">
          Enter date as DD/MM/YYYY (e.g., 15/11/2025)
        </p>
      )}
    </div>
  );
};
