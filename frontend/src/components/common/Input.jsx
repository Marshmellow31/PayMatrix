import { forwardRef } from 'react';

const Input = forwardRef(
  ({ label, error, icon: Icon, type = 'text', className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-on-surface-variant mb-2 font-inter"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-outline">
              <Icon size={18} />
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            className={`input-field ${Icon ? 'pl-11' : ''} ${
              error ? 'ring-1 ring-error' : ''
            } ${className}`}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-error font-inter">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
