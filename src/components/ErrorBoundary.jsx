import { Component } from 'react';
import { TriangleAlert } from 'lucide-react';
import { EmptyState } from './ui/Display.jsx';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="loader is-page">
        <div className="card card-lg">
          <EmptyState
            icon={TriangleAlert}
            title="The page crashed"
            text="An unexpected error occurred. Reloading usually fixes it."
            action={
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.location.reload()}
              >
                Reload
              </button>
            }
          />
        </div>
      </div>
    );
  }
}
