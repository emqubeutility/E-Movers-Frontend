import { Children } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useLocalState } from '../../hooks/useLocalState.js';
import { formatNumber } from '../../lib/format.js';
import { Avatar } from './Display.jsx';

const DONUT_LENGTH = 289; // circumference of r=46
const ROW_COLORS = ['#ffb3a0', '#e8847a', '#c8706a', '#d6d6da'];

function CardHead({ title, icon: Icon }) {
  return (
    <div className="mc-head">
      <span className="mc-title">{title}</span>
      <span className="mc-ico" aria-hidden="true">
        <Icon />
      </span>
    </div>
  );
}

/** Plain count over a large faded icon. */
export function WatermarkCard({ title, icon: Icon, value, note }) {
  return (
    <article className="metric-card mc-watermark">
      <CardHead title={title} icon={Icon} />
      <span className="mc-bg" aria-hidden="true">
        <Icon />
      </span>
      <span className="mc-value">{formatNumber(value)}</span>
      {note && <span className="mc-note">{note}</span>}
    </article>
  );
}

/** Percentage ring. legend: [[label, value, colour]] */
export function DonutCard({ title, icon, percent, legend }) {
  return (
    <article className="metric-card mc-donut">
      <CardHead title={title} icon={icon} />
      <div className="mc-body">
        <div className="donut" role="img" aria-label={`${title}: ${percent}%`}>
          <svg viewBox="0 0 112 112">
            <circle cx="56" cy="56" r="46" fill="none" stroke="var(--surface-3)" strokeWidth="12" />
            <circle
              cx="56"
              cy="56"
              r="46"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${(DONUT_LENGTH * percent) / 100} ${DONUT_LENGTH}`}
            />
          </svg>
          <span className="donut-center">{percent}%</span>
        </div>
        <ul className="mc-legend">
          {legend.map(([label, value, color]) => (
            <li key={label}>
              <i style={{ background: color }} />
              {label}
              <b>{formatNumber(value)}</b>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

/** Breakdown as horizontal bars. rows: [[label, count]] */
export function RowsCard({ title, icon, rows }) {
  const largest = Math.max(...rows.map(([, count]) => count), 1);
  return (
    <article className="metric-card mc-rows">
      <CardHead title={title} icon={icon} />
      <div className="rows">
        {rows.map(([label, count], index) => (
          <div key={label} className="mc-row">
            <span className="cell-trunc">{label}</span>
            <span className="track">
              <span
                className="fill"
                style={{
                  width: `${Math.max((count / largest) * 100, 4)}%`,
                  background: ROW_COLORS[index % ROW_COLORS.length],
                }}
              />
            </span>
            <b className="num">{count}</b>
          </div>
        ))}
        {rows.length === 0 && <span className="mc-note">Nothing to show yet</span>}
      </div>
    </article>
  );
}

/** People: up to four overlapping avatars and a "+N". */
export function StackCard({ title, icon, value, note, people }) {
  const shown = people.slice(0, 4);
  const extra = value - shown.length;
  return (
    <article className="metric-card mc-stack">
      <CardHead title={title} icon={icon} />
      <div className="mc-body">
        <div>
          <span className="mc-value">{formatNumber(value)}</span>
          {note && <div className="mc-note">{note}</div>}
        </div>
        <div className="avatar-group">
          {shown.map((name) => (
            <Avatar key={name} name={name} />
          ))}
          {extra > 0 && <span className="avatar">+{extra}</span>}
        </div>
      </div>
    </article>
  );
}

/** Row of metric cards with a Summary header; collapsed, it becomes a strip of pills. */
export function KpiSection({ storageKey, children }) {
  const [collapsed, setCollapsed] = useLocalState(`kpi.${storageKey}`, false);
  const cards = Children.toArray(children);
  const Icon = collapsed ? ChevronDown : ChevronUp;

  return (
    <section className="kpi" aria-label="Summary">
      <div className="kpi-head">
        Summary
        <button
          type="button"
          className="link-btn small row"
          style={{ gap: 4, textTransform: 'none', letterSpacing: 0 }}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? 'Show' : 'Hide'}
          <Icon />
        </button>
      </div>
      {collapsed ? (
        <div className="kpi-strip">
          {cards.map((card) => (
            <span key={card.props.title} className="kpi-pill">
              {card.props.title}
              <b>{card.props.summary ?? formatNumber(card.props.value)}</b>
            </span>
          ))}
        </div>
      ) : (
        <div className="grid grid-4">{cards}</div>
      )}
    </section>
  );
}
