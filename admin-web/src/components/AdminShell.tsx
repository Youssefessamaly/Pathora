import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

/**
 * The internal admin chrome: dark teal header with branding, navigation, the current admin's
 * email, and logout. Deliberately a single nav item — Company Requests is the entire MVP scope
 * (see PART 13/20 of the admin portal milestone); no analytics/users/settings placeholders.
 */
export function AdminShell() {
  const { admin, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-header-brand">
          <strong>PATHORA</strong>
          <span>Admin Portal</span>
        </div>

        <nav className="admin-nav">
          <NavLink
            to="/requests"
            className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}
          >
            Company Requests
          </NavLink>
        </nav>

        <div className="admin-header-account">
          {admin && <span className="admin-header-email">{admin.email}</span>}
          <button type="button" className="btn btn-secondary" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
