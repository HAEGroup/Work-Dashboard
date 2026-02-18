import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import { useThemeStore } from './store/theme';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import EmailPage from './pages/EmailPage';
import CalendarPage from './pages/CalendarPage';
import AccountingPage from './pages/AccountingPage';
import TasksPage from './pages/TasksPage';
import PropertiesPage from './pages/PropertiesPage';
import SettingsPage from './pages/SettingsPage';
import CrmPage from './pages/CrmPage';
import LoadingSpinner from './components/shared/LoadingSpinner';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, token } = useAuthStore();

  if (isLoading) return <LoadingSpinner size="lg" />;
  if (!token || !user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

export default function App() {
  const { loadUser, token } = useAuthStore();
  const initTheme = useThemeStore(s => s.init);

  useEffect(() => {
    initTheme();
    loadUser();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/email" element={<EmailPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/accounting" element={<AccountingPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/crm" element={<CrmPage />} />
          <Route path="/properties" element={<PropertiesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
