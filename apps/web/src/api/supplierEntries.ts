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

async function api<T>(path: string, token: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as T;
}

export type CertStatus = 'YES' | 'NO' | 'UNDER_PROCESS';

export type SupplierEntry = {
  id: string;
  purchaseOrderId: string | null;
  purchaseOrderNo: string;
  entryDate: string;
  ppcDemandNo: string;
  ppcDemandDate: string | null;
  shipperName: string;
  division: string;
  supplierCategory: string;
  productCategory: string;
  tolerance: string;
  productItemCode: string;
  shipperAddress: string;
  country: string;
  shipperEmail: string;
  contactNo: string;
  websiteName: string;
  productDescription: string;
  countryOfOrigin: string;
  productHsCode: string;
  unitValue: number;
  totalQuantity: number;
  totalValue: number;
  leadTimeDays: number | null;
  portOfLoading: string;
  oekotexCert: CertStatus;
  isoCert: CertStatus;
  reachCert: CertStatus;
  sourceLineNo: number | null;
  notes: string;
  purchaseOrder?: { id: string; poNumber: string; poDate?: string } | null;
};

export type SupplierEntryInput = Omit<
  SupplierEntry,
  'id' | 'purchaseOrder'
>;

export type PrefillResponse = SupplierEntryInput & {
  availableLines: Array<{
    lineNo: number;
    itemCode: string;
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  prefilledFrom: string[];
  manualFields: string[];
};

export function emptySupplierEntry(): SupplierEntryInput {
  return {
    purchaseOrderId: null,
    purchaseOrderNo: '',
    entryDate: new Date().toISOString().slice(0, 10),
    ppcDemandNo: '',
    ppcDemandDate: null,
    shipperName: '',
    division: '',
    supplierCategory: '',
    productCategory: '',
    tolerance: '5%',
    productItemCode: '',
    shipperAddress: '',
    country: '',
    shipperEmail: '',
    contactNo: '',
    websiteName: '',
    productDescription: '',
    countryOfOrigin: '',
    productHsCode: '',
    unitValue: 0,
    totalQuantity: 0,
    totalValue: 0,
    leadTimeDays: null,
    portOfLoading: '',
    oekotexCert: 'NO',
    isoCert: 'NO',
    reachCert: 'NO',
    sourceLineNo: null,
    notes: '',
  };
}

export function listSupplierEntries(token: string) {
  return api<SupplierEntry[]>('/api/supplier-entries', token);
}

export function getSupplierEntry(token: string, id: string) {
  return api<SupplierEntry>(`/api/supplier-entries/${id}`, token);
}

export function prefillFromPo(token: string, poId: string, lineNo?: number) {
  const q = lineNo ? `?lineNo=${lineNo}` : '';
  return api<PrefillResponse>(`/api/supplier-entries/prefill/${poId}${q}`, token);
}

export function createSupplierEntry(token: string, body: SupplierEntryInput) {
  return api<SupplierEntry>('/api/supplier-entries', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateSupplierEntry(
  token: string,
  id: string,
  body: SupplierEntryInput,
) {
  return api<SupplierEntry>(`/api/supplier-entries/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteSupplierEntry(token: string, id: string) {
  return api<{ ok: boolean }>(`/api/supplier-entries/${id}`, token, {
    method: 'DELETE',
  });
}
