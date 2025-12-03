import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-300 mb-1">
            {label}
            {props.required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-4 py-3 rounded-lg border-2 transition-colors
            bg-[#0f1419] text-white placeholder-gray-500
            ${error
              ? 'border-red-500 focus:border-red-600 focus:ring-red-500'
              : 'border-gray-700 focus:border-[#6366f1] focus:ring-[#6366f1]'
            }
            focus:outline-none focus:ring-2 focus:ring-offset-0
            disabled:bg-gray-900 disabled:cursor-not-allowed
            text-base min-h-[48px]
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
