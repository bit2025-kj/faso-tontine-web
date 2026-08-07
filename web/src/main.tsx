import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './features/auth/auth-context';
import { ChatSocketProvider } from './features/chat/chat-socket';
import { NotificationsProvider } from './features/notifications/notifications-context';
import EventsBridge from './features/realtime/EventsBridge';
import PushBridge from './features/realtime/PushBridge';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <ChatSocketProvider>
              <NotificationsProvider>
                <EventsBridge />
                <PushBridge />
                <App />
              </NotificationsProvider>
            </ChatSocketProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
