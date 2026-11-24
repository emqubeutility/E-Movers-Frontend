import { forwardRef } from 'react';
import { Spinner } from './Loader.jsx';

export function buttonClass({
  variant = 'primary',
  size,
  icon = false,
  block = false,
  className,
} = {}) {
  return [
    'btn',
    `btn-${variant}`,
    size === 'sm' && 'btn-sm',
    icon && 'btn-icon',
    block && 'btn-block',
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

/** `.btn` from the design system. `loading` disables the button and shows a spinner. */
const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size,
    icon = false,
    block = false,
    loading = false,
    disabled = false,
    type = 'button',
    className,
    children,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass({ variant, size, icon, block, className })}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
});

export default Button;
