import { describe, expect, it } from 'vitest';
import { allows } from './permissions.js';

const MENUS = [
  { code: 'USERS', view: true, create: true, edit: false, delete: false },
  { code: 'ROLES', view: true, create: false, edit: false, delete: false },
];

describe('allows', () => {
  it('grants only the actions present on the menu', () => {
    expect(allows(MENUS, 'USERS')).toBe(true);
    expect(allows(MENUS, 'USERS', 'create')).toBe(true);
    expect(allows(MENUS, 'USERS', 'edit')).toBe(false);
  });

  it('denies a menu the role was not granted', () => {
    expect(allows(MENUS, 'REPORTS')).toBe(false);
    expect(allows([], 'USERS')).toBe(false);
  });

  it('denies an action that is not a boolean true', () => {
    expect(allows([{ code: 'USERS', delete: undefined }], 'USERS', 'delete')).toBe(false);
  });
});
