import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  closeImportShipment,
  deleteImportShipment,
  ImportShipment,
  listImportShipments,
  listMastersAvailableForIts,
  MasterForIts,
  postMasterToIts,
} from '../api/importShipments';

function d(v?: string | null) {
  if (!v) return '—';
  return String(v).slice(0, 10);
}

function n(v?: number | null) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return v;
}

export default function ImportTrackingPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ImportShipment[]>([]);
  const [masters, setMasters] = useState<MasterForIts[]>([]);
  const [masterId, setMasterId] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  async function load() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [list, available] = await Promise.all([
        listImportShipments(token, 'OPEN'),
        listMastersAvailableForIts(token),
      ]);
      setRows(list);
      setMasters(available);
      const firstOpen = available.find((m) => !m.alreadyInOpenIts);
      setMasterId((prev) => prev || firstOpen?.id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Import Tracking');
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
        r.productDescription,
        r.ppcDemandNo,
        r.division,
        r.merchandiser,
      ]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [rows, q]);

  const availableMasters = masters.filter((m) => !m.alreadyInOpenIts);

  async function onPostFromMaster() {
    if (!token || !masterId) return;
    setPosting(true);
    setError(null);
    try {
      const created = await postMasterToIts(token, masterId);
      setInfo(`Posted Master PO ${created.purchaseOrderNo} into Current Status (Sr ${created.srNo}).`);
      setMasterId('');
      await load();
      navigate(`/import-tracking/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Post to ITS failed');
    } finally {
      setPosting(false);
    }
  }

  async function onClose(row: ImportShipment) {
    if (!token) return;
    if (
      !window.confirm(
        `Close PO ${row.purchaseOrderNo}? It will leave Current Status and mark Master PO Done.`,
      )
    ) {
      return;
    }
    try {
      const closed = await closeImportShipment(token, row.id);
      setInfo(`Closed ${row.purchaseOrderNo}. Opening Closed Files to complete QC/bank…`);
      navigate(`/import-tracking/${closed.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Close failed');
    }
  }

  async function onDelete(row: ImportShipment) {
    if (!token) return;
    if (!window.confirm(`Remove open ITS row for PO ${row.purchaseOrderNo}?`)) return;
    try {
      await deleteImportShipment(token, row.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">File-B · Step 4</p>
          <h1>Import Tracking — Current Status</h1>
          <p className="muted">
            Same wide sheet as Excel Current Status 2020. Post a Supplier Master row, then fill
            shipment dates, bank, and logistics. Yellow / red cells flag delay buckets.
          </p>
        </div>
        <div className="page-actions its-actions">
          <input
            className="search-input"
            placeholder="Filter PO, shipper, product…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="search-input its-master-select"
            value={masterId}
            onChange={(e) => setMasterId(e.target.value)}
          >
            <option value="">Post from Master…</option>
            {availableMasters.map((m) => (
              <option key={m.id} value={m.id}>
                {m.purchaseOrderNo} · {m.shipperName || 'Shipper'}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="primary-btn compact"
            disabled={!masterId || posting}
            onClick={onPostFromMaster}
          >
            {posting ? 'Posting…' : 'Post to Current Status'}
          </button>
          <Link className="ghost-btn solid" to="/supplier-master">
            Open Master
          </Link>
          <Link className="ghost-btn solid" to="/closed-files">
            Closed Files
          </Link>
        </div>
      </div>

      {error ? <div className="alert">{error}</div> : null}
      {info ? <div className="alert ok">{info}</div> : null}

      <div className="excel-sheet-wrap its-sheet-wrap">
        <table className="excel-sheet its-sheet">
          <thead>
            <tr>
              <th>Sr.No</th>
              <th>Division</th>
              <th>Merchandiser</th>
              <th>Month</th>
              <th>PPC Demand No</th>
              <th>PPC Demand date</th>
              <th>Elapsed LT</th>
              <th>Remaining LT</th>
              <th>Purchase Order</th>
              <th>PO Date</th>
              <th>PO TAT</th>
              <th>P.O Qty</th>
              <th>Shipper</th>
              <th>Product Description</th>
              <th>Qty shipped</th>
              <th>Unit Value</th>
              <th>Total Amount</th>
              <th>Bank</th>
              <th>Payment Term</th>
              <th>Mode of Shipment</th>
              <th>Incoterm</th>
              <th>Supplier DT</th>
              <th>Std LT</th>
              <th>Supplier Delivery Date</th>
              <th>PP Sample Ready</th>
              <th>Actual Ready</th>
              <th>Delay vs supplier</th>
              <th>Delay 1–10</th>
              <th>Delay 10–20</th>
              <th>On Board</th>
              <th>ETA At port</th>
              <th>B/L / AWB #</th>
              <th>BL Date</th>
              <th>POL</th>
              <th>Destination</th>
              <th>Mode of Clearance</th>
              <th>EOU Limit</th>
              <th>FETA</th>
              <th>Rev 1</th>
              <th>Rev 2</th>
              <th>Rev 3</th>
              <th>Factory delay</th>
              <th>Forwarder</th>
              <th>C/A</th>
              <th>Doc to Agent</th>
              <th>Remarks</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={47} className="sheet-empty">
                  Loading Current Status…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={47} className="sheet-empty">
                  No open shipments. Choose a Supplier Master row and click{' '}
                  <strong>Post to Current Status</strong>.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id}>
                  <td>{row.srNo}</td>
                  <td>{row.division || '—'}</td>
                  <td>{row.merchandiser || '—'}</td>
                  <td>{row.monthLabel || '—'}</td>
                  <td>{row.ppcDemandNo || '—'}</td>
                  <td>{d(row.ppcDemandDate)}</td>
                  <td className="num">{n(row.elapsedLeadTime)}</td>
                  <td
                    className={`num${
                      (row.remainingLeadTime ?? 0) < 0 ? ' delay-hot' : ''
                    }`}
                  >
                    {n(row.remainingLeadTime)}
                  </td>
                  <td>{row.purchaseOrderNo}</td>
                  <td>{d(row.purchaseOrderDate)}</td>
                  <td className="num">{n(row.poTat)}</td>
                  <td className="num">{row.poQuantity}</td>
                  <td>{row.shipperName || '—'}</td>
                  <td>{row.productDescription || '—'}</td>
                  <td className="num">{row.quantityShipped}</td>
                  <td className="num">{row.unitValue}</td>
                  <td className="num">{row.totalAmount}</td>
                  <td>{row.bank || '—'}</td>
                  <td>{row.paymentTerm || '—'}</td>
                  <td>{row.modeOfShipment || '—'}</td>
                  <td>{row.incoterm || '—'}</td>
                  <td className="num">{n(row.supplierDeliveryTime)}</td>
                  <td className="num">{row.standardLeadTime}</td>
                  <td>{d(row.supplierDeliveryDate as string | null)}</td>
                  <td>{d(row.ppSampleReadyDate)}</td>
                  <td>{d(row.actualShipmentReadyDate)}</td>
                  <td className="num">{n(row.delayAgainstSupplier)}</td>
                  <td className={`num${row.delay1to10 != null ? ' delay-warn' : ''}`}>
                    {n(row.delay1to10)}
                  </td>
                  <td className={`num${row.delay10to20 != null ? ' delay-hot' : ''}`}>
                    {n(row.delay10to20)}
                  </td>
                  <td>{d(row.onBoardDate)}</td>
                  <td>{d(row.etaAtPort)}</td>
                  <td>{row.blAwbNo || '—'}</td>
                  <td>{d(row.blDate)}</td>
                  <td>{row.pol || '—'}</td>
                  <td>{row.destinationPort || '—'}</td>
                  <td>{row.modeOfClearance || '—'}</td>
                  <td>{row.eouLimitUtilized || '—'}</td>
                  <td>{d(row.fetaDate)}</td>
                  <td>{d(row.revision1)}</td>
                  <td>{d(row.revision2)}</td>
                  <td>{d(row.revision3)}</td>
                  <td className="num">{n(row.factoryArrivalDelay)}</td>
                  <td>{row.forwarder || '—'}</td>
                  <td>{row.clearingAgent || '—'}</td>
                  <td>{row.docToAgent || '—'}</td>
                  <td>{row.remarks || '—'}</td>
                  <td className="actions-cell">
                    <button
                      type="button"
                      className="ghost-btn tiny"
                      onClick={() => navigate(`/import-tracking/${row.id}`)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="ghost-btn tiny"
                      onClick={() => onClose(row)}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      className="ghost-btn tiny danger"
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
    </main>
  );
}
