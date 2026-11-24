import { Link } from 'react-router-dom';
import { Plus, ShieldCheck } from 'lucide-react';
import Topbar from '../components/layout/Topbar.jsx';
import { Badge, EmptyState } from '../components/ui/Display.jsx';
import { Loader } from '../components/ui/Loader.jsx';
import { QueryError } from '../components/ui/QueryState.jsx';
import { usePermissions } from '../features/auth/permissions.js';
import { useRoles } from '../features/role/hooks.js';
import { ACTION, MENU } from '../lib/permissions.js';

export default function RoleListPage() {
  const roles = useRoles();
  const { can } = usePermissions();
  const canCreate = can(MENU.ROLES, ACTION.CREATE);
  const canEdit = can(MENU.ROLES, ACTION.EDIT);

  return (
    <>
      <Topbar
        title="Roles"
        breadcrumb={['Administration']}
        actions={
          canCreate && (
            <Link to="/roles/new" className="btn btn-primary">
              <Plus /> New role
            </Link>
          )
        }
      />
      {roles.isPending && <Loader label="Loading roles" />}
      <QueryError error={roles.error} onRetry={() => roles.refetch()} />
      {roles.isSuccess && (
        <section className="card card-flush">
          {roles.data.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No roles yet"
              text="Create a role to define user access."
              action={
                canCreate && (
                  <Link to="/roles/new" className="btn btn-primary">
                    <Plus /> New role
                  </Link>
                )
              }
            />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Role</th>
                    <th scope="col">Code</th>
                    <th scope="col">Level</th>
                    <th scope="col">Status</th>
                    <th scope="col">Menu permissions</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {roles.data.map((role) => (
                    <tr key={role.id}>
                      <td>
                        <strong>{role.name}</strong>
                      </td>
                      <td>
                        <span className="code">{role.code}</span>
                      </td>
                      <td>{role.level}</td>
                      <td>
                        <Badge tone={role.isActive ? 'success' : 'neutral'}>
                          {role.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td>{role.permissions?.length ?? 0}</td>
                      <td className="text-right">
                        {canEdit && (
                          <Link to={`/roles/${role.id}/edit`} className="btn btn-secondary btn-sm">
                            Edit
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  );
}
