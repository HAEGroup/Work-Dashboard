import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './store/AuthContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ContactsPage from './pages/ContactsPage';
import ContactDetailPage from './pages/ContactDetailPage';
import EmailPage from './pages/EmailPage';
import CalendarPage from './pages/CalendarPage';
import TasksPage from './pages/TasksPage';
import ChatPage from './pages/ChatPage';
import MarketingPage from './pages/MarketingPage';
import RentvinePage from './pages/RentvinePage';
import SettingsPage from './pages/SettingsPage';
import UsersPage from './pages/UsersPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-redrock-500"></div>
      </div>
    );
  }
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-redrock-500"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/contacts" element={<ContactsPage />} />
                <Route path="/contacts/:id" element={<ContactDetailPage />} />
                <Route path="/email" element={<EmailPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/marketing" element={<MarketingPage />} />
                <Route path="/rentvine" element={<RentvinePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/users" element={<UsersPage />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
