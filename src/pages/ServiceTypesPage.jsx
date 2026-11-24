import { useState } from 'react';
import { Layers, ListChecks } from 'lucide-react';
import Topbar from '../components/layout/Topbar.jsx';
import ServiceGroups from '../features/service/ServiceGroups.jsx';
import ServiceTypes from '../features/service/ServiceTypes.jsx';

const TABS = [
  { key: 'groups', label: 'Service groups', icon: Layers, Component: ServiceGroups },
  { key: 'types', label: 'Service types', icon: ListChecks, Component: ServiceTypes },
];

export default function ServiceTypesPage() {
  const [active, setActive] = useState('types');
  const { Component } = TABS.find((tab) => tab.key === active);

  return (
    <>
      <Topbar title="Services" breadcrumb={['Master']} />
      <div className="tabs" role="tablist" aria-label="Services">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active === key}
            className={`tab${active === key ? ' is-active' : ''}`}
            onClick={() => setActive(key)}
          >
            <span className="tab-ico" aria-hidden="true">
              <Icon />
            </span>
            {label}
          </button>
        ))}
      </div>
      <Component key={active} />
    </>
  );
}
