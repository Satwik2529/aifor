import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import DashboardLayout from './components/DashboardLayout';
import FloatingChatbot from './components/FloatingChatbot';
import LandingPage from './pages/LandingPage';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import Expenses from './pages/Expenses';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import Analytics from './pages/Analytics';
import AIInsights from './pages/AIInsights';
import LoginNew from './pages/LoginNew';
import RegisterNew from './pages/RegisterNew';
import ResetPassword from './pages/ResetPassword';
import ProfileSettings from './pages/ProfileSettings';
import CustomerDashboard from './pages/CustomerDashboard';
import CustomerRequestsPage from './pages/CustomerRequestsPage';
import CustomerChatbotPage from './pages/CustomerChatbotPage';
import NearbyShops from './pages/NearbyShops';
import WholesalerDashboard from './pages/WholesalerDashboard';
import WholesalerDiscovery from './pages/WholesalerDiscovery';
import WholesalerOffers from './pages/WholesalerOffers';
import WholesalerAIInsights from './pages/WholesalerAIInsights';
import WholesalerInventory from './pages/WholesalerInventory';
import WholesalerOrders from './pages/WholesalerOrders';
import RetailerWholesalerOrders from './pages/RetailerWholesalerOrders';
import DiscountCampaigns from './pages/DiscountCampaigns';
import HotDeals from './pages/HotDeals';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Public Route Component (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    // Check userType to redirect to correct dashboard
    const userType = localStorage.getItem('userType');
    const redirectPath = userType === 'customer' ? '/customer-dashboard' :
      userType === 'wholesaler' ? '/wholesaler-dashboard' : '/dashboard';
    return <Navigate to={redirectPath} />;
  }

  return children;
};

/**
 * Main App Component
 * Handles routing and layout for the BizNova application
 * Ready for Phase 2-6 development
 */
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="App">
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10B981',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 4000,
                  iconTheme: {
                    primary: '#EF4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
            <Routes>
              {/* Landing Page */}
              <Route path="/" element={<LandingPage />} />

              {/* Auth Callback for Google OAuth */}
              <Route path="/auth/callback" element={<AuthCallback />} />

              {/* Public routes */}
              <Route path="/login" element={
                <PublicRoute>
                  <LoginNew />
                </PublicRoute>
              } />
              <Route path="/register" element={
                <PublicRoute>
                  <RegisterNew />
                </PublicRoute>
              } />
              <Route path="/reset-password/:token" element={<ResetPassword />} />

              {/* Customer Dashboard (separate from retailer) */}
              <Route path="/customer-dashboard" element={<CustomerDashboard />} />
              <Route path="/customer/chatbot" element={<CustomerChatbotPage />} />
              <Route path="/customer/profile-settings" element={<ProfileSettings />} />
              <Route path="/customer/nearby-shops" element={<NearbyShops />} />
              <Route path="/hot-deals" element={<HotDeals />} />

              {/* Wholesaler Dashboard */}
              <Route path="/wholesaler-dashboard" element={<WholesalerDashboard />} />
              <Route path="/wholesaler/profile-settings" element={<ProfileSettings />} />
              <Route path="/wholesaler/ai-insights" element={<WholesalerAIInsights />} />
              <Route path="/wholesaler/inventory" element={<WholesalerInventory />} />
              <Route path="/wholesaler/orders" element={<WholesalerOrders />} />

              {/* Protected retailer routes with layout */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <>
                    <DashboardLayout />
                    <FloatingChatbot />
                  </>
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="sales" element={<Sales />} />
                <Route path="expenses" element={<Expenses />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="customers" element={<Customers />} />
                <Route path="customer-requests" element={<CustomerRequestsPage />} />
                <Route path="wholesalers" element={<WholesalerDiscovery />} />
                <Route path="wholesaler-offers" element={<WholesalerOffers />} />
                <Route path="wholesaler-orders" element={<RetailerWholesalerOrders />} />
                <Route path="discount-campaigns" element={<DiscountCampaigns />} />
                <Route path="ai" element={<AIInsights />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="profile" element={<ProfileSettings />} />
                <Route path="profile-settings" element={<ProfileSettings />} />
              </Route>
            </Routes >
          </div >
        </Router >
      </AuthProvider >
    </ThemeProvider >
  );
}

export default App;
