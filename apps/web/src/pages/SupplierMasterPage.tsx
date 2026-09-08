import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  deleteSupplierMaster,
  listSupplierMasters,
  SupplierMaster,
  syncMissingMasters,
  updateSupplierMaster,
} from '../api/supplierMasters';
import { postMasterToIts } from '../api/importShipments';

function certLabel(v: string) {
  if (v === 'YES') return 'Yes';
  if (v === 'UNDER_PROCESS') return 'Under process';
  return 'No';
}

export default function SupplierMasterPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<SupplierMaster[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [remarksDraft, setRemarksDraft] = useState('');
  const [saving, setSaving] = useState(false);

  async function load(search = q) {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setRows(await listSupplierMasters(token, search));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load master');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [token]);

  async function onSyncMissing() {
    if (!token) return;
    setError(null);
    try {
      const res = await syncMissingMasters(token);
      setInfo(`Synced ${res.synced} supplier entr${res.synced === 1 ? 'y' : 'ies'} into Master.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    }
  }

  async function onSaveRemarks(id: string) {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      await updateSupplierMaster(token, id, { remarks: remarksDraft });
      setEditingId(null);
      setInfo('Remarks saved on Master sheet.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function onToggleCompleted(row: SupplierMaster) {
    if (!token) return;
    try {
      await updateSupplierMaster(token, row.id, { poCompleted: !row.poCompleted });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  async function onDelete(id: string, po: string) {
    if (!token) return;
    if (!window.confirm(`Remove master row for PO ${po}?`)) return;
    try {
      await deleteSupplierMaster(token, id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function onPostToIts(row: SupplierMaster) {
    if (!token) return;
    setError(null);
    try {
      const created = await postMasterToIts(token, row.id);
      setInfo(`Posted PO ${row.purchaseOrderNo} to Import Tracking (Sr ${created.srNo}).`);
      navigate(`/import-tracking/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Post to Import Tracking failed');
    }
  }

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">File-A · Step 3</p>
          <h1>Supplier Master Sheet</h1>
          <p className="muted">
            Combination of Purchase Order + Supplier Entry. Matching columns are filled from Step 2;
            Remarks and completion can be added manually here.
          </p>
        </div>
        <div className="page-actions">
          <input
            className="search-input"
            placeholder="Search PO, shipper, item, HS…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') load(q);
            }}
          />
          <button type="button" className="ghost-btn solid" onClick={() => load(q)}>
            Search
          </button>
          <button type="button" className="ghost-btn solid" onClick={onSyncMissing}>
            Sync from Step 2
          </button>
          <Link className="primary-btn compact" to="/supplier-entries/new">
            + New via Step 2
          </Link>
        </div>
      </div>

      {error ? <div className="alert">{error}</div> : null}
      {info ? <div className="alert ok">{info}</div> : null}

      <div className="excel-sheet-wrap master-sheet-wrap">
        <table className="excel-sheet master-sheet">
          <thead>
            <tr>
              <th>Sr.No</th>
              <th>Purchase Order No</th>
              <th>Date</th>
              <th>PPC Demand No</th>
              <th>PPC Demand Date</th>
              <th>Department</th>
              <th>Shipper Name</th>
              <th>Supplier Category</th>
              <th>Product Category</th>
              <th>Product Item Code</th>
              <th>Supplier Address</th>
              <th>Country</th>
              <th>Supplier Email</th>
              <th>Contact No.</th>
              <th>Website</th>
              <th>Product Description</th>
              <th>Country of Origin</th>
              <th>Product HS Code</th>
              <th>Unit Value</th>
              <th>Total Quantity</th>
              <th>Total Value</th>
              <th>Lead Time</th>
              <th>Port of Loading</th>
              <th>Oekotex</th>
              <th>ISO</th>
              <th>Reach</th>
              <th>Remarks</th>
              <th>PO Done</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={29} className="sheet-empty">
                  Loading supplier master…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={29} className="sheet-empty">
                  No master rows yet. Save a Supplier Entry (Step 2) or click <strong>Sync from Step 2</strong>.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.srNo}</td>
                  <td>{row.purchaseOrderNo}</td>
                  <td>{String(row.entryDate).slice(0, 10)}</td>
                  <td>{row.ppcDemandNo || '—'}</td>
                  <td>{row.ppcDemandDate ? String(row.ppcDemandDate).slice(0, 10) : '—'}</td>
                  <td>{row.division || '—'}</td>
                  <td>{row.shipperName || '—'}</td>
                  <td>{row.supplierCategory || '—'}</td>
                  <td>{row.productCategory || '—'}</td>
                  <td>{row.productItemCode || '—'}</td>
                  <td>{row.shipperAddress || '—'}</td>
                  <td>{row.country || '—'}</td>
                  <td>{row.shipperEmail || '—'}</td>
                  <td>{row.contactNo || '—'}</td>
                  <td>{row.websiteName || '—'}</td>
                  <td>{row.productDescription || '—'}</td>
                  <td>{row.countryOfOrigin || '—'}</td>
                  <td>{row.productHsCode || '—'}</td>
                  <td className="num">{row.unitValue}</td>
                  <td className="num">{row.totalQuantity}</td>
                  <td className="num">{row.totalValue}</td>
                  <td className="num">{row.leadTimeDays ?? '—'}</td>
                  <td>{row.portOfLoading || '—'}</td>
                  <td>{certLabel(row.oekotexCert)}</td>
                  <td>{certLabel(row.isoCert)}</td>
                  <td>{certLabel(row.reachCert)}</td>
                  <td className="remarks-cell">
                    {editingId === row.id ? (
                      <div className="remarks-edit">
                        <input
                          value={remarksDraft}
                          onChange={(e) => setRemarksDraft(e.target.value)}
                          placeholder="Manual remarks"
                        />
                        <button
                          type="button"
                          className="ghost-btn tiny"
                          disabled={saving}
                          onClick={() => onSaveRemarks(row.id)}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="ghost-btn tiny"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="linkish"
                        onClick={() => {
                          setEditingId(row.id);
                          setRemarksDraft(row.remarks || '');
                        }}
                      >
                        {row.remarks || 'Add remarks…'}
                      </button>
                    )}
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={row.poCompleted}
                      onChange={() => onToggleCompleted(row)}
                      title="PO completion (when goods received in ITS)"
                    />
                  </td>
                  <td className="actions-cell">
                    <button
                      type="button"
                      className="ghost-btn tiny"
                      onClick={() => onPostToIts(row)}
                      title="Create Current Status row (File-B)"
                    >
                      → ITS
                    </button>
                    {row.supplierEntryId ? (
                      <button
                        type="button"
                        className="ghost-btn tiny"
                        onClick={() => navigate(`/supplier-entries/${row.supplierEntryId}`)}
                      >
                        Entry
                      </button>
                    ) : null}
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
