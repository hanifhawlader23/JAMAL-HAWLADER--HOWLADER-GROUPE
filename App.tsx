

import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
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

const App = () => {
  const { isAuthenticated, hasRole, authLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (authLoading) {
    // AuthProvider now shows its own loading screen, so we can render null here or a minimal loader.
    return null;
  }

  const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    return hasRole([Role.ADMIN]) ? <>{children}</> : <Navigate to="/" />;
  };

  if (!isAuthenticated) {
    return (
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </HashRouter>
    );
  }

  return (
    <HashRouter>
      <div className="flex min-h-screen bg-[var(--page-bg)]">
        {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-20 lg:hidden"></div>}
        <Sidebar isSidebarOpen={isSidebarOpen} closeSidebar={() => setIsSidebarOpen(false)} />
        <div className="flex-1 flex flex-col">
          <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
          <main className="flex-1 p-6 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/entries" >
                  <Route index element={<Entries />} />
                  <Route path=":statusFilter" element={<Entries />} />
              </Route>
              <Route path="/products" element={<AdminRoute><ProductCatalog /></AdminRoute>} />
              <Route path="/clients" element={<AdminRoute><Clients /></AdminRoute>} />
              <Route path="/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
              <Route path="/company" element={<AdminRoute><CompanyDetailsPage /></AdminRoute>} />
              <Route path="/invoice-workbench" element={<AdminRoute><InvoiceWorkbench /></AdminRoute>} />
              <Route path="/invoice-history" element={<AdminRoute><InvoiceHistory /></AdminRoute>} />
              <Route path="/login" element={<Navigate to="/" />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <AiAssistant />
        </div>
      </div>
    </HashRouter>
  );
};

export default App;
