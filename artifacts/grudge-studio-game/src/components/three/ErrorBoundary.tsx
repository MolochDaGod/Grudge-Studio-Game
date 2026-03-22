import React, { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SceneErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[SceneErrorBoundary] 3D scene crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white gap-4 p-8">
          <div className="text-4xl">💀</div>
          <h2 className="font-display text-xl uppercase tracking-widest text-red-400">Scene Error</h2>
          <p className="text-sm text-white/50 text-center max-w-md">
            The 3D scene encountered an error. This is usually caused by a missing or corrupted model file.
          </p>
          <p className="text-xs text-white/25 font-mono max-w-lg text-center break-all">
            {this.state.error?.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-2 bg-primary/20 border border-primary/50 rounded text-primary text-sm hover:bg-primary/30 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
