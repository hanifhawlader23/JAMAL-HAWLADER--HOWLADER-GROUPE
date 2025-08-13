

import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.tsx';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Entries from './pages/Entries';
import ProductCatalog from './pages/ProductCatalog';
import Clients from './pages/Clients';
import UserManagement from './pages/UserManagement';
import CompanyDetailsPage from './pages/CompanyDetails';
import InvoiceWorkbench from './pages/InvoiceWorkbench';
import InvoiceHistory from './pages/InvoiceHistory';
import NotFound from './pages/NotFound';
import { Role } from './types';
import ForgotPassword from './pages/ForgotPassword';
import SignUp from './pages/SignUp';
import AiAssistant from './components/AiAssistant';
import Setup from './pages/Setup';

const AdminRouteWrapper = ({ children }: { children: JSX.Element }) => {
    const { hasRole } = useAuth();
    return hasRole([Role.ADMIN]) ? children : <Navigate to="/" replace />;
};

const App = () => {
  const { isAuthenticated, hasRole, authLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (authLoading) {
    // AuthProvider now shows its own loading screen, so we can render null here or a minimal loader.
    return null;
  }

  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-[var(--page-bg)]">
        {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-20 lg:hidden"></div>}
        <Sidebar isSidebarOpen={isSidebarOpen} closeSidebar={() => setIsSidebarOpen(false)} />
        <div className="flex-1 flex flex-col">
          <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
          <main className="flex-1 p-6 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/entries/:statusFilter" element={<Entries />} />
              <Route path="/entries" element={<Entries />} />
              <Route path="/products" element={<AdminRouteWrapper><ProductCatalog /></AdminRouteWrapper>} />
              <Route path="/clients" element={<AdminRouteWrapper><Clients /></AdminRouteWrapper>} />
              <Route path="/users" element={<AdminRouteWrapper><UserManagement /></AdminRouteWrapper>} />
              <Route path="/company" element={<AdminRouteWrapper><CompanyDetailsPage /></AdminRouteWrapper>} />
              <Route path="/invoice-workbench" element={<AdminRouteWrapper><InvoiceWorkbench /></AdminRouteWrapper>} />
              <Route path="/invoice-history" element={<AdminRouteWrapper><InvoiceHistory /></AdminRouteWrapper>} />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <AiAssistant />
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;