import { useEffect, useMemo, useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import Topbar from '../components/layout/Topbar.jsx';
import { EmptyState, ErrorAlert } from '../components/ui/Display.jsx';
import Dropdown from '../components/ui/Dropdown.jsx';
import Field from '../components/ui/Field.jsx';
import { Loader } from '../components/ui/Loader.jsx';
import { QueryError } from '../components/ui/QueryState.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { usePermissions } from '../features/auth/permissions.js';
import MenuTree, {
  buildMenuTree,
  sameFlags,
  sameSelection,
  toggleNode,
} from '../features/menu-access/MenuTree.jsx';
import {
  useFunctionMenuAccess,
  useMenuFunctions,
  useRoleMenuAccess,
  useSaveFunctionMenuAccess,
  useSaveRoleMenuAccess,
} from '../features/menu-access/hooks.js';
import { useRoles } from '../features/role/hooks.js';
import { ACTION, MENU } from '../lib/permissions.js';

const ROLE_TAB = 'role';
const FUNCTION_TAB = 'function';

export default function MenuAccessPage() {
  const toast = useToast();
  const { can } = usePermissions();
  const roles = useRoles();
  const functions = useMenuFunctions();
  const [tab, setTab] = useState(ROLE_TAB);
  const [roleId, setRoleId] = useState('');
  const [functionId, setFunctionId] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [flags, setFlags] = useState(() => new Map());

  const roleQuery = useRoleMenuAccess(roleId);
  const functionQuery = useFunctionMenuAccess(functionId);
  const saveRole = useSaveRoleMenuAccess();
  const saveFunction = useSaveFunctionMenuAccess();

  const active = tab === ROLE_TAB ? roleQuery : functionQuery;
  const menus = active.data?.menus;
  const tree = useMemo(() => buildMenuTree(menus ?? []), [menus]);
  const saved = useMemo(
    () => new Set((menus ?? []).filter((menu) => menu.selected).map((menu) => menu.id)),
    [menus],
  );

  const savedFlags = useMemo(
    () =>
      new Map(
        (menus ?? []).map((menu) => [
          menu.id,
          { create: menu.create, edit: menu.edit, delete: menu.delete },
        ]),
      ),
    [menus],
  );

  useEffect(() => {
    setSelected(new Set(saved));
    setFlags(new Map(savedFlags));
  }, [saved, savedFlags]);

  const roleOptions = useMemo(
    () =>
      (roles.data ?? []).map((role) => ({
        value: role.id,
        label: `${role.name} · ${role.code}`,
      })),
    [roles.data],
  );
  const functionOptions = useMemo(
    () => (functions.data ?? []).map((fn) => ({ value: fn.id, label: fn.name })),
    [functions.data],
  );

  const canEdit = can(MENU.MENU_ACCESS, ACTION.EDIT);
  const superAdmin = tab === ROLE_TAB && Boolean(roleQuery.data?.isSuperAdmin);
  const selectionId = tab === ROLE_TAB ? roleId : functionId;
  const saving = saveRole.isPending || saveFunction.isPending;
  const dirty =
    !sameSelection(selected, saved) ||
    (tab === ROLE_TAB && !sameFlags(flags, savedFlags, selected));
  const locked = superAdmin || !canEdit;
  const saveError = saveRole.error ?? saveFunction.error;

  function switchTab(next) {
    setTab(next);
    setSelected(new Set());
    setFlags(new Map());
  }

  function toggleFlag(node, key) {
    setFlags((current) => {
      const next = new Map(current);
      next.set(node.id, { ...current.get(node.id), [key]: !current.get(node.id)?.[key] });
      return next;
    });
  }

  async function save() {
    try {
      if (tab === ROLE_TAB) {
        const grants = [...selected].map((id) => ({
          menuItemId: id,
          create: Boolean(flags.get(id)?.create),
          edit: Boolean(flags.get(id)?.edit),
          delete: Boolean(flags.get(id)?.delete),
        }));
        await saveRole.mutateAsync({ roleId, grants });
      } else await saveFunction.mutateAsync({ functionId, menuItemIds: [...selected] });
      toast.success(tab === ROLE_TAB ? 'Role menus saved' : 'Menu function saved');
    } catch {
      // Shown by the alert below.
    }
  }

  const selectedLabel = tab === ROLE_TAB ? 'role' : 'function';

  return (
    <>
      <Topbar title="Menu access" breadcrumb={['Administration']} />

      <div className="tabs" role="tablist" aria-label="Menu access">
        <button
          type="button"
          role="tab"
          aria-selected={tab === ROLE_TAB}
          className={`tab${tab === ROLE_TAB ? ' is-active' : ''}`}
          onClick={() => switchTab(ROLE_TAB)}
        >
          <span className="tab-ico" aria-hidden="true">
            <ShieldCheck />
          </span>
          Menu role
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === FUNCTION_TAB}
          className={`tab${tab === FUNCTION_TAB ? ' is-active' : ''}`}
          onClick={() => switchTab(FUNCTION_TAB)}
        >
          <span className="tab-ico" aria-hidden="true">
            <KeyRound />
          </span>
          Menu function
        </button>
      </div>

      <section className="card card-lg">
        <div className="card-head">
          <div>
            <h3>{tab === ROLE_TAB ? 'Screens a role can open' : 'Screens a function owns'}</h3>
            <div className="sub">
              {tab === ROLE_TAB
                ? 'Tick a screen to let the role open it, then choose Add, Edit and Delete for it.'
                : 'Tick the screens that belong to each business function. A person sees a screen only if their role allows it and one of their functions owns it. Screens no function owns stay open to every role that has them.'}
            </div>
          </div>
          <div className="actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!selectionId || !dirty || saving || locked}
              onClick={save}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>

        {functions.isError && (
          <QueryError error={functions.error} onRetry={() => functions.refetch()} />
        )}

        <div className="form-grid">
          <Field label={tab === ROLE_TAB ? 'Role' : 'Function'} required>
            {tab === ROLE_TAB ? (
              <Dropdown
                options={roleOptions}
                value={roleId}
                onChange={setRoleId}
                placeholder="Select role"
                search
                disabled={saving}
                aria-label="Select role"
              />
            ) : (
              <Dropdown
                options={functionOptions}
                value={functionId}
                onChange={setFunctionId}
                placeholder="Select function"
                disabled={saving || functions.isPending}
                aria-label="Select function"
              />
            )}
          </Field>
        </div>

        {superAdmin && (
          <div className="alert" role="status">
            The super administrator always has every menu, so this list is read-only.
          </div>
        )}

        <ErrorAlert message={saveError?.message} />

        {!selectionId ? (
          <EmptyState
            icon={tab === ROLE_TAB ? ShieldCheck : KeyRound}
            title={`Select a ${selectedLabel}`}
            text={
              tab === ROLE_TAB
                ? 'Pick a role to see and change the screens it can open.'
                : 'Pick a function such as Sales to see and change the screens it owns.'
            }
          />
        ) : (
          <>
            {active.isPending && <Loader label="Loading menus" />}
            <QueryError error={active.error} onRetry={() => active.refetch()} />

            {active.isSuccess && menus?.length === 0 && (
              <EmptyState
                title="No menus configured"
                text="Menu items need to exist before access can be assigned."
              />
            )}

            {active.isSuccess && menus?.length > 0 && (
              <>
                <div className="menu-tree-tools">
                  <button
                    type="button"
                    className="link-btn"
                    disabled={locked}
                    onClick={() => setSelected(new Set(menus.map((menu) => menu.id)))}
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    className="link-btn"
                    disabled={locked}
                    onClick={() => setSelected(new Set())}
                  >
                    Clear all
                  </button>
                  <span className="small muted">
                    {selected.size} of {menus.length} selected
                  </span>
                </div>
                <div className="menu-tree-wrap">
                  <MenuTree
                    nodes={tree}
                    selected={selected}
                    onToggle={(node) => setSelected((current) => toggleNode(current, node))}
                    flags={tab === ROLE_TAB ? flags : null}
                    onFlag={toggleFlag}
                    disabled={locked || saving}
                  />
                </div>
              </>
            )}
          </>
        )}
      </section>
    </>
  );
}
