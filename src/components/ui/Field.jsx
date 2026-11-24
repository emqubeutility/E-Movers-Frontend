import { cloneElement, forwardRef, useId, useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

/**
 * Label + control + help text. An error replaces the help text and turns the control red.
 * The single child control receives the id and aria attributes.
 */
export default function Field({ label, required, error, help, span, className, children }) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error || help;
  const classes = [
    'field',
    error && 'has-error',
    span === 2 && 'span-2',
    span === 'all' && 'span-all',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      <label htmlFor={id}>
        {label}
        {required && (
          <span className="req" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-required': required || undefined,
        'aria-describedby': message ? messageId : undefined,
      })}
      {message && (
        <span id={messageId} className="field-help" role={error ? 'alert' : undefined}>
          {message}
        </span>
      )}
    </div>
  );
}

/** Input with a leading lucide icon. */
export const IconInput = forwardRef(function IconInput(
  { icon: Icon, className = '', ...rest },
  ref,
) {
  return (
    <div className="input-group">
      <Icon />
      <input ref={ref} className={`input ${className}`} {...rest} />
    </div>
  );
});

export const PasswordInput = forwardRef(function PasswordInput({ className = '', ...rest }, ref) {
  const [visible, setVisible] = useState(false);
  const Toggle = visible ? EyeOff : Eye;
  return (
    <div className="input-group">
      <Lock />
      <input
        ref={ref}
        type={visible ? 'text' : 'password'}
        className={`input has-trail ${className}`}
        {...rest}
      />
      <button
        type="button"
        className="icon-btn trail"
        aria-label={visible ? 'Hide password' : 'Show password'}
        title={visible ? 'Hide password' : 'Show password'}
        onClick={() => setVisible((value) => !value)}
      >
        <Toggle />
      </button>
    </div>
  );
});
