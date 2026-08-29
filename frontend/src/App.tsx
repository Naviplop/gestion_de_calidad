import { AppRoutes } from './AppRoutes';
import { ToastProvider } from './components/Toast';

export function App() {
  return (
    <ToastProvider>
      <AppRoutes />
    </ToastProvider>
  );
}
