import { describe, expect, it } from 'vitest';
import { buildMenuTree, sameSelection, toggleNode } from './MenuTree.jsx';

const MENUS = [
  { id: 1, name: 'Overview', parentId: null, pageUrl: '/overview', selected: true },
  { id: 2, name: 'Administration', parentId: null, pageUrl: null, selected: false },
  { id: 3, name: 'Users', parentId: 2, pageUrl: '/users', selected: false },
  { id: 4, name: 'Roles', parentId: 2, pageUrl: '/roles', selected: false },
];

describe('menu tree', () => {
  it('nests children under their parent, in list order', () => {
    const tree = buildMenuTree(MENUS);

    expect(tree.map((node) => node.name)).toEqual(['Overview', 'Administration']);
    expect(tree[1].children.map((node) => node.name)).toEqual(['Users', 'Roles']);
  });

  it('ticking a parent ticks its whole branch', () => {
    const tree = buildMenuTree(MENUS);
    const next = toggleNode(new Set([1]), tree[1]);

    expect([...next].sort()).toEqual([1, 2, 3, 4]);
  });

  it('ticking a parent again clears its branch but nothing else', () => {
    const tree = buildMenuTree(MENUS);
    const next = toggleNode(new Set([1, 2, 3, 4]), tree[1]);

    expect([...next]).toEqual([1]);
  });

  it('ticking a child leaves the parent alone', () => {
    const tree = buildMenuTree(MENUS);
    const next = toggleNode(new Set(), tree[1].children[0]);

    expect([...next]).toEqual([3]);
  });

  it('compares selections regardless of the order they were added', () => {
    expect(sameSelection(new Set([1, 2]), new Set([2, 1]))).toBe(true);
    expect(sameSelection(new Set([1]), new Set([1, 2]))).toBe(false);
  });
});
