const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001';

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.message)) return data.message.join(', ');
    return 'Request failed';
  } catch {
    return 'Request failed';
  }
}

async function api<T>(path: string, token: string) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as T;
}

export type HistoryFilters = {
  q?: string;
  supplier?: string;
  category?: string;
  from?: string;
  to?: string;
};

function qs(filters: HistoryFilters) {
  const p = new URLSearchParams();
  if (filters.q) p.set('q', filters.q);
  if (filters.supplier) p.set('supplier', filters.supplier);
  if (filters.category) p.set('category', filters.category);
  if (filters.from) p.set('from', filters.from);
  if (filters.to) p.set('to', filters.to);
  const s = p.toString();
  return s ? `?${s}` : '';
}

export type PurchaseHistoryRow = {
  srNo: number;
  category: string;
  hsCode: string;
  month: string;
  productItemCode: string;
  purchaseOrderNo: string;
  poDate: string;
  supplier: string;
  description: string;
  countryOfOrigin: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  paymentBankRef: string;
  modeOfShipment: string;
  priceTerm: string;
  roe: number;
  valueInPkr: number;
  itsStatus: 'OPEN' | 'CLOSED' | null;
  masterId: string;
  shipmentId: string | null;
};

export type PaymentHistoryRow = {
  srNo: number;
  purchaseOrderNo: string;
  poDate: string;
  supplier: string;
  amount: number;
  paymentBankRef: string;
  paymentTerm: string;
  roe: number;
  valueInPkr: number;
  modeOfShipment: string;
  priceTerm: string;
  itsStatus: 'OPEN' | 'CLOSED' | null;
  shipmentId: string | null;
  masterId: string;
};

export type OperationalHistoryRow = {
  srNo: number;
  purchaseOrderNo: string;
  poDate: string;
  ppcDemandDate: string | null;
  supplier: string;
  quantity: number;
  leadTimeDays: number | null;
  supplierDeliveryDate: string | null;
  actualShipmentReadyDate: string | null;
  ppSampleReadyDate: string | null;
  revision1: string | null;
  revision2: string | null;
  delayAgainstSupplier: number | null;
  delay1to10: number | null;
  delay10to20: number | null;
  modeOfShipment: string;
  liftedByAirDueToDelay: boolean;
  itsStatus: 'OPEN' | 'CLOSED' | null;
  masterId: string;
  shipmentId: string | null;
};

export function fetchPurchaseHistory(token: string, filters: HistoryFilters = {}) {
  return api<PurchaseHistoryRow[]>(`/api/histories/purchase${qs(filters)}`, token);
}

export function fetchPaymentHistory(token: string, filters: HistoryFilters = {}) {
  return api<PaymentHistoryRow[]>(`/api/histories/payment${qs(filters)}`, token);
}

export function fetchOperationalHistory(token: string, filters: HistoryFilters = {}) {
  return api<OperationalHistoryRow[]>(`/api/histories/operational${qs(filters)}`, token);
}
