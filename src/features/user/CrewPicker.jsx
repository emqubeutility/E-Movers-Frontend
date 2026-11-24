import { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import Dropdown from '../../components/ui/Dropdown.jsx';
import { useCrewCandidates } from './lookups.js';

/**
 * Picks the crew members of a team leader. Shows the current team as chips, and the employees
 * who can be added (active, with a skill) narrowed by skill and name.
 */
export default function CrewPicker({ value, onChange, known = [], exclude, skillOptions = [] }) {
  const [skill, setSkill] = useState('');
  const [search, setSearch] = useState('');
  const query = useCrewCandidates({ skill, search: search.trim(), exclude });
  const candidates = useMemo(() => query.data ?? [], [query.data]);

  // Names for people already in the team, even when the filters hide them from the list.
  const names = useMemo(() => {
    const map = new Map(
      known.map((member) => [member.id, `${member.name} · ${member.employeeCode}`]),
    );
    candidates.forEach((item) => map.set(item.id, `${item.name} · ${item.employeeCode}`));
    return map;
  }, [known, candidates]);

  const toggle = (id) =>
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);

  return (
    <div className="crew-picker">
      <div className="crew-chips">
        {value.length === 0 && <span className="ov-sub">No crew members picked yet.</span>}
        {value.map((id) => (
          <button
            key={id}
            type="button"
            className="ov-chip crew-chip"
            onClick={() => toggle(id)}
            title="Remove"
          >
            {names.get(id) ?? 'Crew member'}
            <X />
          </button>
        ))}
      </div>
      <div className="crew-filter">
        <Dropdown
          options={skillOptions}
          value={skill}
          onChange={setSkill}
          placeholder="Any skill"
          clearable
          aria-label="Filter by skill"
        />
        <input
          className="input"
          type="search"
          placeholder="Search by name…"
          aria-label="Search crew"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <ul className="crew-list">
        {candidates.length === 0 && (
          <li className="ov-sub">
            {query.isPending ? 'Loading…' : 'No employees with a skill match.'}
          </li>
        )}
        {candidates.map((item) => (
          <li key={item.id}>
            <label className="check">
              <input
                type="checkbox"
                checked={value.includes(item.id)}
                onChange={() => toggle(item.id)}
              />
              <span className="box" aria-hidden="true">
                <Check />
              </span>
              <span className="crew-name">
                {item.name} <small>{item.employeeCode}</small>
              </span>
              <span className="crew-skills">
                {item.skills.map((entry) => (
                  <span key={entry.code} className="ov-chip">
                    {entry.name}
                  </span>
                ))}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
