/**
 * 2-4 fixed options shown as pills. options: [{ value, label, color? }]
 * A `color` tints the selected pill (used for statuses).
 */
export default function ChoiceGroup({
  options,
  value,
  onChange,
  id,
  'aria-describedby': describedBy,
  'aria-label': ariaLabel,
}) {
  return (
    <div
      id={id}
      className="choice-group"
      role="radiogroup"
      aria-label={ariaLabel}
      aria-describedby={describedBy}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={`choice${active ? ' is-active' : ''}`}
            style={option.color ? { '--choice-tone': option.color } : undefined}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
