import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          <div>
             <h3 className="text-lg font-bold text-red-800">Une erreur est survenue</h3>
             <p className="text-sm text-red-600 mt-1 max-w-md mx-auto">
               {this.state.error?.message || "Le composant d'édition a rencontré un problème inattendu."}
             </p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-700 rounded-lg hover:bg-red-50 transition-colors shadow-sm text-sm font-medium"
          >
            <RotateCcw size={16} /> Recharger l'application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
