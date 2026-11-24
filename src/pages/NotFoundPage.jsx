import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import Topbar from '../components/layout/Topbar.jsx';
import { EmptyState } from '../components/ui/Display.jsx';

export default function NotFoundPage() {
  return (
    <>
      <Topbar title="Page not found" />
      <div className="card card-lg">
        <EmptyState
          icon={SearchX}
          title="Page not found"
          text="The page you are looking for does not exist or has been moved."
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
