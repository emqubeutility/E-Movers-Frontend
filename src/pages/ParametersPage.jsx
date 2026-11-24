import { useSearchParams } from 'react-router-dom';
import { List, ListChecks } from 'lucide-react';
import Topbar from '../components/layout/Topbar.jsx';
import ParamTab from '../features/parameter/ParamTab.jsx';

const TABS = [
  {
    kind: 'types',
    resource: 'parameter-types',
    title: 'Parameter types',
    label: 'Parameter types',
    singular: 'parameter type',
    icon: ListChecks,
  },
  {
    kind: 'values',
    resource: 'parameters',
    title: 'Parameters',
    label: 'Parameters',
    singular: 'parameter',
    icon: List,
  },
];

/** Dropdown types (fixed or dynamic) and the values each one holds. */
export default function ParametersPage() {
  const [search, setSearch] = useSearchParams();
  const tab = TABS.find((item) => item.kind === search.get('tab')) ?? TABS[0];
  const active = tab.resource;

  return (
    <>
      <Topbar title="Parameters" breadcrumb={['Setup']} />

      <div className="tabs" role="tablist" aria-label="Parameters">
        {TABS.map(({ resource, kind, label, icon: Icon }) => (
          <button
            key={resource}
            type="button"
            role="tab"
            aria-selected={active === resource}
            className={`tab${active === resource ? ' is-active' : ''}`}
            onClick={() => setSearch({ tab: kind })}
          >
            <span className="tab-ico" aria-hidden="true">
              <Icon />
            </span>
            {label}
          </button>
        ))}
      </div>

      <ParamTab
        key={tab.resource}
        resource={tab.resource}
        kind={tab.kind}
        title={tab.title}
        singular={tab.singular}
      />
    </>
  );
}
