import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  fetchOperationalHistory,
  fetchPaymentHistory,
  fetchPurchaseHistory,
  HistoryFilters,
  OperationalHistoryRow,
  PaymentHistoryRow,
  PurchaseHistoryRow,
} from '../api/histories';
import ThemeDateField from '../components/ThemeDateField';

type Tab = 'purchase' | 'payment' | 'operational';

function d(v?: string | null) {
  if (!v) return '—';
  return String(v).slice(0, 10);
}

function n(v?: number | null) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return v;
}

export default function HistoriesPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('purchase');
  const [filters, setFilters] = useState<HistoryFilters>({
    q: '',
    supplier: '',
    category: '',
    from: '',
    to: '',
  });
  const [applied, setApplied] = useState<HistoryFilters>({});
  const [purchase, setPurchase] = useState<PurchaseHistoryRow[]>([]);
  const [payment, setPayment] = useState<PaymentHistoryRow[]>([]);
  const [operational, setOperational] = useState<OperationalHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(next = applied) {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      if (tab === 'purchase') setPurchase(await fetchPurchaseHistory(token, next));
      else if (tab === 'payment') setPayment(await fetchPaymentHistory(token, next));
      else setOperational(await fetchOperationalHistory(token, next));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(applied);
  }, [token, tab, applied]);

  function onFilter(e: FormEvent) {
    e.preventDefault();
    setApplied({ ...filters });
  }

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">File-A · Step 6 · Derived</p>
          <h1>Supplier Histories</h1>
          <p className="muted">
            Live views from Supplier Master + Import Tracking (same idea as Excel Purchase /
            Payment / Operational history sheets). No separate mock tables — rows come from real DB
            data.
          </p>
        </div>
        <div className="page-actions">
          <Link className="ghost-btn solid" to="/supplier-master">
            Master
          </Link>
          <Link className="ghost-btn solid" to="/closed-files">
            Closed Files
          </Link>
        </div>
      </div>

      <div className="history-tabs" role="tablist">
        {(
          [
            ['purchase', 'Purchase History'],
            ['payment', 'Payment History'],
            ['operational', 'Operational History'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            className={tab === id ? 'active' : ''}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <form className="history-filters" onSubmit={onFilter}>
        <input
          className="search-input"
          placeholder="Search PO, supplier, HS…"
          value={filters.q || ''}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
        />
        <input
          className="search-input"
          placeholder="Supplier"
          value={filters.supplier || ''}
          onChange={(e) => setFilters((f) => ({ ...f, supplier: e.target.value }))}
        />
        {tab === 'purchase' ? (
          <input
            className="search-input"
            placeholder="Category"
            value={filters.category || ''}
            onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
          />
        ) : null}
        <ThemeDateField
          value={filters.from || ''}
          onChange={(v) => setFilters((f) => ({ ...f, from: v }))}
        />
        <ThemeDateField
          value={filters.to || ''}
          onChange={(v) => setFilters((f) => ({ ...f, to: v }))}
        />
        <button type="submit" className="primary-btn compact">
          Apply filters
        </button>
      </form>

      {error ? <div className="alert">{error}</div> : null}

      <div className="excel-sheet-wrap history-sheet-wrap">
        {tab === 'purchase' ? (
          <table className="excel-sheet history-sheet">
            <thead>
              <tr>
                <th>Sr.No</th>
                <th>Category</th>
                <th>HS Code</th>
                <th>Month</th>
                <th>Product Item Code</th>
                <th>PO</th>
                <th>PO Date</th>
                <th>Supplier</th>
                <th>Description</th>
                <th>COO</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Amount</th>
                <th>Payment / Bank Ref</th>
                <th>Mode of Shipment</th>
                <th>Price Term</th>
                <th>R.O.E</th>
                <th>Value in PKR</th>
                <th>ITS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={19} className="sheet-empty">
                    Loading purchase history…
                  </td>
                </tr>
              ) : purchase.length === 0 ? (
                <tr>
                  <td colSpan={19} className="sheet-empty">
                    No rows yet. Create Master / ITS data first.
                  </td>
                </tr>
              ) : (
                purchase.map((r) => (
                  <tr key={`${r.masterId}-${r.srNo}`}>
                    <td>{r.srNo}</td>
                    <td>{r.category || '—'}</td>
                    <td>{r.hsCode || '—'}</td>
                    <td>{r.month || '—'}</td>
                    <td>{r.productItemCode || '—'}</td>
                    <td>{r.purchaseOrderNo}</td>
                    <td>{d(r.poDate)}</td>
                    <td>{r.supplier || '—'}</td>
                    <td>{r.description || '—'}</td>
                    <td>{r.countryOfOrigin || '—'}</td>
                    <td className="num">{n(r.quantity)}</td>
                    <td className="num">{n(r.unitPrice)}</td>
                    <td className="num">{n(r.amount)}</td>
                    <td>{r.paymentBankRef || '—'}</td>
                    <td>{r.modeOfShipment || '—'}</td>
                    <td>{r.priceTerm || '—'}</td>
                    <td className="num">{n(r.roe)}</td>
                    <td className="num">{n(r.valueInPkr)}</td>
                    <td>{r.itsStatus || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : null}

        {tab === 'payment' ? (
          <table className="excel-sheet history-sheet">
            <thead>
              <tr>
                <th>Sr.No</th>
                <th>PO</th>
                <th>PO Date</th>
                <th>Supplier</th>
                <th>Amount</th>
                <th>Bank Ref</th>
                <th>Payment Term</th>
                <th>R.O.E</th>
                <th>Value in PKR</th>
                <th>Mode</th>
                <th>Price Term</th>
                <th>ITS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="sheet-empty">
                    Loading payment history…
                  </td>
                </tr>
              ) : payment.length === 0 ? (
                <tr>
                  <td colSpan={12} className="sheet-empty">
                    No payment rows yet.
                  </td>
                </tr>
              ) : (
                payment.map((r) => (
                  <tr key={`${r.masterId}-pay-${r.srNo}`}>
                    <td>{r.srNo}</td>
                    <td>{r.purchaseOrderNo}</td>
                    <td>{d(r.poDate)}</td>
                    <td>{r.supplier || '—'}</td>
                    <td className="num">{n(r.amount)}</td>
                    <td>{r.paymentBankRef || '—'}</td>
                    <td>{r.paymentTerm || '—'}</td>
                    <td className="num">{n(r.roe)}</td>
                    <td className="num">{n(r.valueInPkr)}</td>
                    <td>{r.modeOfShipment || '—'}</td>
                    <td>{r.priceTerm || '—'}</td>
                    <td>{r.itsStatus || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : null}

        {tab === 'operational' ? (
          <table className="excel-sheet history-sheet">
            <thead>
              <tr>
                <th>Sr.No</th>
                <th>PO</th>
                <th>PO Date</th>
                <th>PPC Demand</th>
                <th>Supplier</th>
                <th>Qty</th>
                <th>Lead Time</th>
                <th>Supplier Delivery</th>
                <th>Actual Ready</th>
                <th>PP Sample</th>
                <th>Rev 1</th>
                <th>Rev 2</th>
                <th>Delay vs supplier</th>
                <th>Delay 1–10</th>
                <th>Delay 10–20</th>
                <th>Mode</th>
                <th>Air due to delay</th>
                <th>ITS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={18} className="sheet-empty">
                    Loading operational history…
                  </td>
                </tr>
              ) : operational.length === 0 ? (
                <tr>
                  <td colSpan={18} className="sheet-empty">
                    No operational rows yet.
                  </td>
                </tr>
              ) : (
                operational.map((r) => (
                  <tr key={`${r.masterId}-ops-${r.srNo}`}>
                    <td>{r.srNo}</td>
                    <td>{r.purchaseOrderNo}</td>
                    <td>{d(r.poDate)}</td>
                    <td>{d(r.ppcDemandDate)}</td>
                    <td>{r.supplier || '—'}</td>
                    <td className="num">{n(r.quantity)}</td>
                    <td className="num">{n(r.leadTimeDays)}</td>
                    <td>{d(r.supplierDeliveryDate)}</td>
                    <td>{d(r.actualShipmentReadyDate)}</td>
                    <td>{d(r.ppSampleReadyDate)}</td>
                    <td>{d(r.revision1)}</td>
                    <td>{d(r.revision2)}</td>
                    <td className="num">{n(r.delayAgainstSupplier)}</td>
                    <td className={`num${r.delay1to10 != null ? ' delay-warn' : ''}`}>
                      {n(r.delay1to10)}
                    </td>
                    <td className={`num${r.delay10to20 != null ? ' delay-hot' : ''}`}>
                      {n(r.delay10to20)}
                    </td>
                    <td>{r.modeOfShipment || '—'}</td>
                    <td>{r.liftedByAirDueToDelay ? 'Yes' : 'No'}</td>
                    <td>{r.itsStatus || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : null}
      </div>
    </main>
  );
}
