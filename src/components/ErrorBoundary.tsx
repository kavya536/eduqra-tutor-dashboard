import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary: ${this.props.name || 'Unknown'}]`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 animate-in fade-in zoom-in duration-500">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-rose-100/50">
              <AlertTriangle size={40} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-on-surface tracking-tight">
                Oops! Something went wrong
              </h2>
              <p className="text-on-surface-variant font-medium text-sm leading-relaxed">
                The {this.props.name || 'section'} encountered an unexpected error. Don't worry, the rest of the application is still working fine.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <div className="p-4 bg-rose-50 rounded-2xl text-left border border-rose-100 overflow-hidden">
                <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-2">Error Detail</p>
                <p className="text-xs font-mono text-rose-700 break-words leading-tight">
                  {this.state.error?.message}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 items-center justify-center pt-4">
              <button
                onClick={this.handleReset}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
              >
                <RefreshCw size={16} />
                Reload Section
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-on-surface border border-surface-variant px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
              >
                <Home size={16} />
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
