import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  deleteImportShipment,
  ImportShipment,
  listImportShipments,
} from '../api/importShipments';

function d(v?: string | null) {
  if (!v) return '—';
  return String(v).slice(0, 10);
}

function n(v?: number | null) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return v;
}

export default function ClosedFilesPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ImportShipment[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setRows(await listImportShipments(token, 'CLOSED'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Closed Files');
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
        r.category,
        r.bankName,
        r.delayCause,
      ]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [rows, q]);

  async function onDelete(row: ImportShipment) {
    if (!token) return;
    if (!window.confirm(`Remove closed file for PO ${row.purchaseOrderNo}?`)) return;
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
          <p className="eyebrow">File-B · Step 5</p>
          <h1>Current Closed Files</h1>
          <p className="muted">
            Excel Closed Files sheet — Status columns plus QC, bank, insurance, logistics, and
            clearance. Close a row from Current Status, then complete these groups here.
          </p>
        </div>
        <div className="page-actions">
          <input
            className="search-input"
            placeholder="Filter PO, shipper, bank…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Link className="ghost-btn solid" to="/import-tracking">
            ← Current Status
          </Link>
        </div>
      </div>

      {error ? <div className="alert">{error}</div> : null}

      <div className="excel-sheet-wrap closed-sheet-wrap">
        <table className="excel-sheet closed-sheet">
          <thead>
            <tr>
              <th>Sr.No</th>
              <th>Category</th>
              <th>Merchandiser</th>
              <th>Month</th>
              <th>Purchase Order</th>
              <th>Shipper</th>
              <th>Description</th>
              <th>Qty shipped</th>
              <th>Amount</th>
              <th>Payment Term</th>
              <th>Mode / Incoterm</th>
              <th>Delay std 1–10</th>
              <th>Delay std 10–20</th>
              <th>Delay Cause</th>
              <th>QC Report Date</th>
              <th>Order Qty</th>
              <th>Rejected</th>
              <th>Less Qty</th>
              <th>Claim Date</th>
              <th>QC days</th>
              <th>QC loss</th>
              <th>PO Closed ERP</th>
              <th>Bank Name</th>
              <th>TT/LC No</th>
              <th>Bank Date</th>
              <th>R.O.E</th>
              <th>Chg Adv</th>
              <th>Chg LC Open</th>
              <th>Chg Retirement</th>
              <th>Bank charges total</th>
              <th>Docs payment</th>
              <th>OA/Adv settle</th>
              <th>Insurance</th>
              <th>Ins. Bill No</th>
              <th>Ins. Date</th>
              <th>Ins. Amount</th>
              <th>Forwarder</th>
              <th>Log. Bill No</th>
              <th>Log. Date</th>
              <th>Weight/CBM</th>
              <th>Log. Amount</th>
              <th>Bill to Finance</th>
              <th>C/A</th>
              <th>G.D No</th>
              <th>G.D Date</th>
              <th>Clearance Date</th>
              <th>Clr Bill No</th>
              <th>Clearance Amt</th>
              <th>Remarks</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={52} className="sheet-empty">
                  Loading Closed Files…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={52} className="sheet-empty">
                  No closed files yet. On <strong>Import Tracking</strong>, click <strong>Close</strong>{' '}
                  on a Current Status row.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id}>
                  <td>{row.srNo}</td>
                  <td>{row.category || row.division || '—'}</td>
                  <td>{row.merchandiser || '—'}</td>
                  <td>{row.monthLabel || '—'}</td>
                  <td>{row.purchaseOrderNo}</td>
                  <td>{row.shipperName || '—'}</td>
                  <td>{row.productDescription || '—'}</td>
                  <td className="num">{row.quantityShipped}</td>
                  <td className="num">{row.totalAmount}</td>
                  <td>{row.paymentTerm || '—'}</td>
                  <td>
                    {[row.modeOfShipment, row.incoterm].filter(Boolean).join(' / ') || '—'}
                  </td>
                  <td className={`num${row.delayStd1to10 != null ? ' delay-warn' : ''}`}>
                    {n(row.delayStd1to10)}
                  </td>
                  <td className={`num${row.delayStd10to20 != null ? ' delay-hot' : ''}`}>
                    {n(row.delayStd10to20)}
                  </td>
                  <td>{row.delayCause || '—'}</td>
                  <td>{d(row.qcReportReceivedDate)}</td>
                  <td className="num">{row.qcOrderQty}</td>
                  <td className="num">{row.qcRejectedQty}</td>
                  <td className="num">{row.qcLessQty}</td>
                  <td>{d(row.qcClaimDate)}</td>
                  <td className="num">{n(row.qcReportReceivedDays)}</td>
                  <td className="num">{row.qcMaterialFinancialLoss}</td>
                  <td>{row.poClosedFromErp ? 'Yes' : 'No'}</td>
                  <td>{row.bankName || row.bank || '—'}</td>
                  <td>{row.bankTtLcNumber || '—'}</td>
                  <td>{d(row.bankDate)}</td>
                  <td className="num">{row.bankRoe || '—'}</td>
                  <td className="num">{row.bankChargesAdvance || '—'}</td>
                  <td className="num">{row.bankChargesLcOpening || '—'}</td>
                  <td className="num">{row.bankChargesRetirement || '—'}</td>
                  <td className="num">{n(row.bankChargesTotal)}</td>
                  <td>{row.bankDocsPayment || '—'}</td>
                  <td>{row.bankOaAdvanceSettlement || '—'}</td>
                  <td>{row.insuranceCompany || '—'}</td>
                  <td>{row.insuranceBillNo || '—'}</td>
                  <td>{d(row.insuranceDate)}</td>
                  <td className="num">{row.insuranceAmount || '—'}</td>
                  <td>{row.forwarder || '—'}</td>
                  <td>{row.logisticsBillNo || '—'}</td>
                  <td>{d(row.logisticsDate)}</td>
                  <td>{row.logisticsWeightCbm || '—'}</td>
                  <td className="num">{row.logisticsAmount || '—'}</td>
                  <td>{d(row.logisticsBillToFinance)}</td>
                  <td>{row.clearingAgent || '—'}</td>
                  <td>{row.gdNo || '—'}</td>
                  <td>{d(row.gdDate)}</td>
                  <td>{d(row.shipmentClearanceDate)}</td>
                  <td>{row.clearanceBillNo || '—'}</td>
                  <td className="num">{row.clearanceAmount || '—'}</td>
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
