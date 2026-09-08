import { AuthUser } from './client';

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

async function api<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(await parseError(res));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export type PurchaseOrderLine = {
  id?: string;
  lineNo: number;
  itemCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type PurchaseOrder = {
  id: string;
  poNumber: string;
  poDate: string;
  status: 'DRAFT' | 'SAVED' | 'POSTED';
  companyName: string;
  companyStreet: string;
  companyCity: string;
  companyPhone: string;
  companyFax: string;
  companyWebsite: string;
  beneficiaryName: string;
  beneficiaryContact: string;
  beneficiaryStreet: string;
  beneficiaryCity: string;
  beneficiaryPhone: string;
  beneficiaryFax: string;
  shipperName: string;
  shipperContact: string;
  shipperStreet: string;
  shipperCity: string;
  shipperPhone: string;
  shipperFax: string;
  consigneeName: string;
  consigneeCompany: string;
  consigneeStreet: string;
  consigneeCity: string;
  consigneePhone: string;
  originOfGoods: string;
  shipVia: string;
  hsCode: string;
  incoterms: string;
  tolerance: string;
  currency: string;
  comments: string;
  contactFooter: string;
  grandTotal: number;
  lines: PurchaseOrderLine[];
  company?: { id: string; code: string; name: string } | null;
  createdBy?: { id: string; fullName: string; email: string } | null;
};

export type PurchaseOrderInput = Omit<
  PurchaseOrder,
  'id' | 'grandTotal' | 'company' | 'createdBy' | 'lines'
> & {
  lines: Array<{
    itemCode: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
};

export function listPurchaseOrders(token: string) {
  return api<PurchaseOrder[]>('/api/purchase-orders', token);
}

export function getPurchaseOrder(token: string, id: string) {
  return api<PurchaseOrder>(`/api/purchase-orders/${id}`, token);
}

export function createPurchaseOrder(token: string, body: PurchaseOrderInput) {
  return api<PurchaseOrder>('/api/purchase-orders', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updatePurchaseOrder(
  token: string,
  id: string,
  body: PurchaseOrderInput,
) {
  return api<PurchaseOrder>(`/api/purchase-orders/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deletePurchaseOrder(token: string, id: string) {
  return api<{ ok: boolean }>(`/api/purchase-orders/${id}`, token, {
    method: 'DELETE',
  });
}

export async function downloadPurchaseOrderPdf(token: string, id: string, poNumber?: string) {
  const res = await fetch(`${API_URL}/api/purchase-orders/${id}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    try {
      const data = await res.json();
      throw new Error(
        typeof data?.message === 'string' ? data.message : 'PDF download failed',
      );
    } catch (err) {
      if (err instanceof Error && err.message !== 'PDF download failed') throw err;
      throw new Error('PDF download failed');
    }
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PO-${poNumber || id}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export function emptyPoForm(user?: AuthUser | null): PurchaseOrderInput {
  const today = new Date().toISOString().slice(0, 10);
  return {
    poNumber: '',
    poDate: today,
    status: 'SAVED',
    companyName: user?.company?.name || '',
    companyStreet: '',
    companyCity: '',
    companyPhone: '',
    companyFax: '',
    companyWebsite: '',
    beneficiaryName: '',
    beneficiaryContact: '',
    beneficiaryStreet: '',
    beneficiaryCity: '',
    beneficiaryPhone: '',
    beneficiaryFax: '',
    shipperName: '',
    shipperContact: '',
    shipperStreet: '',
    shipperCity: '',
    shipperPhone: '',
    shipperFax: '',
    consigneeName: '',
    consigneeCompany: '',
    consigneeStreet: '',
    consigneeCity: '',
    consigneePhone: '',
    originOfGoods: '',
    shipVia: 'By Sea',
    hsCode: '',
    incoterms: 'FOB',
    tolerance: '5%',
    currency: 'USD',
    comments: '',
    contactFooter: '',
    lines: Array.from({ length: 6 }, () => ({
      itemCode: '',
      description: '',
      quantity: 0,
      unitPrice: 0,
    })),
  };
}
