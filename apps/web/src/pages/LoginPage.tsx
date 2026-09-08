import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
  const { token, login } = useAuth();
  const [email, setEmail] = useState('admin@erp.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (token) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-ambiance" aria-hidden="true">
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <div className="grid-fade" />
      </div>

      <aside className="login-brand">
        <div className="brand-mark">
          <span className="brand-glyph">N</span>
          <div>
            <p className="brand-kicker">Import Operations</p>
            <h1 className="brand-title">Nexus ERP</h1>
          </div>
        </div>

        <div className="brand-copy">
          <h2>
            One workspace for purchase orders, suppliers, and import tracking.
          </h2>
          <p>
            Secure role-based access for administrators and company teams —
            built for offline desktop use, ready for cloud when you are.
          </p>
        </div>

        <ul className="brand-points">
          <li>Purchase Order → Supplier Master → Import Status</li>
          <li>Company-scoped data boundaries</li>
          <li>Excel-familiar workflows, modern controls</li>
        </ul>
      </aside>

      <main className="login-panel">
        <form className="login-card" onSubmit={onSubmit} noValidate>
          <div className="login-card-head">
            <p className="eyebrow">Welcome back</p>
            <h3>Sign in to continue</h3>
            <p className="muted">
              Use your organization credentials to access the desktop workspace.
            </p>
          </div>

          {error ? (
            <div className="alert" role="alert">
              {error}
            </div>
          ) : null}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <div className="password-row">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                minLength={6}
              />
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="demo-hints">
            <p className="muted small">Demo accounts</p>
            <div className="chip-row">
              <button
                type="button"
                className="chip"
                onClick={() => {
                  setEmail('admin@erp.com');
                  setPassword('admin@123');
                }}
              >
                Admin
              </button>
              <button
                type="button"
                className="chip"
                onClick={() => {
                  setEmail('imran@erp.com');
                  setPassword('admin@123');
                }}
              >
                Company 1
              </button>
              <button
                type="button"
                className="chip"
                onClick={() => {
                  setEmail('imranshabbir@erp.com');
                  setPassword('admin@123');
                }}
              >
                Company 2
              </button>
            </div>
          </div>
        </form>

        <p className="login-foot">© {new Date().getFullYear()} Nexus ERP · Desktop Edition</p>
      </main>
    </div>
  );
}
