import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/purchase-orders', label: 'Purchase Orders' },
  { to: '/supplier-entries', label: 'Supplier Entry' },
  { to: '/supplier-master', label: 'Supplier Master' },
  { to: '/import-tracking', label: 'Import Tracking' },
  { to: '/closed-files', label: 'Closed Files' },
  { to: '/histories', label: 'Histories' },
  { to: '/reports', label: 'Reports' },
  { to: '/settings', label: 'Settings' },
] as const;

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const roleLabel =
    user?.role === 'ADMIN'
      ? 'Administrator'
      : user?.company?.name || 'Company User';

  const initials = (user?.fullName || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!profileRef.current?.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setProfileOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div className={`app-shell${menuOpen ? ' nav-open' : ''}`}>
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-brand">
            <span className="brand-glyph sm">N</span>
            <div>
              <strong>Nexus ERP</strong>
              <span className="muted small">Purchase · Suppliers · Import</span>
            </div>
          </div>
          <button
            type="button"
            className="nav-toggle"
            aria-expanded={menuOpen}
            aria-controls="main-nav"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
            <span className="sr-only">Menu</span>
          </button>
          <nav id="main-nav" className="top-nav" aria-label="Main">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={'end' in link ? link.end : false}
                className={({ isActive }) => (isActive ? 'active' : '')}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="topbar-user" ref={profileRef}>
          <button
            type="button"
            className={`profile-trigger${profileOpen ? ' open' : ''}`}
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen((v) => !v)}
            title={user?.fullName || 'Account'}
          >
            <span className="profile-avatar" aria-hidden>
              {initials || 'U'}
            </span>
            <span className="profile-trigger-meta">
              <strong>{user?.fullName}</strong>
              <span className="muted small">{roleLabel}</span>
            </span>
            <span className="profile-caret" aria-hidden />
          </button>

          {profileOpen ? (
            <div className="profile-menu" role="menu">
              <div className="profile-menu-head">
                <span className="profile-avatar md" aria-hidden>
                  {initials || 'U'}
                </span>
                <div>
                  <strong>{user?.fullName}</strong>
                  <span className="muted small">{user?.email}</span>
                </div>
              </div>
              <div className="profile-menu-sep" />
              <Link
                role="menuitem"
                to="/profile"
                className="profile-menu-item"
                onClick={() => setProfileOpen(false)}
              >
                <span className="pmi-icon profile-i" aria-hidden />
                Profile
              </Link>
              {user?.role === 'ADMIN' ? (
                <Link
                  role="menuitem"
                  to="/permissions"
                  className="profile-menu-item"
                  onClick={() => setProfileOpen(false)}
                >
                  <span className="pmi-icon perms-i" aria-hidden />
                  Permissions
                </Link>
              ) : null}
              <button
                type="button"
                role="menuitem"
                className="profile-menu-item danger"
                onClick={() => {
                  setProfileOpen(false);
                  logout();
                  navigate('/login', { replace: true });
                }}
              >
                <span className="pmi-icon signout-i" aria-hidden />
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </header>
      {menuOpen ? (
        <button
          type="button"
          className="nav-backdrop"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
      <div className="app-body">
        <Outlet />
      </div>
    </div>
  );
}
