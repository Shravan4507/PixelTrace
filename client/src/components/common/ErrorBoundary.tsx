import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside PixelTrace workstation:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#000000',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            maxWidth: '600px',
            width: '100%',
            backgroundColor: '#0a0a0a',
            border: '1px solid #ef4444',
            borderRadius: '4px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', color: '#ef4444' }}>
              <AlertTriangle size={24} />
              <h2 style={{ margin: 0, fontSize: '16px', letterSpacing: '0.05em' }}>
                WORKSTATION RUNTIME EXCEPTION CAUGHT
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: '#888888', marginBottom: '16px' }}>
              An unexpected client error occurred during forensic rendering. The application state was safely caught by the PixelTrace Error Boundary to prevent data loss.
            </p>
            {this.state.error && (
              <pre style={{
                backgroundColor: '#161616',
                border: '1px solid #222222',
                padding: '12px',
                fontSize: '11px',
                color: '#ffffff',
                borderRadius: '4px',
                overflowX: 'auto',
                marginBottom: '16px'
              }}>
                {this.state.error.toString()}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: '#ffffff',
                color: '#000000',
                fontWeight: 700,
                fontSize: '12px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={14} /> RELOAD WORKSTATION
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
