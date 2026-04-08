import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/Auth/LoginPage'
import POSPage from './pages/POS/POSPage'
import ProductsPage from './pages/Products/ProductsPage'
import ExpensesPage from './pages/Expenses/ExpensesPage'
import DashboardPage from './pages/Dashboard/DashboardPage'
import SalesHistoryPage from './pages/SalesHistory/SalesHistoryPage'
import StockPage from './pages/Stock/StockPage'
import SettingsPage from './pages/Settings/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/pos" replace />} />
              <Route path="/pos"       element={<POSPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/products"  element={<ProductsPage />} />
              <Route path="/expenses"  element={<ExpensesPage />} />
              <Route path="/history"   element={<SalesHistoryPage />} />
              <Route path="/stock"     element={<StockPage />} />
              <Route path="/settings"  element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/pos" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
