import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('CardioMap render error:', error, info?.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-2xl border border-red-500/40 bg-red-950/20 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h1 className="font-display font-bold text-white text-lg">
                Interface failed to render
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                CardioMap 3D hit an unexpected error. No clinical prediction is
                being displayed. Reload to retry, and check the browser console
                for the underlying stack trace.
              </p>
            </div>
          </div>

          {this.state.error?.message && (
            <pre className="text-[11px] font-mono text-red-300 bg-black/40 border border-red-900/50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
          )}

          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-sm font-semibold hover:bg-cyan-500/25 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reload CardioMap</span>
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;