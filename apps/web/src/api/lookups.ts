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

export type LookupType = { type: string; label: string };

export type LookupRow = {
  id: string;
  type: string;
  code: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  companyId: string | null;
};

export function listLookupTypes(token: string) {
  return api<LookupType[]>('/api/lookups/types', token);
}

export function listLookups(token: string, type?: string) {
  const q = type ? `?type=${encodeURIComponent(type)}` : '';
  return api<LookupRow[]>(`/api/lookups${q}`, token);
}

export function createLookup(
  token: string,
  body: {
    type: string;
    label: string;
    code?: string;
    sortOrder?: number;
    isActive?: boolean;
  },
) {
  return api<LookupRow>('/api/lookups', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateLookup(
  token: string,
  id: string,
  body: {
    type: string;
    label: string;
    code?: string;
    sortOrder?: number;
    isActive?: boolean;
  },
) {
  return api<LookupRow>(`/api/lookups/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteLookup(token: string, id: string) {
  return api<{ ok: boolean }>(`/api/lookups/${id}`, token, {
    method: 'DELETE',
  });
}

export function seedLookupDefaults(token: string) {
  return api<{ created: number }>('/api/lookups/seed-defaults', token, {
    method: 'POST',
  });
}
