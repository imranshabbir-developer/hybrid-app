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

export type SupplierMaster = {
  id: string;
  srNo: number;
  supplierEntryId: string | null;
  purchaseOrderId: string | null;
  purchaseOrderNo: string;
  entryDate: string;
  ppcDemandNo: string;
  ppcDemandDate: string | null;
  division: string;
  shipperName: string;
  supplierCategory: string;
  productCategory: string;
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
  remarks: string;
  poCompleted: boolean;
};

export function listSupplierMasters(token: string, q?: string) {
  const query = q ? `?q=${encodeURIComponent(q)}` : '';
  return api<SupplierMaster[]>(`/api/supplier-masters${query}`, token);
}

export function getSupplierMaster(token: string, id: string) {
  return api<SupplierMaster>(`/api/supplier-masters/${id}`, token);
}

export function updateSupplierMaster(
  token: string,
  id: string,
  body: Partial<SupplierMaster>,
) {
  return api<SupplierMaster>(`/api/supplier-masters/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteSupplierMaster(token: string, id: string) {
  return api<{ ok: boolean }>(`/api/supplier-masters/${id}`, token, {
    method: 'DELETE',
  });
}

export function postEntryToMaster(token: string, entryId: string) {
  return api<SupplierMaster>(`/api/supplier-masters/from-entry/${entryId}`, token, {
    method: 'POST',
  });
}

export function syncMissingMasters(token: string) {
  return api<{ synced: number }>(`/api/supplier-masters/sync-missing`, token, {
    method: 'POST',
  });
}
