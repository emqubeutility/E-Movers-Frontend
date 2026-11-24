import { Check } from 'lucide-react';

/** Turns the flat menu list from the API into parents with nested children. */
export function buildMenuTree(menus) {
  const nodes = menus.map((menu) => ({ ...menu, children: [] }));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const roots = [];
  for (const node of nodes) {
    const parent = node.parentId ? byId.get(node.parentId) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

export function subtreeIds(node) {
  return [node.id, ...node.children.flatMap(subtreeIds)];
}

/**
 * Ticking a parent ticks its whole branch, which is what the legacy Menu Role screen did.
 * Ticking a child leaves the parent alone, so a role can open one screen of a group.
 */
export function toggleNode(selected, node) {
  const next = new Set(selected);
  const select = !next.has(node.id);
  for (const id of subtreeIds(node)) {
    if (select) next.add(id);
    else next.delete(id);
  }
  return next;
}

export function sameSelection(left, right) {
  if (left.size !== right.size) return false;
  for (const id of left) if (!right.has(id)) return false;
  return true;
}

export const FLAG_KEYS = [
  { key: 'create', label: 'Add' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
];

export function sameFlags(left, right, ids) {
  return [...ids].every((id) =>
    FLAG_KEYS.every(({ key }) => Boolean(left.get(id)?.[key]) === Boolean(right.get(id)?.[key])),
  );
}

/**
 * `flags` (id -> { create, edit, delete }) and `onFlag(node, key)` are optional: when given, every
 * ticked screen shows Add / Edit / Delete boxes beside its name.
 */
export default function MenuTree({
  nodes,
  selected,
  onToggle,
  flags = null,
  onFlag = null,
  disabled = false,
}) {
  if (nodes.length === 0) return null;
  return (
    <ul className="menu-tree">
      {nodes.map((node) => (
        <li key={node.id}>
          <label className="check menu-tree-label">
            <input
              type="checkbox"
              checked={selected.has(node.id)}
              disabled={disabled}
              onChange={() => onToggle(node)}
            />
            <span className="box" aria-hidden="true">
              <Check />
            </span>
            <span className="menu-tree-name">{node.name}</span>
            {node.pageUrl && <span className="menu-tree-url">{node.pageUrl}</span>}
          </label>
          {flags && onFlag && selected.has(node.id) && node.children.length === 0 && (
            <span className="menu-tree-flags">
              {FLAG_KEYS.map(({ key, label }) => (
                <label key={key} className="check small">
                  <input
                    type="checkbox"
                    checked={Boolean(flags.get(node.id)?.[key])}
                    disabled={disabled}
                    onChange={() => onFlag(node, key)}
                  />
                  <span className="box" aria-hidden="true">
                    <Check />
                  </span>
                  <span>{label}</span>
                </label>
              ))}
            </span>
          )}
          {node.children.length > 0 && (
            <MenuTree
              nodes={node.children}
              selected={selected}
              onToggle={onToggle}
              flags={flags}
              onFlag={onFlag}
              disabled={disabled}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
