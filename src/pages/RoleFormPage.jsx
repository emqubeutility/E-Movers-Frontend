import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, ShieldCheck } from 'lucide-react';
import Topbar from '../components/layout/Topbar.jsx';
import { EmptyState, ErrorAlert } from '../components/ui/Display.jsx';
import Field from '../components/ui/Field.jsx';
import { FormBar, FormSection } from '../components/ui/FormKit.jsx';
import { Loader } from '../components/ui/Loader.jsx';
import { QueryError } from '../components/ui/QueryState.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { useCreateRole, useRole, useRoleMenus, useUpdateRole } from '../features/role/hooks.js';
import { buildRoleSchema, toRolePayload } from '../features/role/schemas.js';
import { useApiFormErrors } from '../hooks/useApiFormErrors.js';

const LIST_PATH = '/roles';
const DEFAULTS = { code: '', name: '', level: '5', isActive: true };
const FORM_FIELDS = ['code', 'name', 'level'];
const LOCKED_CODES = ['SUPERADMIN', 'ADMIN'];
const ACTIONS = [
  { key: 'create', label: 'Create' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
];

/** menuItemId -> the permission the role grants on that menu. */
function permissionMap(items = []) {
  return Object.fromEntries(
    items.map((item) => [
      item.menuItemId,
      { menuItemId: item.menuItemId, create: item.create, edit: item.edit, delete: item.delete },
    ]),
  );
}

/** True when both permission maps grant the same rights. */
function samePermissions(a, b) {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every(
    (key) =>
      b[key] && ['create', 'edit', 'delete'].every((right) => a[key][right] === b[key][right]),
  );
}

/** Parents with their children nested one level, which is how the permissions table renders. */
function groupMenus(menus = []) {
  const children = new Map();
  for (const menu of menus) {
    if (!menu.parentId) continue;
    children.set(menu.parentId, [...(children.get(menu.parentId) || []), menu]);
  }
  return menus
    .filter((menu) => !menu.parentId)
    .map((menu) => ({ ...menu, children: children.get(menu.id) || [] }));
}

export default function RoleFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const record = useRole(id);
  const menus = useRoleMenus();
  const create = useCreateRole();
  const update = useUpdateRole();
  const mutation = editing ? update : create;

  const [permissions, setPermissions] = useState({});
  const { fieldErrors, formError } = useApiFormErrors(mutation.error);

  const resolver = useMemo(() => zodResolver(buildRoleSchema(editing)), [editing]);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm({ resolver, defaultValues: DEFAULTS });

  // Fill the form once the role arrives.
  useEffect(() => {
    if (!record.data) return;
    reset({
      code: record.data.code,
      name: record.data.name,
      level: String(record.data.level),
      isActive: record.data.isActive,
    });
    setPermissions(permissionMap(record.data.permissions));
  }, [record.data, reset]);

  // API field errors are shown next to their field; anything else becomes one alert.
  useEffect(() => {
    fieldErrors.forEach(({ field, message }) => {
      if (FORM_FIELDS.includes(field)) setError(field, { type: 'server', message });
    });
  }, [fieldErrors, setError]);

  const groupedMenus = useMemo(() => groupMenus(menus.data), [menus.data]);
  const lockedRole = Boolean(record.data && LOCKED_CODES.includes(record.data.code));
  const otherError = fieldErrors.find((item) => !FORM_FIELDS.includes(item.field))?.message;
  const permissionsChanged = Boolean(
    record.data && !samePermissions(permissions, permissionMap(record.data.permissions)),
  );

  function toggleView(menu) {
    setPermissions((current) => {
      const next = { ...current };
      if (next[menu.id]) delete next[menu.id];
      else next[menu.id] = { menuItemId: menu.id, create: false, edit: false, delete: false };
      return next;
    });
  }

  function toggleAction(menu, action) {
    setPermissions((current) => {
      const permission = current[menu.id];
      if (!permission) return current;
      return { ...current, [menu.id]: { ...permission, [action]: !permission[action] } };
    });
  }

  async function submit(values) {
    const payload = toRolePayload(values, Object.values(permissions), editing);
    try {
      if (editing) await update.mutateAsync({ id: Number(id), payload });
      else await create.mutateAsync(payload);
      toast.success(editing ? 'Role saved' : 'Role created');
      navigate(LIST_PATH);
    } catch {
      // Shown by the form.
    }
  }

  const title = editing ? `Edit role${record.data ? ` · ${record.data.name}` : ''}` : 'New role';
  const ready = (!editing || record.isSuccess) && menus.isSuccess;

  return (
    <>
      <Topbar title={title} breadcrumb={['Administration', 'Roles']} back={LIST_PATH} />

      {editing && record.isPending && <Loader label="Loading role" />}
      {editing && record.isError && (
        <div className="card card-lg">
          <EmptyState
            icon={ShieldCheck}
            title="Role not found"
            text={record.error.message}
            action={
              <Link to={LIST_PATH} className="btn btn-primary">
                Back to roles
              </Link>
            }
          />
        </div>
      )}
      {menus.isPending && <Loader label="Loading menu permissions" />}
      <QueryError error={menus.error} onRetry={() => menus.refetch()} />

      {ready && (
        <form className="form-layout" onSubmit={handleSubmit(submit)} noValidate>
          <div className="form-main">
            <ErrorAlert message={formError ?? otherError} />

            <FormSection
              number={1}
              title="Role details"
              sub="The code is the stable identifier; the name is what people see."
            >
              <Field
                label="Role code"
                required
                error={errors.code?.message}
                help="A letter, then letters, numbers or underscores."
              >
                <input className="input" disabled={editing || lockedRole} {...register('code')} />
              </Field>
              <Field label="Role name" required error={errors.name?.message}>
                <input className="input" disabled={lockedRole} {...register('name')} />
              </Field>
              <Field
                label="Role level"
                required
                error={errors.level?.message}
                help="Lower numbers represent higher rank."
              >
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="99"
                  disabled={lockedRole}
                  {...register('level')}
                />
              </Field>
              {editing && (
                <Field label="Status">
                  <label className="check">
                    <input type="checkbox" disabled={lockedRole} {...register('isActive')} />
                    <span className="box" aria-hidden="true">
                      <Check />
                    </span>
                    <span>Active role</span>
                  </label>
                </Field>
              )}
            </FormSection>
            {lockedRole && (
              <p className="small muted">Built-in administrator roles are protected.</p>
            )}

            <section className="card card-flush">
              <div className="card-head" style={{ padding: 20 }}>
                <div>
                  <h3>Menu permissions</h3>
                  <div className="sub">
                    Selecting a menu grants view access. Choose additional actions as needed.
                  </div>
                </div>
              </div>
              {groupedMenus.length === 0 ? (
                <EmptyState
                  title="No menus configured"
                  text="Menu permissions can be assigned after menu items are configured."
                />
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th scope="col">Menu</th>
                        <th scope="col">View</th>
                        {ACTIONS.map((action) => (
                          <th key={action.key} scope="col">
                            {action.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {groupedMenus
                        .flatMap((parent) => [parent, ...parent.children])
                        .map((menu) => {
                          const selected = Boolean(permissions[menu.id]);
                          return (
                            <tr key={menu.id}>
                              <td>
                                {menu.parentId ? (
                                  <span style={{ paddingLeft: 20 }}>{menu.name}</span>
                                ) : (
                                  <strong>{menu.name}</strong>
                                )}
                              </td>
                              <td>
                                <input
                                  type="checkbox"
                                  aria-label={`${menu.name} view`}
                                  checked={selected}
                                  disabled={lockedRole}
                                  onChange={() => toggleView(menu)}
                                />
                              </td>
                              {ACTIONS.map((action) => (
                                <td key={action.key}>
                                  <input
                                    type="checkbox"
                                    aria-label={`${menu.name} ${action.key}`}
                                    checked={Boolean(permissions[menu.id]?.[action.key])}
                                    disabled={!selected || lockedRole}
                                    onChange={() => toggleAction(menu, action.key)}
                                  />
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <FormBar
            cancelTo={LIST_PATH}
            submitLabel={editing ? 'Save role' : 'Create role'}
            changed={!editing || isDirty || permissionsChanged}
            submitting={mutation.isPending}
            disabled={menus.isPending || lockedRole}
          />
        </form>
      )}
    </>
  );
}
