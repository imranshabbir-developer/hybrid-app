const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001';

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  jobTitle?: string;
  role: 'ADMIN' | 'COMPANY';
  company: { id: string; code: string; name: string } | null;
  lastLoginAt?: string | null;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: string;
  user: AuthUser;
};

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

export async function loginRequest(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as LoginResponse;
}

export async function meRequest(token: string) {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as AuthUser;
}
