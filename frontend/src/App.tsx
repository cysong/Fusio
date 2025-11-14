import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { PrivateRoute } from './components/PrivateRoute';
import LandingPage from './pages/LandingPage';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import UserProfile from './pages/settings/UserProfile';
import ComingSoonPlaceholder from './components/ComingSoonPlaceholder';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Route - Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Protected Routes - Main Layout */}
          <Route
            path="/app"
            element={
              <PrivateRoute>
                <MainLayout />
              </PrivateRoute>
            }
          >
            {/* Market */}
            <Route path="market">
              <Route index element={<Navigate to="/app/market/overview" replace />} />
              <Route path="overview" element={<Dashboard />} />
              <Route
                path="comparison"
                element={
                  <ComingSoonPlaceholder
                    title="Market Comparison"
                    description="Table view for comparing prices across exchanges will be available soon."
                    version="V0.4"
                  />
                }
              />
            </Route>

            {/* Trading */}
            <Route path="trading">
              <Route
                path="spot"
                element={
                  <ComingSoonPlaceholder
                    title="Spot Trading"
                    description="Execute trades across multiple exchanges with smart order routing."
                    version="V0.4"
                  />
                }
              />
              <Route
                path="orders"
                element={
                  <ComingSoonPlaceholder
                    title="Order Management"
                    description="View and manage your trading orders and execution history."
                    version="V0.4"
                  />
                }
              />
            </Route>

            {/* Portfolio */}
            <Route path="portfolio">
              <Route
                path="balance"
                element={
                  <ComingSoonPlaceholder
                    title="Portfolio Balance"
                    description="Track your assets and balances across all exchanges."
                    version="V0.4"
                  />
                }
              />
              <Route
                path="history"
                element={
                  <ComingSoonPlaceholder
                    title="Transaction History"
                    description="View your complete trading and transaction history."
                    version="V0.4"
                  />
                }
              />
            </Route>

            {/* Settings */}
            <Route path="settings">
              <Route path="profile" element={<UserProfile />} />
              <Route
                path="security"
                element={
                  <ComingSoonPlaceholder
                    title="Security Settings"
                    description="Manage your security preferences including 2FA and API keys."
                    version="V0.7"
                  />
                }
              />
            </Route>

            {/* Default Route - Redirect to Market Overview */}
            <Route index element={<Navigate to="/app/market/overview" replace />} />
          </Route>

          {/* Legacy Routes - Redirect to new structure */}
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<Navigate to="/" replace />} />
          <Route path="/dashboard" element={<Navigate to="/app/market/overview" replace />} />

          {/* 404 Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
