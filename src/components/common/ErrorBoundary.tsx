import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
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
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 my-4 bg-rose-50 border-2 border-rose-300 rounded-2xl shadow-sm text-center space-y-3">
          <div className="w-12 h-12 bg-rose-100 text-rose-700 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-rose-950 uppercase tracking-wide">
              {this.props.fallbackTitle || 'Ocurrió un error al cargar esta sección'}
            </h3>
            <p className="text-xs text-rose-700 mt-1 max-w-md mx-auto">
              {this.state.error?.message || 'Se produjo un problema inesperado en la renderización.'}
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-colors shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reintentar carga de la sección</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
