import {
  Boxes,
  Building2,
  ClipboardList,
  Settings,
  Map as MapIcon,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  ShieldCheck,
  UserCog,
  UserRound,
  Users,
} from 'lucide-react';

/**
 * Icons are stored on `menu_item.css_class` in lucide kebab-case, so new menus only need a row in
 * the database and, when they use a new icon, an entry here.
 */
const ICONS = Object.freeze({
  'layout-dashboard': LayoutDashboard,
  'shield-check': ShieldCheck,
  'key-round': KeyRound,
  boxes: Boxes,
  'clipboard-list': ClipboardList,
  'building-2': Building2,
  building: Building2,
  settings: Settings,
  map: MapIcon,
  list: ListChecks,
  'user-round': UserRound,
  users: Users,
});

export function isPathActive(to, pathname) {
  return Boolean(to) && (pathname === to || pathname.startsWith(`${to}/`));
}

/**
 * Builds the left menu from the menus the API granted to the signed-in user. A menu with children
 * becomes an accordion; a leaf with a page URL becomes a link. A granted child whose parent was not
 * granted is still shown, as a top-level link.
 */
export function buildNavigation(menus) {
  const byId = new Map(menus.map((menu) => [menu.id, menu]));
  const byOrder = (left, right) => (left.order ?? 0) - (right.order ?? 0);
  const roots = menus.filter((menu) => !menu.parentId || !byId.has(menu.parentId)).sort(byOrder);

  const modules = roots
    .map((menu) => {
      const items = menus
        .filter((child) => child.parentId === menu.id && child.pageUrl)
        .sort(byOrder)
        .map((child) => ({ to: child.pageUrl, label: child.name }));
      return {
        id: menu.code.toLowerCase(),
        label: menu.name,
        icon: ICONS[menu.icon] ?? LayoutDashboard,
        to: items.length > 0 ? null : menu.pageUrl,
        items,
      };
    })
    .filter((module) => module.to || module.items.length > 0);

  return [
    ...modules,
    {
      id: 'account',
      label: 'Account',
      icon: UserCog,
      items: [
        { to: '/account/profile', label: 'My profile' },
        { to: '/account/password', label: 'Change password' },
      ],
    },
  ];
}

export function activeModuleId(pathname, modules) {
  const match = modules.find((module) =>
    module.to
      ? isPathActive(module.to, pathname)
      : module.items.some((item) => isPathActive(item.to, pathname)),
  );
  return match?.id ?? null;
}
