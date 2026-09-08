import { useEffect, useMemo, useRef, useState } from 'react';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toYmd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseYmd(value?: string) {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDisplay(value?: string) {
  const d = parseYmd(value);
  if (!d) return '';
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
}

type ThemeDateFieldProps = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

export default function ThemeDateField({
  value,
  onChange,
  required = false,
  disabled = false,
  className = '',
}: ThemeDateFieldProps) {
  const selected = parseYmd(value);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => selected || new Date());
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) setView(selected);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const cells = useMemo(() => {
    const year = view.getFullYear();
    const month = view.getMonth();
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const items: Array<{ day: number; inMonth: boolean; date: Date }> = [];

    for (let i = 0; i < startPad; i += 1) {
      const d = new Date(year, month, -startPad + i + 1);
      items.push({ day: d.getDate(), inMonth: false, date: d });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      items.push({ day, inMonth: true, date: new Date(year, month, day) });
    }
    while (items.length % 7 !== 0) {
      const last = items[items.length - 1].date;
      const d = new Date(last);
      d.setDate(d.getDate() + 1);
      items.push({ day: d.getDate(), inMonth: false, date: d });
    }
    return items;
  }, [view]);

  const monthLabel = view.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const today = toYmd(new Date());

  return (
    <div
      className={`theme-date${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''} ${className}`.trim()}
      ref={rootRef}
    >
      <button
        type="button"
        className="theme-date-trigger"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
      >
        <span className={!value ? 'is-placeholder' : ''}>
          {value ? formatDisplay(value) : 'mm/dd/yyyy'}
        </span>
        <span className="theme-date-icon" aria-hidden="true">
          📅
        </span>
      </button>

      {required ? (
        <input
          tabIndex={-1}
          className="theme-select-required"
          value={value}
          required
          onChange={() => undefined}
          aria-hidden="true"
        />
      ) : null}

      {open ? (
        <div className="theme-date-popover">
          <div className="theme-date-header">
            <strong>{monthLabel}</strong>
            <div className="theme-date-nav">
              <button
                type="button"
                onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
              >
                ›
              </button>
            </div>
          </div>
          <div className="theme-date-weekdays">
            {WEEKDAYS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="theme-date-grid">
            {cells.map((cell) => {
              const ymd = toYmd(cell.date);
              const isSelected = value === ymd;
              const isToday = today === ymd;
              return (
                <button
                  key={ymd + String(cell.inMonth)}
                  type="button"
                  className={`theme-date-day${cell.inMonth ? '' : ' is-muted'}${
                    isSelected ? ' is-selected' : ''
                  }${isToday ? ' is-today' : ''}`}
                  onClick={() => {
                    onChange(ymd);
                    setOpen(false);
                  }}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
          <div className="theme-date-footer">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(today);
                setOpen(false);
              }}
            >
              Today
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
