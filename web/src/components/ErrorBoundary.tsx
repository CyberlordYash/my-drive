import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Unhandled UI error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-3 bg-bg px-4 text-center">
          <AlertTriangle className="h-12 w-12 text-danger" />
          <p className="text-lg text-text">Something went wrong</p>
          <p className="max-w-sm text-sm text-text-muted">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="focus-ring rounded-full bg-accent px-4 py-2 text-sm font-medium text-[#1b1b1b]"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
