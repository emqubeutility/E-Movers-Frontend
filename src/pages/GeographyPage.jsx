import { useState } from 'react';
import { Building, Globe2, Map as MapIcon } from 'lucide-react';
import Topbar from '../components/layout/Topbar.jsx';
import GeoTab from '../features/geography/GeoTab.jsx';

const TABS = [
  {
    resource: 'countries',
    title: 'Countries',
    label: 'Country',
    singular: 'country',
    icon: Globe2,
  },
  { resource: 'states', title: 'States', label: 'State', singular: 'state', icon: MapIcon },
  { resource: 'cities', title: 'Cities', label: 'City', singular: 'city', icon: Building },
];

export default function GeographyPage() {
  const [active, setActive] = useState(TABS[0].resource);
  const tab = TABS.find((item) => item.resource === active);

  return (
    <>
      <Topbar title="Geography" breadcrumb={['Master']} />

      <div className="tabs" role="tablist" aria-label="Geography">
        {TABS.map(({ resource, label, icon: Icon }) => (
          <button
            key={resource}
            type="button"
            role="tab"
            aria-selected={active === resource}
            className={`tab${active === resource ? ' is-active' : ''}`}
            onClick={() => setActive(resource)}
          >
            <span className="tab-ico" aria-hidden="true">
              <Icon />
            </span>
            {label}
          </button>
        ))}
      </div>

      <GeoTab
        key={tab.resource}
        resource={tab.resource}
        title={tab.title}
        singular={tab.singular}
      />
    </>
  );
}
