import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Erro crítico no frontend:', error, info);
  }

  render() {
    if (this.state.error) {
      return <main className="fatalError" role="alert">
        <h1>Não foi possível abrir a aplicação</h1>
        <p>{this.state.error?.message || 'Erro inesperado no React.'}</p>
        <button type="button" onClick={() => window.location.reload()}>Recarregar</button>
      </main>;
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Elemento #root não encontrado no HTML.');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
