import { Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext.jsx'
import { ToastProvider } from './contexts/ToastContext.jsx'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Payables from './pages/Payables.jsx'
import Receivables from './pages/Receivables.jsx'
import Categories from './pages/Categories.jsx'
import Reports from './pages/Reports.jsx'

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="contas-a-pagar" element={<Payables />} />
            <Route path="contas-a-receber" element={<Receivables />} />
            <Route path="categorias" element={<Categories />} />
            <Route path="relatorios" element={<Reports />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </ToastProvider>
    </ThemeProvider>
  )
}
