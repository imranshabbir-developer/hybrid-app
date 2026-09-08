import { useCallback, useEffect, useState } from 'react';
import { listLookups, LookupRow } from '../api/lookups';
import { useAuth } from '../auth/AuthContext';

/** Load active lookup labels for a type; falls back to provided defaults. */
export function useLookupOptions(type: string, fallback: string[] = []) {
  const { token } = useAuth();
  const [options, setOptions] = useState<{ value: string; label: string }[]>(
    () => fallback.map((v) => ({ value: v, label: v })),
  );

  const reload = useCallback(async () => {
    if (!token) return;
    try {
      const rows: LookupRow[] = await listLookups(token, type);
      if (rows.length) {
        setOptions(rows.map((r) => ({ value: r.label, label: r.label })));
      } else if (fallback.length) {
        setOptions(fallback.map((v) => ({ value: v, label: v })));
      }
    } catch {
      if (fallback.length) {
        setOptions(fallback.map((v) => ({ value: v, label: v })));
      }
    }
  }, [token, type, fallback.join('|')]);

  useEffect(() => {
    reload();
  }, [reload]);

  return options;
}
