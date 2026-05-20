import { Component, type ErrorInfo, type ReactNode } from "react";

import { reportClientError } from "../api";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Catches render-time errors anywhere below it. Without this, a single thrown
 * error unmounts the whole React tree and leaves a blank white page with
 * nothing in any log. Here we show a recoverable fallback and ship the error
 * (with stack) to the backend so it lands in `docker logs`.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportClientError({
      kind: "boundary",
      message: error.message || String(error),
      stack: `${error.stack ?? ""}\n--- component stack ---${info.componentStack ?? ""}`,
    });
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white shadow-sm p-8 text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-lg font-semibold text-slate-900">Something went wrong</h1>
          <p className="text-sm text-slate-600">
            The page hit an unexpected error. Your résumé data is not stored, so reloading
            is safe - please start again.
          </p>
          <p className="text-xs text-slate-400 break-words">{this.state.message}</p>
          <button
            onClick={() => {
              window.location.href = "/";
            }}
            className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
