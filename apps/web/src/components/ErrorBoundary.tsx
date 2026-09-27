import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '2rem',
            background: 'var(--bg-card)',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            margin: '1.5rem',
            color: 'var(--text-primary)',
          }}
        >
          <h3 style={{ color: '#ef4444', marginTop: 0 }}>
            {this.props.fallbackTitle ?? 'Component Error'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            An unexpected error occurred while rendering this view.
          </p>
          <pre
            style={{
              background: 'var(--bg-subtle)',
              padding: '1rem',
              borderRadius: '4px',
              fontSize: '0.8rem',
              color: '#f87171',
              overflow: 'auto',
            }}
          >
            {this.state.error?.message}
          </pre>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: '1rem' }}
          >
            Retry View
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
