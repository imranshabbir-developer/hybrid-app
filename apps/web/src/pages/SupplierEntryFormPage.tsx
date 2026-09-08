import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { listPurchaseOrders, PurchaseOrder } from '../api/purchaseOrders';
import {
  createSupplierEntry,
  emptySupplierEntry,
  getSupplierEntry,
  prefillFromPo,
  PrefillResponse,
  SupplierEntryInput,
  updateSupplierEntry,
} from '../api/supplierEntries';
import ThemeSelect from '../components/ThemeSelect';
import ThemeDateField from '../components/ThemeDateField';
import { useLookupOptions } from '../hooks/useLookupOptions';

function toDateInput(value?: string | null) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function Field({
  label,
  auto,
  children,
}: {
  label: string;
  auto?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`sf-field${auto ? ' is-auto' : ''}`}>
      <div className="sf-label-row">
        <span className="sf-label">{label}</span>
        {auto ? <span className="sf-badge">From PO</span> : null}
      </div>
      {children}
    </div>
  );
}

export default function SupplierEntryFormPage() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const isNew = !id || id === 'new';
  const { token } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<SupplierEntryInput>(() => emptySupplierEntry());
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const supplierCategoryOpts = useLookupOptions('SUPPLIER_CATEGORY', [
    'Manufacturer',
    'Trader',
    'Customer Source',
  ]);
  const productCategoryOpts = useLookupOptions('PRODUCT_CATEGORY', [
    'Fabrics',
    'Accessories',
    'Machinery and spares',
    'Dyes and chemicals',
  ]);
  const toleranceOpts = useLookupOptions('TOLERANCE', ['5%', '7%', '10%', '5%, +/-']);
  const certOpts = useLookupOptions('CERT_STATUS', ['YES', 'NO', 'UNDER_PROCESS']);
  const divisionOpts = useLookupOptions('DIVISION', [
    'Garments',
    'Processing',
    'Accessories',
    'Home Textile',
  ]);
  const [availableLines, setAvailableLines] = useState<PrefillResponse['availableLines']>([]);
  const [prefilledFrom, setPrefilledFrom] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function setField<K extends keyof SupplierEntryInput>(key: K, value: SupplierEntryInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function applyPrefill(data: PrefillResponse) {
    const {
      availableLines: lines,
      prefilledFrom: from,
      manualFields: _manual,
      ...rest
    } = data;
    setAvailableLines(lines || []);
    setPrefilledFrom(from || []);
    setForm({
      ...emptySupplierEntry(),
      ...rest,
      entryDate: toDateInput(rest.entryDate) || emptySupplierEntry().entryDate,
      ppcDemandDate: rest.ppcDemandDate ? toDateInput(rest.ppcDemandDate) : null,
    });
    setInfo(
      `Loaded from Purchase Order ${rest.purchaseOrderNo}. Green fields came from Step 1 — edit only if needed.`,
    );
  }

  async function loadPrefill(poId: string, lineNo?: number) {
    if (!token) return;
    setError(null);
    try {
      const data = await prefillFromPo(token, poId, lineNo);
      applyPrefill(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PO data');
    }
  }

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const poList = await listPurchaseOrders(token);
        if (cancelled) return;
        setPos(poList);

        if (!isNew && id) {
          const row = await getSupplierEntry(token, id);
          if (cancelled) return;
          setForm({
            purchaseOrderId: row.purchaseOrderId,
            purchaseOrderNo: row.purchaseOrderNo,
            entryDate: toDateInput(row.entryDate),
            ppcDemandNo: row.ppcDemandNo,
            ppcDemandDate: row.ppcDemandDate ? toDateInput(row.ppcDemandDate) : null,
            shipperName: row.shipperName,
            division: row.division,
            supplierCategory: row.supplierCategory,
            productCategory: row.productCategory,
            tolerance: row.tolerance,
            productItemCode: row.productItemCode,
            shipperAddress: row.shipperAddress,
            country: row.country,
            shipperEmail: row.shipperEmail,
            contactNo: row.contactNo,
            websiteName: row.websiteName,
            productDescription: row.productDescription,
            countryOfOrigin: row.countryOfOrigin,
            productHsCode: row.productHsCode,
            unitValue: Number(row.unitValue || 0),
            totalQuantity: Number(row.totalQuantity || 0),
            totalValue: Number(row.totalValue || 0),
            leadTimeDays: row.leadTimeDays,
            portOfLoading: row.portOfLoading,
            oekotexCert: row.oekotexCert,
            isoCert: row.isoCert,
            reachCert: row.reachCert,
            sourceLineNo: row.sourceLineNo,
            notes: row.notes,
          });
          if (row.purchaseOrderId) {
            const pref = await prefillFromPo(token, row.purchaseOrderId);
            if (!cancelled) {
              setAvailableLines(pref.availableLines || []);
              setPrefilledFrom(pref.prefilledFrom || []);
            }
          }
        } else {
          const poId = search.get('poId');
          if (poId) {
            await loadPrefill(poId);
          } else {
            setForm(emptySupplierEntry());
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load form');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id, isNew]);

  const computedTotal = useMemo(() => {
    return Number(
      (Number(form.totalQuantity || 0) * Number(form.unitValue || 0)).toFixed(4),
    );
  }, [form.totalQuantity, form.unitValue]);

  useEffect(() => {
    setForm((prev) => {
      if (Math.abs(Number(prev.totalValue || 0) - computedTotal) < 0.0001) return prev;
      return { ...prev, totalValue: computedTotal };
    });
  }, [computedTotal]);

  function isAuto(field: string) {
    return prefilledFrom.includes(field);
  }

  async function onSelectPo(poId: string) {
    if (!poId) {
      setForm(emptySupplierEntry());
      setAvailableLines([]);
      setPrefilledFrom([]);
      setInfo(null);
      return;
    }
    await loadPrefill(poId);
  }

  async function onSelectLine(lineNo: number) {
    if (!form.purchaseOrderId) return;
    await loadPrefill(form.purchaseOrderId, lineNo);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const payload: SupplierEntryInput = {
        ...form,
        purchaseOrderNo: form.purchaseOrderNo.trim(),
        totalValue: computedTotal,
        ppcDemandDate: form.ppcDemandDate || null,
      };
      if (!payload.purchaseOrderNo) throw new Error('Purchase Order No is required');
      const saved = isNew
        ? await createSupplierEntry(token, payload)
        : await updateSupplierEntry(token, id!, payload);
      setInfo(
        `Supplier entry saved for PO ${saved.purchaseOrderNo}. Posted to Supplier Master automatically.`,
      );
      navigate(`/supplier-entries/${saved.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="page">
        <p className="muted">Loading supplier entry…</p>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">SUPPLIER DATA ENTRY FORM (1)</p>
          <h1>{isNew ? 'New Supplier Entry' : `Entry · ${form.purchaseOrderNo}`}</h1>
          <p className="muted">
            Step 2 of the Excel flow. Auto-filled values come from the selected Purchase Order.
          </p>
        </div>
        <div className="page-actions">
          <Link className="ghost-btn solid" to="/supplier-entries">
            Back to list
          </Link>
          {!isNew && id ? (
            <Link className="ghost-btn solid" to="/supplier-master">
              Open Supplier Master
            </Link>
          ) : null}
          <button className="primary-btn compact" type="submit" form="supplier-form" disabled={saving}>
            {saving ? 'Saving…' : 'Save Entry'}
          </button>
        </div>
      </div>

      {error ? <div className="alert">{error}</div> : null}
      {info ? <div className="alert ok">{info}</div> : null}

      <form id="supplier-form" className="po-document supplier-form" onSubmit={onSubmit}>
        <div className="po-title-bar">SUPPLIER DATA ENTRY FORM</div>

        <section className="sf-section">
          <div className="sf-section-title">Link Purchase Order (Step 1)</div>
          <div className="sf-grid cols-2">
            <Field label="Select existing PO">
              <ThemeSelect
                value={form.purchaseOrderId || ''}
                placeholder="— Select PO to auto-fill —"
                onChange={(v) => onSelectPo(v)}
                options={pos.map((po) => ({
                  value: po.id,
                  label: `${po.poNumber} · ${String(po.poDate).slice(0, 10)} · ${po.shipperName || 'No shipper'}`,
                }))}
              />
            </Field>
            <Field label="PO line (if multiple items)">
              <ThemeSelect
                value={form.sourceLineNo != null ? String(form.sourceLineNo) : ''}
                placeholder="— Choose line —"
                disabled={!form.purchaseOrderId || availableLines.length === 0}
                onChange={(v) => {
                  const n = Number(v);
                  if (n) onSelectLine(n);
                }}
                options={availableLines.map((l) => ({
                  value: String(l.lineNo),
                  label: `#${l.lineNo} ${l.itemCode || 'Item'} — ${l.description || 'No description'}`,
                }))}
              />
            </Field>
          </div>
          <p className="muted small sf-tip">
            Tip: from a Purchase Order screen you can also click <strong>Continue to Supplier Entry</strong>.
          </p>
        </section>

        <section className="sf-section">
          <div className="sf-section-title">Order &amp; Shipper</div>
          <div className="sf-grid cols-2">
            <Field label="Purchase Order No" auto={isAuto('purchaseOrderNo')}>
              <input
                required
                value={form.purchaseOrderNo}
                onChange={(e) => setField('purchaseOrderNo', e.target.value)}
              />
            </Field>
            <Field label="Date" auto={isAuto('entryDate')}>
              <ThemeDateField
                required
                value={form.entryDate}
                onChange={(v) => setField('entryDate', v)}
              />
            </Field>
            <Field label="PPC Demand No.">
              <input
                value={form.ppcDemandNo}
                onChange={(e) => setField('ppcDemandNo', e.target.value)}
                placeholder="Manual entry"
              />
            </Field>
            <Field label="PPC Demand Date">
              <ThemeDateField
                value={form.ppcDemandDate || ''}
                onChange={(v) => setField('ppcDemandDate', v || null)}
              />
            </Field>
            <Field label="Shipper Name" auto={isAuto('shipperName')}>
              <input
                value={form.shipperName}
                onChange={(e) => setField('shipperName', e.target.value)}
              />
            </Field>
            <Field label="Division">
              <ThemeSelect
                value={form.division}
                placeholder="Garments / Gloves / …"
                onChange={(v) => setField('division', v)}
                options={divisionOpts}
              />
            </Field>
          </div>
        </section>

        <section className="sf-section">
          <div className="sf-section-title">Categories</div>
          <div className="sf-grid cols-3">
            <Field label="Supplier Category">
              <ThemeSelect
                value={form.supplierCategory}
                placeholder="Select…"
                onChange={(v) => setField('supplierCategory', v)}
                options={supplierCategoryOpts}
              />
            </Field>
            <Field label="Product Category">
              <ThemeSelect
                value={form.productCategory}
                placeholder="Select…"
                onChange={(v) => setField('productCategory', v)}
                options={productCategoryOpts}
              />
            </Field>
            <Field label="Tolerance" auto={isAuto('tolerance')}>
              <ThemeSelect
                value={form.tolerance}
                onChange={(v) => setField('tolerance', v)}
                options={toleranceOpts}
              />
            </Field>
          </div>
        </section>

        <section className="sf-section">
          <div className="sf-section-title">Product &amp; Contact</div>
          <div className="sf-grid cols-2">
            <Field label="Product Item Code" auto={isAuto('productItemCode')}>
              <input
                value={form.productItemCode}
                onChange={(e) => setField('productItemCode', e.target.value)}
              />
            </Field>
            <Field label="Shipper Address" auto={isAuto('shipperAddress')}>
              <input
                value={form.shipperAddress}
                onChange={(e) => setField('shipperAddress', e.target.value)}
              />
            </Field>
            <Field label="Country">
              <input
                value={form.country}
                onChange={(e) => setField('country', e.target.value)}
                placeholder="Supplier country (manual)"
              />
            </Field>
            <Field label="Shipper Email">
              <input
                type="email"
                value={form.shipperEmail}
                onChange={(e) => setField('shipperEmail', e.target.value)}
              />
            </Field>
            <Field label="Contact No" auto={isAuto('contactNo')}>
              <input
                value={form.contactNo}
                onChange={(e) => setField('contactNo', e.target.value)}
              />
            </Field>
            <Field label="Website Name">
              <input
                value={form.websiteName}
                onChange={(e) => setField('websiteName', e.target.value)}
              />
            </Field>
            <Field label="Product Description" auto={isAuto('productDescription')}>
              <input
                value={form.productDescription}
                onChange={(e) => setField('productDescription', e.target.value)}
              />
            </Field>
            <Field label="Country of Origin" auto={isAuto('countryOfOrigin')}>
              <input
                value={form.countryOfOrigin}
                onChange={(e) => setField('countryOfOrigin', e.target.value)}
              />
            </Field>
            <Field label="Product HS Code" auto={isAuto('productHsCode')}>
              <input
                value={form.productHsCode}
                onChange={(e) => setField('productHsCode', e.target.value)}
              />
            </Field>
          </div>
        </section>

        <section className="sf-section">
          <div className="sf-section-title">Values &amp; Logistics</div>
          <div className="sf-grid cols-3">
            <Field label="Unit Value" auto={isAuto('unitValue')}>
              <input
                type="number"
                min={0}
                step="any"
                value={form.unitValue}
                onChange={(e) => setField('unitValue', Number(e.target.value || 0))}
              />
            </Field>
            <Field label="Total Quantity" auto={isAuto('totalQuantity')}>
              <input
                type="number"
                min={0}
                step="any"
                value={form.totalQuantity}
                onChange={(e) => setField('totalQuantity', Number(e.target.value || 0))}
              />
            </Field>
            <Field label="Total Value" auto={isAuto('totalValue')}>
              <input type="number" readOnly value={computedTotal} />
            </Field>
            <Field label="Lead Time (days)">
              <input
                type="number"
                min={0}
                value={form.leadTimeDays ?? ''}
                onChange={(e) =>
                  setField(
                    'leadTimeDays',
                    e.target.value === '' ? null : Number(e.target.value),
                  )
                }
                placeholder="Manual"
              />
            </Field>
            <Field label="Port of loading">
              <input
                value={form.portOfLoading}
                onChange={(e) => setField('portOfLoading', e.target.value)}
                placeholder="Manual"
              />
            </Field>
          </div>
        </section>

        <section className="sf-section">
          <div className="sf-section-title">Certifications</div>
          <div className="sf-grid cols-3">
            <Field label="Oekotex Certification">
              <ThemeSelect
                value={form.oekotexCert}
                onChange={(v) =>
                  setField('oekotexCert', v as SupplierEntryInput['oekotexCert'])
                }
                options={certOpts}
              />
            </Field>
            <Field label="ISO Certification">
              <ThemeSelect
                value={form.isoCert}
                onChange={(v) => setField('isoCert', v as SupplierEntryInput['isoCert'])}
                options={certOpts}
              />
            </Field>
            <Field label="Reach Certification">
              <ThemeSelect
                value={form.reachCert}
                onChange={(v) =>
                  setField('reachCert', v as SupplierEntryInput['reachCert'])
                }
                options={certOpts}
              />
            </Field>
          </div>
        </section>

        <section className="sf-section">
          <div className="sf-section-title">Notes</div>
          <Field label="Comments">
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
            />
          </Field>
        </section>

        <div className="legend-row">
          <span className="legend auto">From Purchase Order</span>
          <span className="legend manual">Manual entry</span>
        </div>

        <div className="po-footer-actions">
          <button className="primary-btn" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save Supplier Entry'}
          </button>
        </div>
      </form>
    </main>
  );
}
