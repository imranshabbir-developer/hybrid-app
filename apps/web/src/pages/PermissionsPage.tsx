import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  CompanyOption,
  createManagedUser,
  deleteManagedUser,
  listManagedUsers,
  listUserCompanies,
  ManagedUser,
  setManagedUserActive,
  updateManagedUser,
} from '../api/users';

const emptyForm = {
  fullName: '',
  email: '',
  password: '',
  role: 'COMPANY' as 'ADMIN' | 'COMPANY',
  companyId: '',
  phone: '',
  jobTitle: '',
  isActive: true,
};

export default function PermissionsPage() {
  const { token, user } = useAuth();
  const [rows, setRows] = useState<ManagedUser[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [users, comps] = await Promise.all([
        listManagedUsers(token),
        listUserCompanies(token),
      ]);
      setRows(users);
      setCompanies(comps);
      if (!form.companyId && comps[0]) {
        setForm((f) => ({ ...f, companyId: comps[0].id }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role === 'ADMIN') load();
  }, [token, user?.role]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [r.fullName, r.email, r.role, r.company?.name, r.jobTitle]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [rows, q]);

  if (user && user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }
  function startEdit(row: ManagedUser) {
    setEditingId(row.id);
    setForm({
      fullName: row.fullName,
      email: row.email,
      password: '',
      role: row.role,
      companyId: row.companyId || companies[0]?.id || '',
      phone: row.phone || '',
      jobTitle: row.jobTitle || '',
      isActive: row.isActive,
    });
    setMsg(null);
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      companyId: companies[0]?.id || '',
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        role: form.role,
        companyId: form.role === 'ADMIN' ? null : form.companyId || null,
        phone: form.phone,
        jobTitle: form.jobTitle,
        isActive: form.isActive,
      };
      if (editingId) {
        await updateManagedUser(token, editingId, {
          ...payload,
          ...(form.password ? { password: form.password } : {}),
        });
        setMsg('Account updated.');
      } else {
        if (!form.password) {
          setError('Password is required for new accounts');
          setBusy(false);
          return;
        }
        await createManagedUser(token, {
          ...payload,
          password: form.password,
        });
        setMsg('Account created.');
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function onToggle(row: ManagedUser) {
    if (!token) return;
    if (row.id === user?.id) {
      setError('You cannot disable your own account');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await setManagedUserActive(token, row.id, !row.isActive);
      setMsg(row.isActive ? 'Account disabled.' : 'Account enabled.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(row: ManagedUser) {
    if (!token) return;
    if (row.id === user?.id) {
      setError('You cannot delete your own account');
      return;
    }
    if (!window.confirm(`Delete account “${row.fullName}” (${row.email})?`)) return;
    setBusy(true);
    setError(null);
    try {
      const result = await deleteManagedUser(token, row.id);
      setMsg(
        result.deleted
          ? 'Account permanently deleted.'
          : result.message || 'Account disabled (related records exist).',
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page page-wide">
      <div className="page-head">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Permissions</h1>
          <p className="muted">
            Create accounts, assign Admin or Company access levels, and disable or remove users.
            Changes sync to SQLite and PostgreSQL when both are available.
          </p>
        </div>
        <div className="page-actions">
          <input
            className="search-input"
            placeholder="Search users…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Link className="ghost-btn solid" to="/">
            Home
          </Link>
        </div>
      </div>

      {error ? <div className="alert">{error}</div> : null}
      {msg ? <div className="alert ok">{msg}</div> : null}

      <section className="perm-layout">
        <form className="perm-form-card" onSubmit={onSubmit}>
          <div className="perm-form-head">
            <h2>{editingId ? 'Edit account' : 'Create account'}</h2>
            {editingId ? (
              <button type="button" className="ghost-btn tiny" onClick={resetForm}>
                New instead
              </button>
            ) : null}
          </div>

          <label>
            Full name
            <input
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </label>
          <label>
            {editingId ? 'New password (optional)' : 'Password'}
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              minLength={editingId ? undefined : 6}
              required={!editingId}
              autoComplete="new-password"
            />
          </label>
          <label>
            Permission level
            <select
              value={form.role}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  role: e.target.value as 'ADMIN' | 'COMPANY',
                }))
              }
            >
              <option value="COMPANY">Company user</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </label>
          {form.role === 'COMPANY' ? (
            <label>
              Company
              <select
                value={form.companyId}
                onChange={(e) => setForm((f) => ({ ...f, companyId: e.target.value }))}
                required
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            Job title
            <input
              value={form.jobTitle}
              onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
            />
          </label>
          <label>
            Phone
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </label>
          <label className="perm-check">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            Account active
          </label>
          <button type="submit" className="primary-btn compact" disabled={busy}>
            {busy ? 'Saving…' : editingId ? 'Update account' : 'Create account'}
          </button>
        </form>

        <div className="excel-sheet-wrap perm-table-wrap">
          <table className="excel-sheet">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Company</th>
                <th>Status</th>
                <th>Last login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="sheet-empty">
                    Loading accounts…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="sheet-empty">
                    No accounts match your search.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className={row.isActive ? '' : 'row-disabled'}>
                    <td>
                      <div className="perm-name-cell">
                        <span className="profile-avatar sm" aria-hidden>
                          {row.fullName
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((p) => p[0]?.toUpperCase())
                            .join('')}
                        </span>
                        <div>
                          <strong>{row.fullName}</strong>
                          <div className="muted small">{row.jobTitle || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td>{row.email}</td>
                    <td>
                      <span className={`role-pill ${row.role.toLowerCase()}`}>
                        {row.role === 'ADMIN' ? 'Admin' : 'Company'}
                      </span>
                    </td>
                    <td>{row.company?.name || '—'}</td>
                    <td>
                      <span className={`status-dot ${row.isActive ? 'on' : 'off'}`}>
                        {row.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      {row.lastLoginAt
                        ? String(row.lastLoginAt).slice(0, 16).replace('T', ' ')
                        : '—'}
                    </td>
                    <td className="actions-cell">
                      <button
                        type="button"
                        className="ghost-btn tiny"
                        disabled={busy}
                        onClick={() => startEdit(row)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="ghost-btn tiny"
                        disabled={busy || row.id === user?.id}
                        onClick={() => onToggle(row)}
                      >
                        {row.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        className="ghost-btn tiny danger"
                        disabled={busy || row.id === user?.id}
                        onClick={() => onDelete(row)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
