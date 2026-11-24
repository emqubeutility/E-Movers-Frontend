import { Link, Outlet } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import Topbar from '../components/layout/Topbar.jsx';
import { EmptyState } from '../components/ui/Display.jsx';
import { FullPageLoader } from '../components/ui/Loader.jsx';
import { usePermissions } from '../features/auth/permissions.js';
import { ACTION } from '../lib/permissions.js';

/**
 * Renders child routes only when the API grants `action` on `menu` to the signed-in role.
 * The server enforces the same rule, so this guard only decides what the user sees.
 */
export default function PermissionRoute({ menu, action = ACTION.VIEW }) {
  const { can, isLoading } = usePermissions();

  if (isLoading) return <FullPageLoader label="Checking your access" />;
  if (can(menu, action)) return <Outlet />;

  return (
    <>
      <Topbar title="No access" />
      <div className="card card-lg">
        <EmptyState
          icon={ShieldX}
          title="You don't have access to this page"
          text="Ask an administrator if you need it."
          action={
            <Link to="/overview" className="btn btn-primary">
              Go to overview
            </Link>
          }
        />
      </div>
    </>
  );
}
