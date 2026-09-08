import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  deleteSupplierEntry,
  listSupplierEntries,
  SupplierEntry,
} from '../api/supplierEntries';

export default function SupplierEntriesPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<SupplierEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  async function load() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setRows(await listSupplierEntries(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [token]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [
        r.purchaseOrderNo,
        r.shipperName,
        r.productItemCode,
        r.productDescription,
        r.productCategory,
        r.division,
      ]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [rows, q]);

  async function onDelete(id: string, label: string) {
    if (!token) return;
    if (!window.confirm(`Delete supplier entry for ${label}?`)) return;
    try {
      await deleteSupplierEntry(token, id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">File-A · Step 2</p>
          <h1>Supplier Data Entry Form</h1>
          <p className="muted">
            Matching fields are pulled from Purchase Order (Step 1). Fill remaining fields manually.
          </p>
        </div>
        <div className="page-actions">
          <input
            className="search-input"
            placeholder="Search PO #, shipper, item…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Link className="primary-btn compact" to="/supplier-entries/new">
            + New Supplier Entry
          </Link>
        </div>
      </div>

      {error ? <div className="alert">{error}</div> : null}

      <div className="excel-sheet-wrap">
        <table className="excel-sheet">
          <thead>
            <tr>
              <th>Sr</th>
              <th>PO #</th>
              <th>Date</th>
              <th>Shipper</th>
              <th>Item Code</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit Value</th>
              <th>Total Value</th>
              <th>Category</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="sheet-empty">
                  Loading supplier entries…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="sheet-empty">
                  No supplier entries yet. Create one from a Purchase Order.
                </td>
              </tr>
            ) : (
              filtered.map((row, idx) => (
                <tr key={row.id}>
                  <td>{idx + 1}</td>
                  <td>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => navigate(`/supplier-entries/${row.id}`)}
                    >
                      {row.purchaseOrderNo}
                    </button>
                  </td>
                  <td>{String(row.entryDate).slice(0, 10)}</td>
                  <td>{row.shipperName || '—'}</td>
                  <td>{row.productItemCode || '—'}</td>
                  <td>{row.productDescription || '—'}</td>
                  <td className="num">{row.totalQuantity}</td>
                  <td className="num">{row.unitValue}</td>
                  <td className="num">{row.totalValue}</td>
                  <td>{row.productCategory || '—'}</td>
                  <td className="actions-cell">
                    <button
                      type="button"
                      className="ghost-btn tiny"
                      onClick={() => navigate(`/supplier-entries/${row.id}`)}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      className="ghost-btn tiny danger"
                      onClick={() => onDelete(row.id, row.purchaseOrderNo)}
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
    </main>
  );
}
