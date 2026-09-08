import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import AppShell from './components/AppShell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import PurchaseOrderFormPage from './pages/PurchaseOrderFormPage';
import SupplierEntriesPage from './pages/SupplierEntriesPage';
import SupplierEntryFormPage from './pages/SupplierEntryFormPage';
import SupplierMasterPage from './pages/SupplierMasterPage';
import ImportTrackingPage from './pages/ImportTrackingPage';
import ImportTrackingFormPage from './pages/ImportTrackingFormPage';
import ClosedFilesPage from './pages/ClosedFilesPage';
import HistoriesPage from './pages/HistoriesPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import PermissionsPage from './pages/PermissionsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, bootstrapping } = useAuth();
  if (bootstrapping) {
    return (
      <div className="boot-screen">
        <div className="boot-spinner" />
        <p>Loading workspace…</p>
      </div>
    );
  }
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
        <Route path="/purchase-orders/new" element={<PurchaseOrderFormPage />} />
        <Route path="/purchase-orders/:id" element={<PurchaseOrderFormPage />} />
        <Route path="/supplier-entries" element={<SupplierEntriesPage />} />
        <Route path="/supplier-entries/new" element={<SupplierEntryFormPage />} />
        <Route path="/supplier-entries/:id" element={<SupplierEntryFormPage />} />
        <Route path="/supplier-master" element={<SupplierMasterPage />} />
        <Route path="/import-tracking" element={<ImportTrackingPage />} />
        <Route path="/import-tracking/:id" element={<ImportTrackingFormPage />} />
        <Route path="/closed-files" element={<ClosedFilesPage />} />
        <Route path="/histories" element={<HistoriesPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/permissions" element={<PermissionsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
