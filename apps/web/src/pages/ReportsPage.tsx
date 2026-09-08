import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  exportReport,
  fetchReportCatalog,
  fetchReportFilterOptions,
  fetchReportSummary,
  FilterOptions,
  ReportDef,
  ReportFilters,
  ReportFilterKey,
  ReportResult,
  runReport,
} from '../api/reports';
import ThemeSelect from '../components/ThemeSelect';
import ThemeDateField from '../components/ThemeDateField';

const FILTER_LABELS: Record<ReportFilterKey, string> = {
  from: 'From date',
  to: 'To date',
  supplier: 'Supplier',
  category: 'Category',
  division: 'Division',
  country: 'Country',
  status: 'Status',
  paymentTerm: 'Payment term',
  modeOfShipment: 'Mode of shipment',
  hsCode: 'HS Code',
  pol: 'Port of loading',
  q: 'Search',
  shipVariance: 'Ship variance',
};

function cell(v: unknown) {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
}

export default function ReportsPage() {
  const { token } = useAuth();
  const [catalog, setCatalog] = useState<ReportDef[]>([]);
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [summary, setSummary] = useState<{
    purchaseOrders: { total: number };
    supplierMasters: number;
    importTracking: { open: number; closed: number };
    reportCount: number;
  } | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [filters, setFilters] = useState<ReportFilters>({});
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => catalog.find((r) => r.id === selectedId) || null,
    [catalog, selectedId],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, ReportDef[]>();
    for (const r of catalog) {
      const list = map.get(r.group) || [];
      list.push(r);
      map.set(r.group, list);
    }
    return [...map.entries()];
  }, [catalog]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [cat, opts, sum] = await Promise.all([
          fetchReportCatalog(token),
          fetchReportFilterOptions(token),
          fetchReportSummary(token),
        ]);
        if (cancelled) return;
        setCatalog(cat);
        setOptions(opts);
        setSummary(sum);
        setSelectedId((prev) => prev || cat[0]?.id || '');
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load reports');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    setFilters({});
    setResult(null);
  }, [selectedId]);

  async function onRun(e?: FormEvent) {
    e?.preventDefault();
    if (!token || !selectedId) return;
    setRunning(true);
    setError(null);
    try {
      setResult(await runReport(token, selectedId, filters));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run report');
    } finally {
      setRunning(false);
    }
  }

  async function onExport(format: 'csv' | 'xlsx' | 'pdf') {
    if (!token || !selectedId) return;
    setExporting(format);
    setError(null);
    try {
      const { blob, filename } = await exportReport(token, selectedId, format, filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(null);
    }
  }

  function setFilter(key: ReportFilterKey, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function selectOptions(key: ReportFilterKey): { value: string; label: string }[] {
    const blank = [{ value: '', label: 'All' }];
    if (!options) return blank;
    const map: Partial<Record<ReportFilterKey, string[]>> = {
      supplier: options.suppliers,
      category: options.categories,
      division: options.divisions,
      country: options.countries,
      hsCode: options.hsCodes,
      pol: options.pols,
      paymentTerm: options.paymentTerms,
      modeOfShipment: options.modes,
      status: options.statuses,
      shipVariance: options.shipVariance,
    };
    const list = map[key];
    if (!list) return blank;
    return blank.concat(list.map((v) => ({ value: v, label: v })));
  }

  if (loading) {
    return (
      <main className="page page-wide">
        <p className="muted">Loading report catalog…</p>
      </main>
    );
  }

  return (
    <main className="page page-wide">
      <div className="page-head">
        <div>
          <p className="eyebrow">File-A · SUPPLIERS · Detailed reports</p>
          <h1>Report center</h1>
          <p className="muted">
            Choose a report from the five Excel sheets or analytics catalog, apply filters, preview
            results, then export professionally formatted PDF, Excel, or CSV.
          </p>
        </div>
        <div className="page-actions">
          <Link className="ghost-btn solid" to="/">
            ← Home
          </Link>
        </div>
      </div>

      {summary ? (
        <div className="report-kpi-grid compact">
          <div className="report-kpi">
            <span>Available reports</span>
            <strong>{summary.reportCount}</strong>
          </div>
          <div className="report-kpi">
            <span>Purchase orders</span>
            <strong>{summary.purchaseOrders.total}</strong>
          </div>
          <div className="report-kpi">
            <span>Master rows</span>
            <strong>{summary.supplierMasters}</strong>
          </div>
          <div className="report-kpi">
            <span>Open / Closed ITS</span>
            <strong>
              {summary.importTracking.open} / {summary.importTracking.closed}
            </strong>
          </div>
        </div>
      ) : null}

      {error ? <div className="alert">{error}</div> : null}

      <div className="report-layout">
        <aside className="report-catalog">
          {grouped.map(([group, items]) => (
            <div key={group} className="report-group">
              <h2>{group}</h2>
              <ul>
                {items.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className={selectedId === r.id ? 'active' : ''}
                      onClick={() => setSelectedId(r.id)}
                    >
                      <strong>{r.title}</strong>
                      <span>{r.description}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>

        <section className="report-workspace">
          {selected ? (
            <>
              <div className="report-workspace-head">
                <div>
                  <p className="eyebrow">{selected.group}</p>
                  <h2>{selected.title}</h2>
                  <p className="muted">{selected.description}</p>
                </div>
                <div className="report-export-actions">
                  <button
                    type="button"
                    className="ghost-btn solid report-export-btn"
                    disabled={!!exporting}
                    onClick={() => onExport('pdf')}
                  >
                    Export PDF
                  </button>
                  <button
                    type="button"
                    className="ghost-btn solid report-export-btn"
                    disabled={!!exporting}
                    onClick={() => onExport('xlsx')}
                  >
                    Export Excel
                  </button>
                  <button
                    type="button"
                    className="ghost-btn solid report-export-btn"
                    disabled={!!exporting}
                    onClick={() => onExport('csv')}
                  >
                    Export CSV
                  </button>
                </div>
              </div>

              <form className="report-filters-panel" onSubmit={onRun}>
                <div className="report-filters-grid">
                  {selected.filters.map((key) => {
                    if (key === 'from' || key === 'to') {
                      return (
                        <label key={key} className="report-filter-field">
                          <span>{FILTER_LABELS[key]}</span>
                          <ThemeDateField
                            value={filters[key] || ''}
                            onChange={(v) => setFilter(key, v)}
                          />
                        </label>
                      );
                    }
                    if (key === 'q') {
                      return (
                        <label key={key} className="report-filter-field">
                          <span>{FILTER_LABELS[key]}</span>
                          <input
                            className="search-input"
                            value={filters.q || ''}
                            onChange={(e) => setFilter('q', e.target.value)}
                            placeholder="PO, supplier, HS…"
                          />
                        </label>
                      );
                    }
                    return (
                      <label key={key} className="report-filter-field">
                        <span>{FILTER_LABELS[key]}</span>
                        <ThemeSelect
                          value={filters[key] || ''}
                          onChange={(v) => setFilter(key, v)}
                          options={selectOptions(key)}
                          placeholder="All"
                        />
                      </label>
                    );
                  })}
                </div>
                <div className="report-filter-actions">
                  <button type="submit" className="primary-btn compact" disabled={running}>
                    {running ? 'Running…' : 'Run report'}
                  </button>
                  <button
                    type="button"
                    className="ghost-btn solid"
                    onClick={() => {
                      setFilters({});
                      setResult(null);
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              </form>

              {result ? (
                <div className="report-preview">
                  <div className="report-preview-meta">
                    <strong>{result.rowCount} row(s)</strong>
                    <span className="muted small">
                      Generated {new Date(result.generatedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="excel-sheet-wrap report-preview-wrap">
                    <table className="excel-sheet report-preview-table">
                      <thead>
                        <tr>
                          {result.columns.map((c) => (
                            <th key={c.key}>{c.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows.length === 0 ? (
                          <tr>
                            <td colSpan={result.columns.length} className="sheet-empty">
                              No rows matched these filters.
                            </td>
                          </tr>
                        ) : (
                          result.rows.map((row, idx) => (
                            <tr key={idx}>
                              {result.columns.map((c) => (
                                <td
                                  key={c.key}
                                  className={c.align === 'right' ? 'num' : undefined}
                                >
                                  {cell(row[c.key])}
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="report-empty">
                  <p>Set filters if needed, then click <strong>Run report</strong> to preview.</p>
                  <p className="muted">
                    Exports use the same filters even before preview — run first to confirm the
                    dataset.
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="muted">Select a report from the catalog.</p>
          )}
        </section>
      </div>
    </main>
  );
}
