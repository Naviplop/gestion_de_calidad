import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { authApiClientWithEvents } from './lib/auth/auth-security';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const accessToken = useAuth((state) => state.accessToken);

  React.useEffect(() => {
    if (accessToken) {
      authApiClientWithEvents.setAccessToken(accessToken);
    }
  }, [accessToken]);

  return <>{children}</>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <AuthInitializer>
          <App />
        </AuthInitializer>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);
