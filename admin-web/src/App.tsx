import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminShell } from './components/AdminShell'
import { AuthProvider } from './auth/AuthContext'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { CompanyRequestDetailPage } from './pages/CompanyRequestDetailPage'
import { CompanyRequestsPage } from './pages/CompanyRequestsPage'
import { LoginPage } from './pages/LoginPage'

/**
 * Route map:
 *   /login                    public
 *   /requests                 protected — the company-request review queue
 *   /requests/:companyId      protected — one company's detail
 * Anything else redirects to /requests, which itself redirects an unauthenticated visitor to
 * /login (see ProtectedRoute). There is no admin registration route — see PART 7/20.
 */
function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AdminShell />
            </ProtectedRoute>
          }
        >
          <Route path="/requests" element={<CompanyRequestsPage />} />
          <Route path="/requests/:companyId" element={<CompanyRequestDetailPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/requests" replace />} />
        <Route path="*" element={<Navigate to="/requests" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
