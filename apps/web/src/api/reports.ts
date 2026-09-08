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

export type ReportFilterKey =
  | 'from'
  | 'to'
  | 'supplier'
  | 'category'
  | 'division'
  | 'country'
  | 'status'
  | 'paymentTerm'
  | 'modeOfShipment'
  | 'hsCode'
  | 'pol'
  | 'q'
  | 'shipVariance';

export type ReportDef = {
  id: string;
  group: string;
  title: string;
  description: string;
  filters: ReportFilterKey[];
  columns: { key: string; label: string; align?: 'left' | 'right' }[];
};

export type ReportFilters = Partial<Record<ReportFilterKey, string>>;

export type FilterOptions = {
  suppliers: string[];
  categories: string[];
  divisions: string[];
  countries: string[];
  hsCodes: string[];
  pols: string[];
  paymentTerms: string[];
  modes: string[];
  statuses: string[];
  shipVariance: string[];
};

export type ReportResult = {
  id: string;
  title: string;
  group: string;
  description: string;
  columns: { key: string; label: string; align?: 'left' | 'right' }[];
  filters: ReportFilters;
  generatedAt: string;
  rowCount: number;
  rows: Record<string, unknown>[];
};

function qs(filters: ReportFilters & { format?: string }) {
  const p = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v != null && String(v).trim() !== '') p.set(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : '';
}

async function api<T>(path: string, token: string) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as T;
}

export function fetchReportCatalog(token: string) {
  return api<ReportDef[]>('/api/reports/catalog', token);
}

export function fetchReportFilterOptions(token: string) {
  return api<FilterOptions>('/api/reports/filter-options', token);
}

export function fetchReportSummary(token: string) {
  return api<{
    purchaseOrders: { total: number };
    supplierMasters: number;
    importTracking: { open: number; closed: number };
    reportCount: number;
  }>('/api/reports/summary', token);
}

export function runReport(token: string, id: string, filters: ReportFilters) {
  return api<ReportResult>(`/api/reports/run/${id}${qs(filters)}`, token);
}

export async function exportReport(
  token: string,
  id: string,
  format: 'csv' | 'xlsx' | 'pdf',
  filters: ReportFilters,
) {
  const res = await fetch(
    `${API_URL}/api/reports/export/${id}${qs({ ...filters, format })}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(await parseError(res));
  const blob = await res.blob();
  const cd = res.headers.get('Content-Disposition') || '';
  const match = /filename="?([^"]+)"?/.exec(cd);
  const filename = match?.[1] || `report.${format}`;
  return { blob, filename };
}
