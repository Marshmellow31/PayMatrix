import { Component } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Catches any unhandled React render errors and shows a recovery UI
 * instead of a completely blank screen.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 bg-background text-white">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <RefreshCw size={24} className="text-white/40" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black font-manrope tracking-tight mb-2">Something went wrong</h2>
            <p className="text-sm text-white/40 font-inter">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
          </div>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.history.back(); }}
            className="px-6 py-3 rounded-2xl bg-white text-black text-xs font-black uppercase tracking-widest transition-all hover:bg-white/90 active:scale-95"
          >
            Go Back
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
