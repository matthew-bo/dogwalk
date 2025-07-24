import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // In production, you might want to log this to an error reporting service
    if (import.meta.env.PROD) {
      // Log to error service (e.g., Sentry)
    }
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleReset = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-gray-900 px-4">
          <div className="max-w-md w-full">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center shadow-2xl">
              <div className="mb-6">
                <AlertTriangle className="mx-auto text-red-500 mb-4" size={64} />
                <h1 className="text-2xl font-bold text-white mb-2">Oops! Something went wrong</h1>
                <p className="text-gray-400">
                  We're sorry, but something unexpected happened. This has been logged and we'll fix it soon.
                </p>
              </div>

              {import.meta.env.DEV && this.state.error && (
                <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-left">
                  <h3 className="text-red-400 font-bold text-sm mb-2">Development Error Details:</h3>
                  <code className="text-red-300 text-xs font-mono break-all">
                    {this.state.error.message}
                  </code>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={this.handleReload}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <RefreshCw size={16} />
                  <span>Reload Page</span>
                </button>
              </div>
              
              <p className="text-gray-500 text-xs mt-4">
                If this problem persists, please contact support.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 