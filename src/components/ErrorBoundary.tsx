import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

/**
 * Catches render/commit errors in the subtree so a single component crash
 * degrades to a local message instead of unmounting the whole app (white screen).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface the crash in the console for debugging; the UI stays alive.
    console.error("ErrorBoundary caught an error:", error, info.componentStack);
  }

  componentDidMount(): void {
    // In dev, a transient error from a mid-edit HMR state should self-heal once
    // the next clean update arrives — otherwise the boundary latches and only a
    // full reload recovers it.
    if (import.meta.hot) {
      import.meta.hot.on("vite:afterUpdate", this.handleReset);
    }
  }

  componentWillUnmount(): void {
    if (import.meta.hot) {
      import.meta.hot.off?.("vite:afterUpdate", this.handleReset);
    }
  }

  handleReset = (): void => {
    if (this.state.error) this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="error-boundary" role="alert">
          <p className="error-boundary-title">Something went wrong rendering this view.</p>
          <p className="error-boundary-detail">{this.state.error.message}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="error-boundary-retry" type="button" onClick={this.handleReset}>
              Try again
            </button>
            <button
              className="error-boundary-retry"
              type="button"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
