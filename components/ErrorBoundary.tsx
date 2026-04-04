'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { get } from 'idb-keyval';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleExportData = async () => {
    try {
      const data = await get('node-graph-state');
      if (data) {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'knotess-recovery-export.json';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        alert('No data found in storage.');
      }
    } catch (err) {
      alert('Failed to export data: ' + err);
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen w-screen bg-neutral-950 text-neutral-100 font-sans">
          <div className="max-w-lg text-center space-y-6 p-8">
            <div className="text-6xl">⚠️</div>
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-neutral-400">
              The app encountered an unexpected error. You can export your data to prevent loss, then reload.
            </p>
            {this.state.error && (
              <details className="text-left bg-neutral-900 rounded-lg p-4 text-xs text-neutral-500 max-h-40 overflow-auto">
                <summary className="cursor-pointer text-neutral-400 mb-2">Error Details</summary>
                <pre className="whitespace-pre-wrap">{this.state.error.message}</pre>
                <pre className="whitespace-pre-wrap mt-2">{this.state.error.stack}</pre>
              </details>
            )}
            <div className="flex gap-4 justify-center">
              <button
                onClick={this.handleExportData}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors shadow-lg"
              >
                Export Data
              </button>
              <button
                onClick={this.handleReload}
                className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium transition-colors shadow-lg border border-white/10"
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
