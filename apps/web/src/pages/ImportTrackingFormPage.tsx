import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  getImportShipment,
  ImportShipment,
  updateImportShipment,
} from '../api/importShipments';
import ThemeSelect from '../components/ThemeSelect';
import ThemeDateField from '../components/ThemeDateField';

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
        {auto ? <span className="sf-badge">From Master / calc</span> : null}
      </div>
      {children}
    </div>
  );
}

type FormState = {
  division: string;
  merchandiser: string;
  ppcDemandNo: string;
  ppcDemandDate: string;
  purchaseOrderNo: string;
  purchaseOrderDate: string;
  poQuantity: number;
  shipperName: string;
  productDescription: string;
  quantityShipped: number;
  unitValue: number;
  bank: string;
  paymentTerm: string;
  modeOfShipment: string;
  incoterm: string;
  supplierDeliveryTime: number | '';
  standardLeadTime: number;
  ppSampleReadyDate: string;
  actualShipmentReadyDate: string;
  onBoardDate: string;
  etaAtPort: string;
  blAwbNo: string;
  blDate: string;
  pol: string;
  destinationPort: string;
  modeOfClearance: string;
  eouLimitUtilized: string;
  revision1: string;
  revision2: string;
  revision3: string;
  forwarder: string;
  clearingAgent: string;
  docToAgent: string;
  remarks: string;
  category: string;
  delayCause: string;
  qcReportReceivedDate: string;
  qcOrderQty: number;
  qcRejectedQty: number;
  qcLessQty: number;
  qcClaimDate: string;
  qcReportStandardDays: number;
  qcMaterialFinancialLoss: number;
  bankName: string;
  bankTtLcNumber: string;
  bankDate: string;
  bankRoe: number;
  bankChargesAdvance: number;
  bankChargesLcOpening: number;
  bankChargesRetirement: number;
  bankDocsPayment: string;
  bankDocsFromBank: string;
  bankOaAdvanceSettlement: string;
  insuranceCompany: string;
  insuranceBillNo: string;
  insuranceDate: string;
  insuranceAmount: number;
  logisticsBillNo: string;
  logisticsDate: string;
  logisticsWeightCbm: string;
  logisticsAmount: number;
  logisticsBillToFinance: string;
  gdNo: string;
  gdDate: string;
  shipmentClearanceDate: string;
  clearanceBillNo: string;
  clearanceBillDate: string;
  clearanceAmount: number;
};

function fromRow(row: ImportShipment): FormState {
  return {
    division: row.division || '',
    merchandiser: row.merchandiser || '',
    ppcDemandNo: row.ppcDemandNo || '',
    ppcDemandDate: toDateInput(row.ppcDemandDate),
    purchaseOrderNo: row.purchaseOrderNo || '',
    purchaseOrderDate: toDateInput(row.purchaseOrderDate),
    poQuantity: Number(row.poQuantity || 0),
    shipperName: row.shipperName || '',
    productDescription: row.productDescription || '',
    quantityShipped: Number(row.quantityShipped || 0),
    unitValue: Number(row.unitValue || 0),
    bank: row.bank || '',
    paymentTerm: row.paymentTerm || '',
    modeOfShipment: row.modeOfShipment || '',
    incoterm: row.incoterm || '',
    supplierDeliveryTime: row.supplierDeliveryTime ?? '',
    standardLeadTime: Number(row.standardLeadTime || 85),
    ppSampleReadyDate: toDateInput(row.ppSampleReadyDate),
    actualShipmentReadyDate: toDateInput(row.actualShipmentReadyDate),
    onBoardDate: toDateInput(row.onBoardDate),
    etaAtPort: toDateInput(row.etaAtPort),
    blAwbNo: row.blAwbNo || '',
    blDate: toDateInput(row.blDate),
    pol: row.pol || '',
    destinationPort: row.destinationPort || '',
    modeOfClearance: row.modeOfClearance || '',
    eouLimitUtilized: row.eouLimitUtilized || '',
    revision1: toDateInput(row.revision1),
    revision2: toDateInput(row.revision2),
    revision3: toDateInput(row.revision3),
    forwarder: row.forwarder || '',
    clearingAgent: row.clearingAgent || '',
    docToAgent: row.docToAgent || '',
    remarks: row.remarks || '',
    category: row.category || '',
    delayCause: row.delayCause || '',
    qcReportReceivedDate: toDateInput(row.qcReportReceivedDate),
    qcOrderQty: Number(row.qcOrderQty || 0),
    qcRejectedQty: Number(row.qcRejectedQty || 0),
    qcLessQty: Number(row.qcLessQty || 0),
    qcClaimDate: toDateInput(row.qcClaimDate),
    qcReportStandardDays: Number(row.qcReportStandardDays || 10),
    qcMaterialFinancialLoss: Number(row.qcMaterialFinancialLoss || 0),
    bankName: row.bankName || row.bank || '',
    bankTtLcNumber: row.bankTtLcNumber || '',
    bankDate: toDateInput(row.bankDate),
    bankRoe: Number(row.bankRoe || 0),
    bankChargesAdvance: Number(row.bankChargesAdvance || 0),
    bankChargesLcOpening: Number(row.bankChargesLcOpening || 0),
    bankChargesRetirement: Number(row.bankChargesRetirement || 0),
    bankDocsPayment: row.bankDocsPayment || '',
    bankDocsFromBank: toDateInput(row.bankDocsFromBank),
    bankOaAdvanceSettlement: row.bankOaAdvanceSettlement || '',
    insuranceCompany: row.insuranceCompany || '',
    insuranceBillNo: row.insuranceBillNo || '',
    insuranceDate: toDateInput(row.insuranceDate),
    insuranceAmount: Number(row.insuranceAmount || 0),
    logisticsBillNo: row.logisticsBillNo || '',
    logisticsDate: toDateInput(row.logisticsDate),
    logisticsWeightCbm: row.logisticsWeightCbm || '',
    logisticsAmount: Number(row.logisticsAmount || 0),
    logisticsBillToFinance: toDateInput(row.logisticsBillToFinance),
    gdNo: row.gdNo || '',
    gdDate: toDateInput(row.gdDate),
    shipmentClearanceDate: toDateInput(row.shipmentClearanceDate),
    clearanceBillNo: row.clearanceBillNo || '',
    clearanceBillDate: toDateInput(row.clearanceBillDate),
    clearanceAmount: Number(row.clearanceAmount || 0),
  };
}

export default function ImportTrackingFormPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [row, setRow] = useState<ImportShipment | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const isClosed = row?.status === 'CLOSED';

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  useEffect(() => {
    if (!token || !id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getImportShipment(token, id);
        if (cancelled) return;
        setRow(data);
        setForm(fromRow(data));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Load failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !id || !form) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateImportShipment(token, id, {
        ...form,
        ppcDemandDate: form.ppcDemandDate || null,
        purchaseOrderDate: form.purchaseOrderDate || null,
        ppSampleReadyDate: form.ppSampleReadyDate || null,
        actualShipmentReadyDate: form.actualShipmentReadyDate || null,
        onBoardDate: form.onBoardDate || null,
        etaAtPort: form.etaAtPort || null,
        blDate: form.blDate || null,
        revision1: form.revision1 || null,
        revision2: form.revision2 || null,
        revision3: form.revision3 || null,
        qcReportReceivedDate: form.qcReportReceivedDate || null,
        qcClaimDate: form.qcClaimDate || null,
        bankDate: form.bankDate || null,
        bankDocsFromBank: form.bankDocsFromBank || null,
        insuranceDate: form.insuranceDate || null,
        logisticsDate: form.logisticsDate || null,
        logisticsBillToFinance: form.logisticsBillToFinance || null,
        gdDate: form.gdDate || null,
        shipmentClearanceDate: form.shipmentClearanceDate || null,
        clearanceBillDate: form.clearanceBillDate || null,
        supplierDeliveryTime:
          form.supplierDeliveryTime === '' ? null : Number(form.supplierDeliveryTime),
        poQuantity: Number(form.poQuantity),
        quantityShipped: Number(form.quantityShipped),
        unitValue: Number(form.unitValue),
        standardLeadTime: Number(form.standardLeadTime),
        qcOrderQty: Number(form.qcOrderQty),
        qcRejectedQty: Number(form.qcRejectedQty),
        qcLessQty: Number(form.qcLessQty),
        qcReportStandardDays: Number(form.qcReportStandardDays),
        qcMaterialFinancialLoss: Number(form.qcMaterialFinancialLoss),
        bankRoe: Number(form.bankRoe),
        bankChargesAdvance: Number(form.bankChargesAdvance),
        bankChargesLcOpening: Number(form.bankChargesLcOpening),
        bankChargesRetirement: Number(form.bankChargesRetirement),
        insuranceAmount: Number(form.insuranceAmount),
        logisticsAmount: Number(form.logisticsAmount),
        clearanceAmount: Number(form.clearanceAmount),
      });
      setRow(updated);
      setForm(fromRow(updated));
      setInfo(
        isClosed
          ? 'Closed File saved. QC / bank / logistics calculations refreshed.'
          : 'Import Tracking row saved. Calculated columns refreshed.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form) {
    return (
      <main className="page">
        <p className="muted">Loading Import Tracking row…</p>
      </main>
    );
  }

  const totalPreview = Number(
    (Number(form.quantityShipped || 0) * Number(form.unitValue || 0)).toFixed(4),
  );
  const bankChargesPreview = Number(
    (
      Number(form.bankChargesAdvance || 0) +
      Number(form.bankChargesLcOpening || 0) +
      Number(form.bankChargesRetirement || 0)
    ).toFixed(4),
  );
  const backTo = isClosed ? '/closed-files' : '/import-tracking';

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">
            {isClosed ? 'File-B · Current Closed Files 2020' : 'File-B · Current Status 2020'}
          </p>
          <h1>
            {isClosed ? 'Closed' : 'Shipment'} · PO {form.purchaseOrderNo || '—'}
          </h1>
          <p className="muted">
            {isClosed
              ? 'Complete QC, bank, insurance, logistics, and clearance — same groups as the Excel Closed Files sheet.'
              : 'Excel-style fields for open import tracking. Green labels are from Master / formulas.'}
          </p>
        </div>
        <div className="page-actions">
          <Link className="ghost-btn solid" to={backTo}>
            ← Back to sheet
          </Link>
        </div>
      </div>

      {error ? <div className="alert">{error}</div> : null}
      {info ? <div className="alert ok">{info}</div> : null}

      {row ? (
        <div className="its-calc-strip">
          <div>
            <span className="muted small">Month</span>
            <strong>{row.monthLabel || '—'}</strong>
          </div>
          <div>
            <span className="muted small">Elapsed LT</span>
            <strong>{row.elapsedLeadTime ?? '—'}</strong>
          </div>
          <div>
            <span className="muted small">FETA</span>
            <strong>{row.fetaDate ? String(row.fetaDate).slice(0, 10) : '—'}</strong>
          </div>
          <div>
            <span className="muted small">Delay vs std 1–10</span>
            <strong className={row.delayStd1to10 != null ? 'delay-warn' : ''}>
              {row.delayStd1to10 ?? '—'}
            </strong>
          </div>
          <div>
            <span className="muted small">Delay vs std 10–20</span>
            <strong className={row.delayStd10to20 != null ? 'delay-hot' : ''}>
              {row.delayStd10to20 ?? '—'}
            </strong>
          </div>
          <div>
            <span className="muted small">QC days</span>
            <strong>{row.qcReportReceivedDays ?? '—'}</strong>
          </div>
          <div>
            <span className="muted small">Bank charges total</span>
            <strong>{row.bankChargesTotal ?? bankChargesPreview}</strong>
          </div>
          <div>
            <span className="muted small">PO Closed ERP</span>
            <strong>{row.poClosedFromErp ? 'Yes' : 'No'}</strong>
          </div>
        </div>
      ) : null}

      <form className="supplier-form its-form" onSubmit={onSubmit}>
        <section className="sf-section">
          <h2>Identity (from Master)</h2>
          <div className="sf-grid its-grid">
            {isClosed ? (
              <Field label="Category" auto>
                <input
                  value={form.category}
                  onChange={(e) => setField('category', e.target.value)}
                />
              </Field>
            ) : (
              <Field label="Division" auto>
                <input
                  value={form.division}
                  onChange={(e) => setField('division', e.target.value)}
                />
              </Field>
            )}
            <Field label="Merchandiser">
              <input
                value={form.merchandiser}
                onChange={(e) => setField('merchandiser', e.target.value)}
              />
            </Field>
            <Field label="PPC Demand No" auto>
              <input
                value={form.ppcDemandNo}
                onChange={(e) => setField('ppcDemandNo', e.target.value)}
              />
            </Field>
            <Field label="PPC Demand Date" auto>
              <ThemeDateField
                value={form.ppcDemandDate}
                onChange={(v) => setField('ppcDemandDate', v)}
              />
            </Field>
            <Field label="Purchase Order" auto>
              <input
                value={form.purchaseOrderNo}
                onChange={(e) => setField('purchaseOrderNo', e.target.value)}
              />
            </Field>
            <Field label="PO Date" auto>
              <ThemeDateField
                value={form.purchaseOrderDate}
                onChange={(v) => setField('purchaseOrderDate', v)}
              />
            </Field>
            <Field label="P.O Quantity" auto>
              <input
                type="number"
                min={0}
                step="any"
                value={form.poQuantity}
                onChange={(e) => setField('poQuantity', Number(e.target.value))}
              />
            </Field>
            <Field label="Shipper" auto>
              <input
                value={form.shipperName}
                onChange={(e) => setField('shipperName', e.target.value)}
              />
            </Field>
            <Field label="Product Description" auto>
              <input
                value={form.productDescription}
                onChange={(e) => setField('productDescription', e.target.value)}
              />
            </Field>
            <Field label="Unit Value" auto>
              <input
                type="number"
                min={0}
                step="any"
                value={form.unitValue}
                onChange={(e) => setField('unitValue', Number(e.target.value))}
              />
            </Field>
            <Field label="Supplier Delivery time (days)" auto>
              <input
                type="number"
                min={0}
                value={form.supplierDeliveryTime}
                onChange={(e) =>
                  setField(
                    'supplierDeliveryTime',
                    e.target.value === '' ? '' : Number(e.target.value),
                  )
                }
              />
            </Field>
            <Field label="POL" auto>
              <input value={form.pol} onChange={(e) => setField('pol', e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="sf-section">
          <h2>Shipment & commercial</h2>
          <div className="sf-grid its-grid">
            <Field label="Quantity shipped">
              <input
                type="number"
                min={0}
                step="any"
                value={form.quantityShipped}
                onChange={(e) => setField('quantityShipped', Number(e.target.value))}
              />
            </Field>
            <Field label="Total Amount" auto>
              <input value={totalPreview} readOnly />
            </Field>
            <Field label="Bank">
              <input value={form.bank} onChange={(e) => setField('bank', e.target.value)} />
            </Field>
            <Field label="Payment Term">
              <ThemeSelect
                value={form.paymentTerm}
                onChange={(v) => setField('paymentTerm', v)}
                options={[
                  { value: '', label: '—' },
                  { value: 'LC', label: 'LC' },
                  { value: 'ADV', label: 'ADV' },
                  { value: 'O/A', label: 'O/A' },
                  { value: 'DA', label: 'DA' },
                  { value: 'DP', label: 'DP' },
                ]}
              />
            </Field>
            <Field label="Mode of Shipment">
              <ThemeSelect
                value={form.modeOfShipment}
                onChange={(v) => setField('modeOfShipment', v)}
                options={[
                  { value: '', label: '—' },
                  { value: 'SEA', label: 'SEA' },
                  { value: 'AIR', label: 'AIR' },
                  { value: 'COURIER', label: 'COURIER' },
                ]}
              />
            </Field>
            <Field label="Incoterm">
              <ThemeSelect
                value={form.incoterm}
                onChange={(v) => setField('incoterm', v)}
                options={[
                  { value: '', label: '—' },
                  { value: 'FOB', label: 'FOB' },
                  { value: 'CNF', label: 'CNF' },
                  { value: 'CIF', label: 'CIF' },
                  { value: 'EXW', label: 'EXW' },
                ]}
              />
            </Field>
            <Field label="Standard Lead Time">
              <input
                type="number"
                min={0}
                value={form.standardLeadTime}
                onChange={(e) => setField('standardLeadTime', Number(e.target.value))}
              />
            </Field>
            <Field label="Actual Shipment Ready Date">
              <ThemeDateField
                value={form.actualShipmentReadyDate}
                onChange={(v) => setField('actualShipmentReadyDate', v)}
              />
            </Field>
            <Field label="PP Sample Readiness Date">
              <ThemeDateField
                value={form.ppSampleReadyDate}
                onChange={(v) => setField('ppSampleReadyDate', v)}
              />
            </Field>
            <Field label="On Board">
              <ThemeDateField
                value={form.onBoardDate}
                onChange={(v) => setField('onBoardDate', v)}
              />
            </Field>
            <Field label="ETA At port">
              <ThemeDateField
                value={form.etaAtPort}
                onChange={(v) => setField('etaAtPort', v)}
              />
            </Field>
            <Field label="B/L / AWB #">
              <input value={form.blAwbNo} onChange={(e) => setField('blAwbNo', e.target.value)} />
            </Field>
            <Field label="BL Date">
              <ThemeDateField value={form.blDate} onChange={(v) => setField('blDate', v)} />
            </Field>
            <Field label="Destination port">
              <input
                value={form.destinationPort}
                onChange={(e) => setField('destinationPort', e.target.value)}
              />
            </Field>
            <Field label="Mode of Clearance">
              <input
                value={form.modeOfClearance}
                onChange={(e) => setField('modeOfClearance', e.target.value)}
              />
            </Field>
            <Field label="EOU LIMIT UTILIZED">
              <input
                value={form.eouLimitUtilized}
                onChange={(e) => setField('eouLimitUtilized', e.target.value)}
              />
            </Field>
            <Field label="Forwarder">
              <input
                value={form.forwarder}
                onChange={(e) => setField('forwarder', e.target.value)}
              />
            </Field>
            <Field label="C/A (Clearing Agent)">
              <input
                value={form.clearingAgent}
                onChange={(e) => setField('clearingAgent', e.target.value)}
              />
            </Field>
            <Field label="Doc to Agent">
              <input
                value={form.docToAgent}
                onChange={(e) => setField('docToAgent', e.target.value)}
              />
            </Field>
            <Field label="Remarks">
              <input value={form.remarks} onChange={(e) => setField('remarks', e.target.value)} />
            </Field>
          </div>
        </section>

        {isClosed ? (
          <>
            <section className="sf-section">
              <h2>Delay / Standard Lead Time + QC</h2>
              <div className="sf-grid its-grid">
                <Field label="Delay Cause">
                  <input
                    value={form.delayCause}
                    onChange={(e) => setField('delayCause', e.target.value)}
                  />
                </Field>
                <Field label="QC Report Received Date">
                  <ThemeDateField
                    value={form.qcReportReceivedDate}
                    onChange={(v) => setField('qcReportReceivedDate', v)}
                  />
                </Field>
                <Field label="Order Qty">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={form.qcOrderQty}
                    onChange={(e) => setField('qcOrderQty', Number(e.target.value))}
                  />
                </Field>
                <Field label="Rejected Qty">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={form.qcRejectedQty}
                    onChange={(e) => setField('qcRejectedQty', Number(e.target.value))}
                  />
                </Field>
                <Field label="Less Qty">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={form.qcLessQty}
                    onChange={(e) => setField('qcLessQty', Number(e.target.value))}
                  />
                </Field>
                <Field label="Claim Date">
                  <ThemeDateField
                    value={form.qcClaimDate}
                    onChange={(v) => setField('qcClaimDate', v)}
                  />
                </Field>
                <Field label="Q.C Report standard Time / Days">
                  <input
                    type="number"
                    min={0}
                    value={form.qcReportStandardDays}
                    onChange={(e) => setField('qcReportStandardDays', Number(e.target.value))}
                  />
                </Field>
                <Field label="Material financial loss @ Q.C">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={form.qcMaterialFinancialLoss}
                    onChange={(e) =>
                      setField('qcMaterialFinancialLoss', Number(e.target.value))
                    }
                  />
                </Field>
              </div>
            </section>

            <section className="sf-section">
              <h2>Bank</h2>
              <div className="sf-grid its-grid">
                <Field label="Bank Name">
                  <input
                    value={form.bankName}
                    onChange={(e) => setField('bankName', e.target.value)}
                  />
                </Field>
                <Field label="TT or LC Number">
                  <input
                    value={form.bankTtLcNumber}
                    onChange={(e) => setField('bankTtLcNumber', e.target.value)}
                  />
                </Field>
                <Field label="Bank Date">
                  <ThemeDateField
                    value={form.bankDate}
                    onChange={(v) => setField('bankDate', v)}
                  />
                </Field>
                <Field label="R.O.E">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={form.bankRoe}
                    onChange={(e) => setField('bankRoe', Number(e.target.value))}
                  />
                </Field>
                <Field label="Bank charges @ Advance">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={form.bankChargesAdvance}
                    onChange={(e) => setField('bankChargesAdvance', Number(e.target.value))}
                  />
                </Field>
                <Field label="Bank charges @ LC opening">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={form.bankChargesLcOpening}
                    onChange={(e) => setField('bankChargesLcOpening', Number(e.target.value))}
                  />
                </Field>
                <Field label="Bank charges @ LC/DP retirement">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={form.bankChargesRetirement}
                    onChange={(e) => setField('bankChargesRetirement', Number(e.target.value))}
                  />
                </Field>
                <Field label="Total bank charges" auto>
                  <input value={bankChargesPreview} readOnly />
                </Field>
                <Field label="Documents payment (LC/DP/TT)">
                  <input
                    value={form.bankDocsPayment}
                    onChange={(e) => setField('bankDocsPayment', e.target.value)}
                  />
                </Field>
                <Field label="Documents from Bank">
                  <ThemeDateField
                    value={form.bankDocsFromBank}
                    onChange={(v) => setField('bankDocsFromBank', v)}
                  />
                </Field>
                <Field label="OA / Advance settlement">
                  <input
                    value={form.bankOaAdvanceSettlement}
                    onChange={(e) => setField('bankOaAdvanceSettlement', e.target.value)}
                  />
                </Field>
              </div>
            </section>

            <section className="sf-section">
              <h2>Insurance · Logistics · Clearance</h2>
              <div className="sf-grid its-grid">
                <Field label="Insurance company">
                  <input
                    value={form.insuranceCompany}
                    onChange={(e) => setField('insuranceCompany', e.target.value)}
                  />
                </Field>
                <Field label="Insurance Bill No">
                  <input
                    value={form.insuranceBillNo}
                    onChange={(e) => setField('insuranceBillNo', e.target.value)}
                  />
                </Field>
                <Field label="Insurance Date">
                  <ThemeDateField
                    value={form.insuranceDate}
                    onChange={(v) => setField('insuranceDate', v)}
                  />
                </Field>
                <Field label="Insurance Amount">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={form.insuranceAmount}
                    onChange={(e) => setField('insuranceAmount', Number(e.target.value))}
                  />
                </Field>
                <Field label="Logistics Bill No">
                  <input
                    value={form.logisticsBillNo}
                    onChange={(e) => setField('logisticsBillNo', e.target.value)}
                  />
                </Field>
                <Field label="Logistics Date">
                  <ThemeDateField
                    value={form.logisticsDate}
                    onChange={(v) => setField('logisticsDate', v)}
                  />
                </Field>
                <Field label="Weight/CBM">
                  <input
                    value={form.logisticsWeightCbm}
                    onChange={(e) => setField('logisticsWeightCbm', e.target.value)}
                  />
                </Field>
                <Field label="Logistics Amount">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={form.logisticsAmount}
                    onChange={(e) => setField('logisticsAmount', Number(e.target.value))}
                  />
                </Field>
                <Field label="Bill to Finance">
                  <ThemeDateField
                    value={form.logisticsBillToFinance}
                    onChange={(v) => setField('logisticsBillToFinance', v)}
                  />
                </Field>
                <Field label="G.D No">
                  <input value={form.gdNo} onChange={(e) => setField('gdNo', e.target.value)} />
                </Field>
                <Field label="G.D Date">
                  <ThemeDateField value={form.gdDate} onChange={(v) => setField('gdDate', v)} />
                </Field>
                <Field label="Shipment Clearance Date">
                  <ThemeDateField
                    value={form.shipmentClearanceDate}
                    onChange={(v) => setField('shipmentClearanceDate', v)}
                  />
                </Field>
                <Field label="Clearance Bill No">
                  <input
                    value={form.clearanceBillNo}
                    onChange={(e) => setField('clearanceBillNo', e.target.value)}
                  />
                </Field>
                <Field label="Clearance Bill Date">
                  <ThemeDateField
                    value={form.clearanceBillDate}
                    onChange={(v) => setField('clearanceBillDate', v)}
                  />
                </Field>
                <Field label="Clearance Amount">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={form.clearanceAmount}
                    onChange={(e) => setField('clearanceAmount', Number(e.target.value))}
                  />
                </Field>
              </div>
            </section>
          </>
        ) : (
          <section className="sf-section">
            <h2>Factory arrival revisions</h2>
            <div className="sf-grid its-grid">
              <Field label="1st Revision">
                <ThemeDateField
                  value={form.revision1}
                  onChange={(v) => setField('revision1', v)}
                />
              </Field>
              <Field label="2nd Revision">
                <ThemeDateField
                  value={form.revision2}
                  onChange={(v) => setField('revision2', v)}
                />
              </Field>
              <Field label="3rd Revision">
                <ThemeDateField
                  value={form.revision3}
                  onChange={(v) => setField('revision3', v)}
                />
              </Field>
            </div>
          </section>
        )}

        <div className="sf-actions">
          <button type="submit" className="primary-btn" disabled={saving}>
            {saving ? 'Saving…' : isClosed ? 'Save Closed File' : 'Save Import Tracking'}
          </button>
          <button type="button" className="ghost-btn solid" onClick={() => navigate(backTo)}>
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}
