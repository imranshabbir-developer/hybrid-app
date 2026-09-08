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

export type SystemInfo = {
  dbEngine: string;
  sqlitePath: string;
  sqliteExists: boolean;
  sqliteBytes: number;
  apiPort: number;
};

export async function fetchSystemInfo(token: string): Promise<SystemInfo> {
  const res = await fetch(`${API_URL}/api/system/info`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function downloadSqliteBackup(token: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/system/backup`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  const blob = await res.blob();
  const cd = res.headers.get('Content-Disposition') || '';
  const match = /filename="([^"]+)"/.exec(cd);
  const filename = match?.[1] || `erp-backup-${Date.now()}.sqlite`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copySqliteBackup(token: string) {
  const res = await fetch(`${API_URL}/api/system/backup/copy`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { ok: boolean; path: string };
}
