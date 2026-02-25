import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'
import AppLayout from './components/layout/Sidebar'
import Login from './pages/Login'
import Overview from './pages/Overview'
import LedgerBot from './pages/LedgerBot'
import Expenses from './pages/Expenses'
import Income from './pages/Income'
import Budgets from './pages/Budgets'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Privacy from './pages/Privacy'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/privacy" element={<Privacy />} />

          {/* Auth guard */}
          <Route element={<ProtectedRoute />}>
            {/* App shell — sidebar + scrollable main */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<Overview />} />
              <Route path="/ledger-bot" element={<LedgerBot />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/income" element={<Income />} />
              <Route path="/budgets" element={<Budgets />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
