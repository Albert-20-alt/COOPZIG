import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAF7]">
          <div className="bg-white border border-rose-100 rounded-3xl p-12 max-w-md text-center shadow-sm">
            <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-6 text-xl font-black">!</div>
            <h2 className="font-black text-primary text-xl tracking-tight mb-2">Une erreur est survenue</h2>
            <p className="text-sm text-primary/40 mb-6 italic">{this.state.error?.message || "Erreur inattendue"}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-6 py-2 bg-[#0A1A0F] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-primary/80 transition-all"
            >
              Réessayer
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
