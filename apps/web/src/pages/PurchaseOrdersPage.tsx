import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  deletePurchaseOrder,
  listPurchaseOrders,
  PurchaseOrder,
} from '../api/purchaseOrders';

export default function PurchaseOrdersPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  async function load() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setRows(await listPurchaseOrders(token));
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
      [r.poNumber, r.shipperName, r.originOfGoods, r.currency, r.status]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [rows, q]);

  async function onDelete(id: string, poNumber: string) {
    if (!token) return;
    if (!window.confirm(`Delete purchase order ${poNumber}?`)) return;
    try {
      await deletePurchaseOrder(token, id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">File-A · Step 1</p>
          <h1>Purchase Order Format</h1>
          <p className="muted">
            Excel-style entry screen. Create a PO first; later steps will pull matching fields.
          </p>
        </div>
        <div className="page-actions">
          <input
            className="search-input"
            placeholder="Search PO #, shipper, origin…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Link className="primary-btn compact" to="/purchase-orders/new">
            + New Purchase Order
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
              <th>Origin</th>
              <th>Ship Via</th>
              <th>Incoterms</th>
              <th>Currency</th>
              <th>Grand Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="sheet-empty">
                  Loading purchase orders…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="sheet-empty">
                  No purchase orders yet. Click <strong>New Purchase Order</strong> to start.
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
                      onClick={() => navigate(`/purchase-orders/${row.id}`)}
                    >
                      {row.poNumber}
                    </button>
                  </td>
                  <td>{String(row.poDate).slice(0, 10)}</td>
                  <td>{row.shipperName || '—'}</td>
                  <td>{row.originOfGoods || '—'}</td>
                  <td>{row.shipVia || '—'}</td>
                  <td>{row.incoterms || '—'}</td>
                  <td>{row.currency}</td>
                  <td className="num">
                    {Number(row.grandTotal || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td>
                    <span className={`pill status-${row.status.toLowerCase()}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button
                      type="button"
                      className="ghost-btn tiny"
                      onClick={() => navigate(`/purchase-orders/${row.id}`)}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      className="ghost-btn tiny"
                      onClick={() => navigate(`/supplier-entries/new?poId=${row.id}`)}
                    >
                      Supplier Entry
                    </button>
                    <button
                      type="button"
                      className="ghost-btn tiny danger"
                      onClick={() => onDelete(row.id, row.poNumber)}
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
