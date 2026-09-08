import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { fetchProfile, updateProfile } from '../api/users';

export default function ProfilePage() {
  const { token, refreshUser, user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const profile = await fetchProfile(token);
        setFullName(profile.fullName);
        setEmail(profile.email);
        setPhone(profile.phone || '');
        setJobTitle(profile.jobTitle || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (newPassword && newPassword !== confirmPassword) {
      setError('New password and confirmation do not match');
      return;
    }
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      await updateProfile(token, {
        fullName,
        email,
        phone,
        jobTitle,
        ...(newPassword
          ? { currentPassword, newPassword }
          : {}),
      });
      await refreshUser();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMsg('Profile updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  const initials = (fullName || user?.fullName || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <main className="page page-narrow">
      <div className="page-head">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Your profile</h1>
          <p className="muted">
            Update your name, contact details, and password. Changes apply to your signed-in
            session immediately.
          </p>
        </div>
        <div className="page-actions">
          <Link className="ghost-btn solid" to="/">
            Back to home
          </Link>
        </div>
      </div>

      {error ? <div className="alert">{error}</div> : null}
      {msg ? <div className="alert ok">{msg}</div> : null}

      {loading ? (
        <div className="profile-card skeleton-card">Loading profile…</div>
      ) : (
        <form className="profile-card" onSubmit={onSubmit}>
          <div className="profile-hero">
            <div className="profile-avatar lg" aria-hidden>
              {initials || 'U'}
            </div>
            <div>
              <strong>{fullName || 'User'}</strong>
              <p className="muted small">
                {user?.role === 'ADMIN'
                  ? 'Administrator'
                  : user?.company?.name || 'Company user'}
              </p>
            </div>
          </div>

          <div className="profile-grid">
            <label>
              Full name
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </label>
            <label>
              Job title
              <input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Import Manager"
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Phone
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+92 …"
              />
            </label>
          </div>

          <div className="profile-section-title">Change password</div>
          <p className="muted small" style={{ marginTop: 0 }}>
            Leave blank to keep your current password.
          </p>
          <div className="profile-grid">
            <label>
              Current password
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>
            <label>
              New password
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
              />
            </label>
            <label>
              Confirm new password
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </label>
          </div>

          <div className="page-actions" style={{ marginTop: 18 }}>
            <button type="submit" className="primary-btn compact" disabled={saving}>
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
