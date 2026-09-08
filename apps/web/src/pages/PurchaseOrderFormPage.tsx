import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  createPurchaseOrder,
  downloadPurchaseOrderPdf,
  emptyPoForm,
  getPurchaseOrder,
  PurchaseOrderInput,
  updatePurchaseOrder,
} from '../api/purchaseOrders';
import ThemeSelect from '../components/ThemeSelect';
import ThemeDateField from '../components/ThemeDateField';

type LineState = {
  itemCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

function toInputDate(value: string) {
  if (!value) return new Date().toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export default function PurchaseOrderFormPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<PurchaseOrderInput>(() => emptyPoForm(user));
  const [lines, setLines] = useState<LineState[]>(() => emptyPoForm(user).lines);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (isNew) {
      const blank = emptyPoForm(user);
      setForm(blank);
      setLines(blank.lines);
      setLoading(false);
      return;
    }
    if (!token || !id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const po = await getPurchaseOrder(token, id);
        if (cancelled) return;
        setForm({
          poNumber: po.poNumber,
          poDate: toInputDate(po.poDate),
          status: po.status,
          companyName: po.companyName,
          companyStreet: po.companyStreet,
          companyCity: po.companyCity,
          companyPhone: po.companyPhone,
          companyFax: po.companyFax,
          companyWebsite: po.companyWebsite,
          beneficiaryName: po.beneficiaryName,
          beneficiaryContact: po.beneficiaryContact,
          beneficiaryStreet: po.beneficiaryStreet,
          beneficiaryCity: po.beneficiaryCity,
          beneficiaryPhone: po.beneficiaryPhone,
          beneficiaryFax: po.beneficiaryFax,
          shipperName: po.shipperName,
          shipperContact: po.shipperContact,
          shipperStreet: po.shipperStreet,
          shipperCity: po.shipperCity,
          shipperPhone: po.shipperPhone,
          shipperFax: po.shipperFax,
          consigneeName: po.consigneeName,
          consigneeCompany: po.consigneeCompany,
          consigneeStreet: po.consigneeStreet,
          consigneeCity: po.consigneeCity,
          consigneePhone: po.consigneePhone,
          originOfGoods: po.originOfGoods,
          shipVia: po.shipVia,
          hsCode: po.hsCode,
          incoterms: po.incoterms,
          tolerance: po.tolerance,
          currency: po.currency,
          comments: po.comments,
          contactFooter: po.contactFooter,
          lines: [],
        });
        const mapped = po.lines.map((l) => ({
          itemCode: l.itemCode,
          description: l.description,
          quantity: Number(l.quantity || 0),
          unitPrice: Number(l.unitPrice || 0),
        }));
        while (mapped.length < 6) {
          mapped.push({ itemCode: '', description: '', quantity: 0, unitPrice: 0 });
        }
        setLines(mapped);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load PO');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isNew, token, user]);

  const lineTotals = useMemo(
    () => lines.map((l) => Number((Number(l.quantity || 0) * Number(l.unitPrice || 0)).toFixed(4))),
    [lines],
  );
  const grandTotal = useMemo(
    () => Number(lineTotals.reduce((s, n) => s + n, 0).toFixed(4)),
    [lineTotals],
  );

  function setField<K extends keyof PurchaseOrderInput>(key: K, value: PurchaseOrderInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateLine(index: number, patch: Partial<LineState>) {
    setLines((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addLine() {
    setLines((prev) => [...prev, { itemCode: '', description: '', quantity: 0, unitPrice: 0 }]);
  }

  function removeLine(index: number) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    setSavedMsg(null);
    try {
      const payload: PurchaseOrderInput = {
        ...form,
        poNumber: form.poNumber.trim(),
        status: 'SAVED',
        lines,
      };
      if (!payload.poNumber) throw new Error('PO # is required');
      const saved = isNew
        ? await createPurchaseOrder(token, payload)
        : await updatePurchaseOrder(token, id!, payload);
      setSavedMsg(`Purchase order ${saved.poNumber} saved`);
      navigate(`/purchase-orders/${saved.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="page">
        <p className="muted">Loading purchase order…</p>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">PURCHASE ORDER FORMAT</p>
          <h1>{isNew ? 'New Purchase Order' : `PO ${form.poNumber}`}</h1>
          <p className="muted">Layout mirrors the Excel purchase order sheet for familiar data entry.</p>
        </div>
        <div className="page-actions">
          <Link className="ghost-btn solid" to="/purchase-orders">
            Back to list
          </Link>
          {!isNew && id ? (
            <>
              <button
                type="button"
                className="ghost-btn solid"
                disabled={printing}
                onClick={async () => {
                  if (!token || !id) return;
                  setPrinting(true);
                  setError(null);
                  try {
                    await downloadPurchaseOrderPdf(token, id, form.poNumber);
                    setSavedMsg(`PDF downloaded for PO ${form.poNumber}`);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'PDF failed');
                  } finally {
                    setPrinting(false);
                  }
                }}
              >
                {printing ? 'Printing…' : 'Print PDF'}
              </button>
              <Link className="ghost-btn solid" to={`/supplier-entries/new?poId=${id}`}>
                Continue to Supplier Entry
              </Link>
            </>
          ) : null}
          <button className="primary-btn compact" type="submit" form="po-form" disabled={saving}>
            {saving ? 'Saving…' : 'Save Purchase Order'}
          </button>
        </div>
      </div>

      {error ? <div className="alert">{error}</div> : null}
      {savedMsg ? <div className="alert ok">{savedMsg}</div> : null}

      <form id="po-form" className="po-document" onSubmit={onSubmit}>
        <div className="po-title-bar">PURCHASE ORDER</div>

        <div className="po-grid header-grid">
          <section className="po-block">
            <label>
              Company Name
              <input
                value={form.companyName}
                onChange={(e) => setField('companyName', e.target.value)}
                placeholder="[Company Name]"
              />
            </label>
            <label>
              Street Address
              <input
                value={form.companyStreet}
                onChange={(e) => setField('companyStreet', e.target.value)}
              />
            </label>
            <label>
              City, ST ZIP
              <input
                value={form.companyCity}
                onChange={(e) => setField('companyCity', e.target.value)}
              />
            </label>
            <div className="po-inline">
              <label>
                Phone
                <input
                  value={form.companyPhone}
                  onChange={(e) => setField('companyPhone', e.target.value)}
                />
              </label>
              <label>
                Fax
                <input
                  value={form.companyFax}
                  onChange={(e) => setField('companyFax', e.target.value)}
                />
              </label>
            </div>
            <label>
              Website
              <input
                value={form.companyWebsite}
                onChange={(e) => setField('companyWebsite', e.target.value)}
              />
            </label>
          </section>

          <section className="po-block meta-block">
            <label>
              DATE
              <ThemeDateField
                required
                value={form.poDate}
                onChange={(v) => setField('poDate', v)}
              />
            </label>
            <label>
              PO #
              <input
                required
                value={form.poNumber}
                onChange={(e) => setField('poNumber', e.target.value)}
                placeholder="e.g. D21-3010-01"
              />
            </label>
            <div className="po-subtitle">Beneficiary</div>
            <label>
              Company Name
              <input
                value={form.beneficiaryName}
                onChange={(e) => setField('beneficiaryName', e.target.value)}
              />
            </label>
            <label>
              Contact / Department
              <input
                value={form.beneficiaryContact}
                onChange={(e) => setField('beneficiaryContact', e.target.value)}
              />
            </label>
            <label>
              Street Address
              <input
                value={form.beneficiaryStreet}
                onChange={(e) => setField('beneficiaryStreet', e.target.value)}
              />
            </label>
            <label>
              City, ST ZIP
              <input
                value={form.beneficiaryCity}
                onChange={(e) => setField('beneficiaryCity', e.target.value)}
              />
            </label>
            <div className="po-inline">
              <label>
                Phone
                <input
                  value={form.beneficiaryPhone}
                  onChange={(e) => setField('beneficiaryPhone', e.target.value)}
                />
              </label>
              <label>
                Fax
                <input
                  value={form.beneficiaryFax}
                  onChange={(e) => setField('beneficiaryFax', e.target.value)}
                />
              </label>
            </div>
          </section>
        </div>

        <div className="po-grid parties-grid">
          <section className="po-block">
            <div className="po-subtitle">Shipper</div>
            <label>
              Company Name
              <input
                value={form.shipperName}
                onChange={(e) => setField('shipperName', e.target.value)}
              />
            </label>
            <label>
              Contact / Department
              <input
                value={form.shipperContact}
                onChange={(e) => setField('shipperContact', e.target.value)}
              />
            </label>
            <label>
              Street Address
              <input
                value={form.shipperStreet}
                onChange={(e) => setField('shipperStreet', e.target.value)}
              />
            </label>
            <label>
              City, ST ZIP
              <input
                value={form.shipperCity}
                onChange={(e) => setField('shipperCity', e.target.value)}
              />
            </label>
            <div className="po-inline">
              <label>
                Phone
                <input
                  value={form.shipperPhone}
                  onChange={(e) => setField('shipperPhone', e.target.value)}
                />
              </label>
              <label>
                Fax
                <input
                  value={form.shipperFax}
                  onChange={(e) => setField('shipperFax', e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="po-block">
            <div className="po-subtitle">Consignee</div>
            <label>
              Name
              <input
                value={form.consigneeName}
                onChange={(e) => setField('consigneeName', e.target.value)}
              />
            </label>
            <label>
              Company Name
              <input
                value={form.consigneeCompany}
                onChange={(e) => setField('consigneeCompany', e.target.value)}
              />
            </label>
            <label>
              Street Address
              <input
                value={form.consigneeStreet}
                onChange={(e) => setField('consigneeStreet', e.target.value)}
              />
            </label>
            <label>
              City, ST ZIP
              <input
                value={form.consigneeCity}
                onChange={(e) => setField('consigneeCity', e.target.value)}
              />
            </label>
            <label>
              Phone
              <input
                value={form.consigneePhone}
                onChange={(e) => setField('consigneePhone', e.target.value)}
              />
            </label>
          </section>
        </div>

        <div className="po-terms">
          <label>
            Origin of Goods
            <input
              value={form.originOfGoods}
              onChange={(e) => setField('originOfGoods', e.target.value)}
              placeholder="China"
            />
          </label>
          <label>
            SHIP VIA
            <ThemeSelect
              value={form.shipVia}
              onChange={(v) => setField('shipVia', v)}
              options={[
                { value: 'By Air', label: 'By Air' },
                { value: 'By Sea', label: 'By Sea' },
                { value: 'By Express', label: 'By Express' },
                { value: 'By Courier', label: 'By Courier' },
              ]}
            />
          </label>
          <label>
            HS Code
            <input
              value={form.hsCode}
              onChange={(e) => setField('hsCode', e.target.value)}
            />
          </label>
          <label>
            Incoterms
            <ThemeSelect
              value={form.incoterms}
              onChange={(v) => setField('incoterms', v)}
              options={[
                { value: 'FOB', label: 'FOB' },
                { value: 'CNF', label: 'CNF' },
                { value: 'CIF', label: 'CIF' },
                { value: 'EXW', label: 'EXW' },
                { value: 'DDP', label: 'DDP' },
              ]}
            />
          </label>
          <label>
            Tolerance
            <ThemeSelect
              value={form.tolerance}
              onChange={(v) => setField('tolerance', v)}
              options={[
                { value: '5%', label: '5%' },
                { value: '7%', label: '7%' },
                { value: '10%', label: '10%' },
                { value: '5%, +/-', label: '5%, +/-' },
              ]}
            />
          </label>
          <label>
            Currency
            <ThemeSelect
              value={form.currency}
              onChange={(v) => setField('currency', v)}
              options={[
                { value: 'USD', label: 'USD' },
                { value: 'EUR', label: 'EUR' },
                { value: 'GBP', label: 'GBP' },
                { value: 'CNY', label: 'CNY' },
                { value: 'JPY', label: 'JPY' },
                { value: 'PKR', label: 'PKR' },
              ]}
            />
          </label>
        </div>

        <div className="excel-sheet-wrap po-lines-wrap">
          <table className="excel-sheet po-lines">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th style={{ width: '18%' }}>ITEM #</th>
                <th>DESCRIPTION</th>
                <th style={{ width: '12%' }}>Qty</th>
                <th style={{ width: '14%' }}>UNIT PRICE</th>
                <th style={{ width: '14%' }}>TOTAL</th>
                <th style={{ width: 56 }} />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>
                    <input
                      value={line.itemCode}
                      onChange={(e) => updateLine(index, { itemCode: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      value={line.description}
                      onChange={(e) => updateLine(index, { description: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(index, { quantity: Number(e.target.value || 0) })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={line.unitPrice}
                      onChange={(e) =>
                        updateLine(index, { unitPrice: Number(e.target.value || 0) })
                      }
                    />
                  </td>
                  <td className="num">
                    {lineTotals[index].toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="ghost-btn tiny"
                      onClick={() => removeLine(index)}
                      title="Remove line"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="total-row">
                <td colSpan={4} />
                <td className="num">
                  <strong>TOTAL</strong>
                </td>
                <td className="num">
                  <strong>
                    {grandTotal.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    {form.currency}
                  </strong>
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        <div className="po-line-actions">
          <button type="button" className="ghost-btn solid" onClick={addLine}>
            + Add line
          </button>
        </div>

        <label className="po-comments">
          Comments or Special Instructions
          <textarea
            rows={3}
            value={form.comments}
            onChange={(e) => setField('comments', e.target.value)}
          />
        </label>

        <label className="po-comments">
          Contact for questions
          <input
            value={form.contactFooter}
            onChange={(e) => setField('contactFooter', e.target.value)}
            placeholder="[Name, Phone #, E-mail]"
          />
        </label>

        <div className="po-footer-actions">
          <button className="primary-btn" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save Purchase Order'}
          </button>
        </div>
      </form>
    </main>
  );
}
