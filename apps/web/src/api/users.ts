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

export type ManagedUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  jobTitle: string;
  role: 'ADMIN' | 'COMPANY';
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  companyId: string | null;
  company: { id: string; code: string; name: string } | null;
};

export type CompanyOption = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export function fetchProfile(token: string) {
  return api<ManagedUser>('/api/profile', token);
}

export function updateProfile(
  token: string,
  body: {
    fullName?: string;
    email?: string;
    phone?: string;
    jobTitle?: string;
    currentPassword?: string;
    newPassword?: string;
  },
) {
  return api<ManagedUser>('/api/profile', token, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function listManagedUsers(token: string) {
  return api<ManagedUser[]>('/api/users', token);
}

export function listUserCompanies(token: string) {
  return api<CompanyOption[]>('/api/users/companies', token);
}

export function createManagedUser(
  token: string,
  body: {
    email: string;
    fullName: string;
    password: string;
    role: 'ADMIN' | 'COMPANY';
    companyId?: string | null;
    phone?: string;
    jobTitle?: string;
    isActive?: boolean;
  },
) {
  return api<ManagedUser>('/api/users', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateManagedUser(
  token: string,
  id: string,
  body: {
    email?: string;
    fullName?: string;
    password?: string;
    role?: 'ADMIN' | 'COMPANY';
    companyId?: string | null;
    phone?: string;
    jobTitle?: string;
    isActive?: boolean;
  },
) {
  return api<ManagedUser>(`/api/users/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function setManagedUserActive(token: string, id: string, isActive: boolean) {
  return api<ManagedUser>(`/api/users/${id}/active`, token, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}

export function deleteManagedUser(token: string, id: string) {
  return api<{ ok: boolean; deleted: boolean; disabled?: boolean; message?: string }>(
    `/api/users/${id}`,
    token,
    { method: 'DELETE' },
  );
}
