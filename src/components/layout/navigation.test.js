import { describe, expect, it } from 'vitest';
import { activeModuleId, buildNavigation, isPathActive } from './navigation.js';

const GRANTED = [
  {
    id: 1,
    code: 'OVERVIEW',
    name: 'Overview',
    parentId: null,
    order: 1,
    pageUrl: '/overview',
    icon: 'layout-dashboard',
    view: true,
  },
  {
    id: 2,
    code: 'ADMINISTRATION',
    name: 'Administration',
    parentId: null,
    order: 2,
    pageUrl: null,
    icon: 'shield-check',
    view: true,
  },
  {
    id: 3,
    code: 'USERS',
    name: 'Users',
    parentId: 2,
    order: 3,
    pageUrl: '/users',
    icon: 'users',
    view: true,
  },
  {
    id: 4,
    code: 'ROLES',
    name: 'Roles',
    parentId: 2,
    order: 4,
    pageUrl: '/roles',
    icon: 'shield-check',
    view: true,
  },
];

describe('database-driven navigation', () => {
  it('turns granted menus into links and accordions, keeping Account last', () => {
    const modules = buildNavigation(GRANTED);

    expect(modules.map((module) => module.id)).toEqual([
      'overview',
      'administration',
      'account',
    ]);
    expect(modules[0].to).toBe('/overview');
    expect(modules[1].to).toBeNull();
    expect(modules[1].items).toEqual([
      { to: '/users', label: 'Users' },
      { to: '/roles', label: 'Roles' },
    ]);
  });

  it('shows a granted child as a top-level link when its parent was not granted', () => {
    const modules = buildNavigation(GRANTED.filter((menu) => menu.code !== 'ADMINISTRATION'));

    expect(modules.map((module) => module.id)).toEqual(['overview', 'users', 'roles', 'account']);
  });

  it('finds the current module from a child path', () => {
    expect(activeModuleId('/users', buildNavigation(GRANTED))).toBe('administration');
    expect(activeModuleId('/users/1/edit', buildNavigation(GRANTED))).toBe('administration');
    expect(activeModuleId('/account/profile', buildNavigation(GRANTED))).toBe('account');
  });

  it('matches exact paths and their children only', () => {
    expect(isPathActive('/users', '/users')).toBe(true);
    expect(isPathActive('/users', '/users/new')).toBe(true);
    expect(isPathActive('/users', '/users-add')).toBe(false);
  });
});
