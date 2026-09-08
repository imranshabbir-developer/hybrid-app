import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  createLookup,
  deleteLookup,
  listLookups,
  listLookupTypes,
  LookupRow,
  LookupType,
  seedLookupDefaults,
  updateLookup,
} from '../api/lookups';
import {
  copySqliteBackup,
  downloadSqliteBackup,
  fetchSystemInfo,
  SystemInfo,
} from '../api/system';

export default function SettingsPage() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [types, setTypes] = useState<LookupType[]>([]);
  const [type, setType] = useState('PRODUCT_CATEGORY');
  const [rows, setRows] = useState<LookupRow[]>([]);
  const [label, setLabel] = useState('');
  const [code, setCode] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const typeLabel = useMemo(
    () => types.find((t) => t.type === type)?.label || type,
    [types, type],
  );

  async function loadTypes() {
    if (!token) return;
    const list = await listLookupTypes(token);
    setTypes(list);
    if (list.length && !list.some((t) => t.type === type)) {
      setType(list[0].type);
    }
  }

  async function loadRows(nextType = type) {
    if (!token) return;
    setRows(await listLookups(token, nextType));
  }

  async function loadInfo() {
    if (!token) return;
    setInfo(await fetchSystemInfo(token));
  }

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        await loadTypes();
        await loadRows();
        await loadInfo();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadRows(type).catch((err) =>
      setError(err instanceof Error ? err.message : 'Failed to load lookups'),
    );
  }, [token, type]);

  async function onSeed() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const result = await seedLookupDefaults(token);
      setMsg(`Seeded ${result.created} new lookup value(s).`);
      await loadRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Seed failed');
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !label.trim()) return;
    setBusy(true);
    setError(null);
    try {
      if (editingId) {
        await updateLookup(token, editingId, {
          type,
          label: label.trim(),
          code: code.trim() || label.trim(),
        });
        setMsg('Lookup updated.');
      } else {
        await createLookup(token, {
          type,
          label: label.trim(),
          code: code.trim() || label.trim(),
        });
        setMsg('Lookup added.');
      }
      setLabel('');
      setCode('');
      setEditingId(null);
      await loadRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(row: LookupRow) {
    if (!token) return;
    if (!window.confirm(`Deactivate “${row.label}”?`)) return;
    setBusy(true);
    try {
      await deleteLookup(token, row.id);
      setMsg('Lookup deactivated.');
      await loadRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  async function onDownloadBackup() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await downloadSqliteBackup(token);
      setMsg('SQLite backup downloaded.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backup download failed');
    } finally {
      setBusy(false);
    }
  }

  async function onCopyBackup() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const result = await copySqliteBackup(token);
      setMsg(`Backup copied to ${result.path}`);
      await loadInfo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backup copy failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Lookups · Settings</p>
          <h1>Lookups &amp; System</h1>
          <p className="muted">
            Manage dropdown values used across Supplier Entry, Import Tracking, and Closed Files.
            Administrators can also back up the local SQLite database.
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="ghost-btn solid" disabled={busy} onClick={onSeed}>
            Seed defaults
          </button>
        </div>
      </div>

      {error ? <div className="alert">{error}</div> : null}
      {msg ? <div className="alert ok">{msg}</div> : null}

      <section className="settings-panel">
        <div className="settings-toolbar">
          <label>
            Lookup type
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {types.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <span className="muted small">Editing: {typeLabel}</span>
        </div>

        <form className="settings-form" onSubmit={onSubmit}>
          <input
            placeholder="Label (shown in dropdowns)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
          <input
            placeholder="Code (optional)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button type="submit" className="primary-btn compact" disabled={busy}>
            {editingId ? 'Update' : 'Add'}
          </button>
          {editingId ? (
            <button
              type="button"
              className="ghost-btn solid"
              onClick={() => {
                setEditingId(null);
                setLabel('');
                setCode('');
              }}
            >
              Cancel
            </button>
          ) : null}
        </form>

        <div className="excel-sheet-wrap">
          <table className="excel-sheet">
            <thead>
              <tr>
                <th>Label</th>
                <th>Code</th>
                <th>Order</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="sheet-empty">
                    No values yet. Click <strong>Seed defaults</strong> or add one above.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.label}</td>
                    <td>{row.code || '—'}</td>
                    <td className="num">{row.sortOrder}</td>
                    <td className="actions-cell">
                      <button
                        type="button"
                        className="ghost-btn tiny"
                        onClick={() => {
                          setEditingId(row.id);
                          setLabel(row.label);
                          setCode(row.code);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="ghost-btn tiny danger"
                        onClick={() => onDelete(row)}
                      >
                        Deactivate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="settings-panel">
        <h2>Database / Backup</h2>
        {info ? (
          <ul className="settings-meta">
            <li>
              Engine: <strong>{info.dbEngine}</strong>
            </li>
            <li>
              SQLite path: <code>{info.sqlitePath}</code>
            </li>
            <li>
              File:{' '}
              {info.sqliteExists
                ? `${(info.sqliteBytes / 1024).toFixed(1)} KB`
                : 'not found'}
            </li>
          </ul>
        ) : (
          <p className="muted">Loading system info…</p>
        )}
        {isAdmin ? (
          <div className="page-actions" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="primary-btn compact"
              disabled={busy}
              onClick={onDownloadBackup}
            >
              Download SQLite backup
            </button>
            <button
              type="button"
              className="ghost-btn solid"
              disabled={busy}
              onClick={onCopyBackup}
            >
              Copy backup beside DB
            </button>
          </div>
        ) : (
          <p className="muted small">Only administrators can download or copy backups.</p>
        )}
      </section>
    </main>
  );
}
