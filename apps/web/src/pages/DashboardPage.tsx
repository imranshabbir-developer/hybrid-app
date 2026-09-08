import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { listPurchaseOrders } from '../api/purchaseOrders';
import { listSupplierEntries } from '../api/supplierEntries';
import { listSupplierMasters } from '../api/supplierMasters';
import { listImportShipments } from '../api/importShipments';

type Counts = {
  pos: number;
  entries: number;
  masters: number;
  openIts: number;
  closedIts: number;
};

const STEPS = [
  {
    n: '01',
    title: 'Purchase Order',
    blurb: 'Start here — Excel PO Format with lines and totals.',
    to: '/purchase-orders/new',
    cta: 'Create PO',
    secondary: { to: '/purchase-orders', label: 'View all' },
  },
  {
    n: '02',
    title: 'Supplier Entry',
    blurb: 'Enrich the PO. Matching fields auto-fill from Step 1.',
    to: '/supplier-entries/new',
    cta: 'Open form',
    secondary: { to: '/supplier-entries', label: 'Entries' },
  },
  {
    n: '03',
    title: 'Supplier Master',
    blurb: 'Combined sheet — one row per PO for search and control.',
    to: '/supplier-master',
    cta: 'Open master',
  },
  {
    n: '04',
    title: 'Import Tracking',
    blurb: 'Current Status 2020 — live open shipments and delays.',
    to: '/import-tracking',
    cta: 'Open status',
  },
  {
    n: '05',
    title: 'Closed Files',
    blurb: 'QC, bank, insurance, logistics and clearance close-out.',
    to: '/closed-files',
    cta: 'Open closed',
  },
  {
    n: '06',
    title: 'Histories',
    blurb: 'Purchase, payment and operational views from live data.',
    to: '/histories',
    cta: 'Open histories',
  },
] as const;

export default function DashboardPage() {
  const { user, token } = useAuth();
  const firstName = user?.fullName?.split(' ')[0] || 'User';
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const [pos, entries, masters, openIts, closedIts] = await Promise.all([
          listPurchaseOrders(token),
          listSupplierEntries(token),
          listSupplierMasters(token),
          listImportShipments(token, 'OPEN'),
          listImportShipments(token, 'CLOSED'),
        ]);
        if (cancelled) return;
        setCounts({
          pos: pos.length,
          entries: entries.length,
          masters: masters.length,
          openIts: openIts.length,
          closedIts: closedIts.length,
        });
      } catch {
        if (!cancelled) setCounts(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="page page-home">
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="eyebrow">Workspace ready</p>
          <h1>
            Welcome, <em>{firstName}</em>
          </h1>
          <p className="home-lead">
            Same path as your Excel workbooks — clear steps, fields that carry forward, and a
            desktop-ready workspace that stays familiar.
          </p>
          <div className="home-hero-actions">
            <Link className="primary-btn" to="/purchase-orders/new">
              Start with Purchase Order
            </Link>
            <Link className="ghost-btn solid" to="/reports">
              View reports
            </Link>
          </div>
        </div>
        <div className="home-hero-panel" aria-label="Session summary">
          <div className="home-kpi">
            <span>Role</span>
            <strong>{user?.role}</strong>
          </div>
          <div className="home-kpi">
            <span>Company</span>
            <strong>{user?.company?.code || 'ALL (Admin)'}</strong>
          </div>
          <div className="home-kpi">
            <span>Access</span>
            <strong>{user?.role === 'ADMIN' ? 'Full system' : 'Company scoped'}</strong>
          </div>
          {counts ? (
            <>
              <div className="home-kpi accent">
                <span>Open shipments</span>
                <strong>{counts.openIts}</strong>
              </div>
              <div className="home-kpi">
                <span>Purchase orders</span>
                <strong>{counts.pos}</strong>
              </div>
              <div className="home-kpi">
                <span>Closed files</span>
                <strong>{counts.closedIts}</strong>
              </div>
            </>
          ) : null}
        </div>
      </section>

      <section className="home-flow">
        <div className="home-flow-head">
          <div>
            <p className="eyebrow">Guided workflow</p>
            <h2>Six steps from PO to history</h2>
          </div>
          <p className="muted">
            Tap a card to continue. Data you already entered flows to the next sheet.
          </p>
        </div>

        <div className="home-step-grid">
          {STEPS.map((step) => (
            <article key={step.n} className="home-step-card">
              <div className="home-step-top">
                <span className="home-step-num">{step.n}</span>
                <span className="home-step-pulse" aria-hidden="true" />
              </div>
              <h3>{step.title}</h3>
              <p>{step.blurb}</p>
              <div className="home-step-actions">
                <Link to={step.to}>{step.cta} →</Link>
                {'secondary' in step && step.secondary ? (
                  <Link className="subtle" to={step.secondary.to}>
                    {step.secondary.label}
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      {counts ? (
        <section className="home-pulse-row" aria-label="Live counts">
          <div>
            <span>Supplier entries</span>
            <strong>{counts.entries}</strong>
          </div>
          <div>
            <span>Master rows</span>
            <strong>{counts.masters}</strong>
          </div>
          <div>
            <span>Pipeline</span>
            <strong>
              {counts.openIts} open · {counts.closedIts} closed
            </strong>
          </div>
        </section>
      ) : null}
    </main>
  );
}
