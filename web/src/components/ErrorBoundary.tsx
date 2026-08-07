import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Filet de sécurité global : sans lui, une réponse d'API légèrement
 * différente de l'attendu (champ manquant, assertion non-null qui échoue…)
 * fait planter tout l'écran React en blanc, sans message ni recours pour
 * l'utilisateur (voir audit du 2026-08-05). Ici, on affiche à la place un
 * écran de récupération avec un bouton pour recharger.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Trace conservée en console pour le diagnostic (et remontée Sentry si
    // configurée plus tard).
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleReload = () => {
    window.location.assign('/');
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: '40px' }}>😕</div>
        <h1 style={{ margin: 0, fontSize: '20px' }}>Une erreur est survenue</h1>
        <p style={{ margin: 0, maxWidth: '32ch', color: '#666' }}>
          L'affichage a rencontré un problème inattendu. Rechargez la page pour
          continuer.
        </p>
        <button
          type="button"
          onClick={this.handleReload}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: '#2f7a9c',
            color: '#fff',
            fontSize: '15px',
            cursor: 'pointer',
          }}
        >
          Recharger
        </button>
      </div>
    );
  }
}
