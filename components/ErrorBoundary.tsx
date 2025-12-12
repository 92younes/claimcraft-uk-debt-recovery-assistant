/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree and displays
 * a fallback UI instead of crashing the entire application.
 *
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Update state with error details
    // eslint-disable-next-line react/no-did-catch-set-state
    (this as Component<Props, State>).setState({
      error,
      errorInfo
    });

    // Could also log to an error reporting service here
    // e.g., Sentry, LogRocket, etc.
  }

  handleReset = (): void => {
    (this as Component<Props, State>).setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    // Call custom reset handler if provided
    const props = (this as Component<Props, State>).props;
    if (props.onReset) {
      props.onReset();
    }
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { fallback, children } = (this as Component<Props, State>).props;

    if (hasError) {
      // Custom fallback provided
      if (fallback) {
        return fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Something Went Wrong</h1>
                <p className="text-slate-600 text-sm">The application encountered an unexpected error</p>
              </div>
            </div>

            {/* Error Message */}
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-red-900 mb-2">Error Details:</p>
              <p className="text-sm text-red-700 font-mono">
                {error?.toString() || 'Unknown error'}
              </p>
            </div>

            {/* Error Stack (Development Only) */}
            {import.meta.env.DEV && errorInfo && (
              <details className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
                <summary className="text-sm font-medium text-slate-700 cursor-pointer">
                  Stack Trace (Development Only)
                </summary>
                <pre className="text-xs text-slate-600 mt-3 overflow-auto max-h-48">
                  {errorInfo.componentStack}
                </pre>
              </details>
            )}

            {/* Help Text */}
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-teal-900 mb-2">
                <span className="font-bold">What to try:</span>
              </p>
              <ul className="text-sm text-teal-800 space-y-1 ml-4 list-disc">
                <li>Click "Try Again" to retry the current page</li>
                <li>Return to the home page and start fresh</li>
                <li>If the problem persists, try clearing your browser cache</li>
                <li>Contact support if you continue to experience issues</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-colors duration-200 shadow-sm"
              >
                <RefreshCw className="w-5 h-5" />
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border-2 border-slate-300 rounded-xl font-medium transition-colors duration-200"
              >
                <Home className="w-5 h-5" />
                Go Home
              </button>
            </div>

            {/* Footer Note */}
            <p className="text-xs text-slate-500 text-center mt-6">
              Your data is safe. This error only affected the display of the page.
            </p>
          </div>
        </div>
      );
    }

    return children;
  }
}
