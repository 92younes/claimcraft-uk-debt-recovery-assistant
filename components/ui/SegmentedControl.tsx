import React from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: Array<SegmentedOption<T>>;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div className={`flex bg-white rounded-xl border border-slate-200 p-1 shadow-sm overflow-x-auto max-w-full ${className}`}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-teal-500/30 ${
              selected ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
            aria-pressed={selected}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}


