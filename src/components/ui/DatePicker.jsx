import { useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePopover } from '../../hooks/usePopover.js';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const pad = (value) => String(value).padStart(2, '0');
const toIso = (year, month, day) => `${year}-${pad(month + 1)}-${pad(day)}`;
const todayIso = () => {
  const now = new Date();
  return toIso(now.getFullYear(), now.getMonth(), now.getDate());
};

/** "2026-11-23" -> "23 Nov 2026". */
function formatDate(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return `${day} ${MONTHS[month - 1].slice(0, 3)} ${year}`;
}

/** The 6-week grid for a month: { iso, day, inMonth }. */
function monthGrid(year, month) {
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(Date.UTC(year, month, index - first + 1));
    return {
      iso: toIso(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === month,
    };
  });
}

/** "14:30" -> { hour: 2, minute: 30, pm: true }; nothing -> 9:00 AM. */
function splitTime(time) {
  if (!time) return { hour: 9, minute: 0, pm: false };
  const [h, m] = time.split(':').map(Number);
  return { hour: h % 12 || 12, minute: m, pm: h >= 12 };
}
const joinTime = ({ hour, minute, pm }) => `${pad((hour % 12) + (pm ? 12 : 0))}:${pad(minute)}`;
const formatTime = (time) => {
  if (!time) return '';
  const { hour, minute, pm } = splitTime(time);
  return `${hour}:${pad(minute)} ${pm ? 'PM' : 'AM'}`;
};

const HOUR_MARKS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTE_MARKS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const DIAL = 216;
const RADIUS = 84;

/** A clock face: pick the hour (1–12) or the minute (in steps of 5). */
function ClockDial({ mode, hour, minute, onPick }) {
  const marks = mode === 'hour' ? HOUR_MARKS : MINUTE_MARKS;
  const current = mode === 'hour' ? hour % 12 : Math.round(minute / 5) % 12;
  return (
    <div className="clock" style={{ width: DIAL, height: DIAL }}>
      <span
        className="clock-hand"
        style={{ height: RADIUS, transform: `translateX(-50%) rotate(${current * 30}deg)` }}
      />
      <span className="clock-center" />
      {marks.map((mark, index) => {
        const radians = ((index * 30 - 90) * Math.PI) / 180;
        const selected = index === current;
        return (
          <button
            key={mark}
            type="button"
            className={`clock-mark${selected ? ' is-selected' : ''}`}
            style={{
              left: DIAL / 2 + RADIUS * Math.cos(radians),
              top: DIAL / 2 + RADIUS * Math.sin(radians),
            }}
            aria-pressed={selected}
            aria-label={mode === 'hour' ? `${mark} o'clock` : `${mark} minutes`}
            onClick={() => onPick(mark)}
          >
            {mode === 'hour' ? mark : pad(mark)}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Themed date picker (never the browser's native one), laid out like a Material date dialog.
 * value / onChange use "YYYY-MM-DD" text; '' means no date.
 * With `onTimeChange`, "Next" on the date opens a clock to pick the time (`time` is "HH:MM").
 */
export default function DatePicker({
  value,
  onChange,
  time,
  onTimeChange,
  placeholder,
  id,
  disabled = false,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}) {
  const popover = usePopover();
  const withTime = Boolean(onTimeChange);
  const [step, setStep] = useState('date');
  const [draftDate, setDraftDate] = useState('');
  const [draftTime, setDraftTime] = useState(splitTime(''));
  const [clockMode, setClockMode] = useState('hour');
  const [view, setView] = useState({ year: 2026, month: 0 });

  function toggle() {
    if (popover.open) {
      popover.close();
      return;
    }
    const start = value || todayIso();
    const [year, month] = start.split('-').map(Number);
    setView({ year, month: month - 1 });
    setDraftDate(start);
    setDraftTime(splitTime(time));
    setStep('date');
    setClockMode('hour');
    popover.setOpen(true);
  }

  function close() {
    popover.close();
    popover.anchorRef.current?.focus();
  }

  function move(offset) {
    setView(({ year, month }) => {
      const next = month + offset;
      return { year: year + Math.floor(next / 12), month: ((next % 12) + 12) % 12 };
    });
  }

  function confirmDate() {
    if (withTime) {
      setStep('time');
      return;
    }
    onChange(draftDate);
    close();
  }

  function confirmTime() {
    onChange(draftDate);
    onTimeChange(joinTime(draftTime));
    close();
  }

  function clear() {
    onChange('');
    if (withTime) onTimeChange('');
    close();
  }

  function pickOnDial(mark) {
    if (clockMode === 'hour') {
      setDraftTime((current) => ({ ...current, hour: mark }));
      setClockMode('minute');
    } else {
      setDraftTime((current) => ({ ...current, minute: mark }));
    }
  }

  const today = todayIso();
  const label = value
    ? [formatDate(value), withTime && formatTime(time)].filter(Boolean).join(', ')
    : '';
  const shownPlaceholder = placeholder ?? (withTime ? 'Select date and time' : 'Select date');

  const actions = (left, onOk, okLabel) => (
    <div className="md-actions">
      {left}
      <span className="md-actions-end">
        <button type="button" className="dp-link" onClick={close}>
          Cancel
        </button>
        <button type="button" className="dp-link" onClick={onOk}>
          {okLabel}
        </button>
      </span>
    </div>
  );

  return (
    <div className={`dropdown datepicker${popover.open ? ' is-open' : ''}`}>
      <button
        ref={popover.anchorRef}
        id={id}
        type="button"
        className="dropdown-toggle"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={popover.open}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        onClick={toggle}
      >
        <span className={`value${label ? '' : ' placeholder'}`}>{label || shownPlaceholder}</span>
        <span className="caret" aria-hidden="true">
          <CalendarDays />
        </span>
      </button>

      {popover.open &&
        createPortal(
          <div
            ref={popover.menuRef}
            className="menu md-picker"
            style={popover.style}
            role="dialog"
            aria-label={ariaLabel || 'Choose a date'}
          >
            {step === 'date' ? (
              <>
                <div className="md-head">
                  <span className="md-caption">Select date</span>
                  <strong className="md-title">{formatDate(draftDate)}</strong>
                </div>
                <div className="md-month">
                  <strong>
                    {MONTHS[view.month]} {view.year}
                  </strong>
                  <span>
                    <button
                      type="button"
                      className="dp-nav"
                      onClick={() => move(-1)}
                      aria-label="Previous month"
                    >
                      <ChevronLeft />
                    </button>
                    <button
                      type="button"
                      className="dp-nav"
                      onClick={() => move(1)}
                      aria-label="Next month"
                    >
                      <ChevronRight />
                    </button>
                  </span>
                </div>
                <div className="dp-grid">
                  {DAYS.map((day, index) => (
                    <span key={index} className="dp-dow">
                      {day}
                    </span>
                  ))}
                  {monthGrid(view.year, view.month).map((cell) => (
                    <button
                      key={cell.iso}
                      type="button"
                      className={[
                        'dp-day',
                        !cell.inMonth && 'is-other',
                        cell.iso === today && 'is-today',
                        cell.iso === draftDate && 'is-selected',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      aria-pressed={cell.iso === draftDate}
                      aria-label={formatDate(cell.iso)}
                      onClick={() => setDraftDate(cell.iso)}
                    >
                      {cell.day}
                    </button>
                  ))}
                </div>
                {actions(
                  <button type="button" className="dp-link" onClick={clear}>
                    Clear
                  </button>,
                  confirmDate,
                  withTime ? 'Next' : 'OK',
                )}
              </>
            ) : (
              <>
                <div className="md-head">
                  <span className="md-caption">Select time · {formatDate(draftDate)}</span>
                  <div className="md-time">
                    <button
                      type="button"
                      className={`md-time-box${clockMode === 'hour' ? ' is-active' : ''}`}
                      onClick={() => setClockMode('hour')}
                      aria-label="Hour"
                    >
                      {pad(draftTime.hour)}
                    </button>
                    <span className="md-colon">:</span>
                    <button
                      type="button"
                      className={`md-time-box${clockMode === 'minute' ? ' is-active' : ''}`}
                      onClick={() => setClockMode('minute')}
                      aria-label="Minute"
                    >
                      {pad(draftTime.minute)}
                    </button>
                    <span className="md-ampm">
                      {['AM', 'PM'].map((half) => (
                        <button
                          key={half}
                          type="button"
                          className={draftTime.pm === (half === 'PM') ? 'is-active' : ''}
                          onClick={() =>
                            setDraftTime((current) => ({ ...current, pm: half === 'PM' }))
                          }
                        >
                          {half}
                        </button>
                      ))}
                    </span>
                  </div>
                </div>
                <ClockDial
                  mode={clockMode}
                  hour={draftTime.hour}
                  minute={draftTime.minute}
                  onPick={pickOnDial}
                />
                {actions(
                  <button type="button" className="dp-link" onClick={() => setStep('date')}>
                    Back
                  </button>,
                  confirmTime,
                  'OK',
                )}
              </>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
