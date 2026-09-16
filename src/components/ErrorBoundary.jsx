import React from 'react';
import { AlertTriangle, RotateCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px 16px', textAlign: 'center' }}>
          <div className="ios-card" style={{ padding: '24px 16px', margin: '20px auto', maxWidth: '380px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(255, 69, 58, 0.15)',
                color: '#ff453a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <AlertTriangle size={28} />
            </div>

            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f5f5f7', marginBottom: '8px' }}>
              Ocurrió un error inesperado
            </h2>
            <p style={{ fontSize: '13px', color: '#8e8e93', lineHeight: '1.4', marginBottom: '20px' }}>
              La sección no pudo cargarse correctamente. Podés reintentar o volver al inicio.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={this.handleReset}
                style={{
                  width: '100%',
                  background: '#0a84ff',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >
                <RotateCw size={16} />
                <span>Reintentar</span>
              </button>

              {this.props.onNavigateHome && (
                <button
                  onClick={this.props.onNavigateHome}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#f5f5f7',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <Home size={16} />
                  <span>Ir a Cerca</span>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
