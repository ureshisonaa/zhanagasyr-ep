import { forwardRef, type InputHTMLAttributes } from 'react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, id, className = '', ...rest }, ref) => {
    return (
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700" htmlFor={id}>
          {label}
        </label>
        <input
          id={id}
          ref={ref}
          className={`w-full rounded border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ink-900 ${className}`}
          {...rest}
        />
        {error && <p className="mt-1 text-sm text-danger">{error}</p>}
      </div>
    );
  },
);

FormField.displayName = 'FormField';
