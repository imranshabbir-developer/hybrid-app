import { useEffect, useId, useRef, useState } from 'react';

export type ThemeSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type ThemeSelectProps = {
  value: string;
  options: ThemeSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
};

export default function ThemeSelect({
  value,
  options,
  onChange,
  placeholder = 'Select…',
  disabled = false,
  required = false,
  className = '',
}: ThemeSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);
  const display = selected?.label || placeholder;

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

  return (
    <div
      className={`theme-select${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''} ${className}`.trim()}
      ref={rootRef}
    >
      <button
        type="button"
        className="theme-select-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => !disabled && setOpen((v) => !v)}
      >
        <span className={`theme-select-value${!selected ? ' is-placeholder' : ''}`}>
          {display}
        </span>
        <span className="theme-select-caret" aria-hidden="true" />
      </button>

      {/* Keep a hidden input for HTML5 required if needed */}
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
        <ul className="theme-select-menu" role="listbox" id={listId}>
          {placeholder ? (
            <li
              role="option"
              aria-selected={!value}
              className={`theme-select-option${!value ? ' is-selected' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange('');
                setOpen(false);
              }}
            >
              {placeholder}
            </li>
          ) : null}
          {options.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              aria-disabled={opt.disabled || undefined}
              className={`theme-select-option${opt.value === value ? ' is-selected' : ''}${
                opt.disabled ? ' is-disabled' : ''
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                if (opt.disabled) return;
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
