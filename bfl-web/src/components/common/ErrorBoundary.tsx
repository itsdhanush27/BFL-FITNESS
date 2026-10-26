import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught an unhandled error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div 
          id="error-boundary-fallback"
          className="min-h-[480px] w-full flex items-center justify-center p-6 bg-neutral-100 text-neutral-900"
        >
          <div 
            id="error-boundary-card"
            className="w-full max-w-lg rounded-3xl border border-red-200 bg-white p-6 sm:p-8 shadow-xl text-center space-y-5"
          >
            <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200 inline-flex items-center gap-1.5 mb-2">
                <ShieldAlert className="w-3.5 h-3.5" />
                Runtime Component Error Caught
              </span>
              <h2 className="text-2xl font-black uppercase text-neutral-900 font-display tracking-tight">
                {this.props.fallbackTitle || 'Portal Encountered an Issue'}
              </h2>
              <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
                An unexpected exception occurred while rendering this view. Our system isolated the fault to keep the rest of your session active.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-left overflow-x-auto">
                <p className="text-[11px] font-mono font-bold text-red-600 mb-1">
                  {this.state.error.name}: {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <p className="text-[10px] font-mono text-neutral-500 line-clamp-3">
                    {this.state.error.stack.split('\n').slice(0, 3).join('\n')}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                id="btn-error-reset"
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-red-200 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recover View</span>
              </button>

              <button
                id="btn-error-reload"
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer border border-neutral-300 transition-all"
              >
                <Home className="w-4 h-4" />
                <span>Full Page Refresh</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
