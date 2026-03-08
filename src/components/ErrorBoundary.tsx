import React from 'react';

type Props = { children: React.ReactNode; fallback?: React.ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): State {
    return { hasError: true };
  }
  componentDidCatch(_error: unknown, _info: unknown) {
    // Hook for telemetry (optional)
  }
  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="container py-10">
            <h2 className="h2 mb-2">Something went wrong.</h2>
            <p className="text-sm text-gray-600">Please refresh and try again.</p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}