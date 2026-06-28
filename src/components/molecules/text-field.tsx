import type { ReactNode } from "react";

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  multiline?: boolean;
  type?: string;
  inputMode?: "text" | "tel" | "numeric" | "decimal";
  autoComplete?: string;
  placeholder?: string;
  maxLength?: number;
}

/**
 * Labeled text/textarea field with accessible error wiring: real
 * `<label htmlFor>`, `aria-invalid`, and hint/error joined via
 * `aria-describedby`. The error is meant to clear on keystroke — the parent
 * does that by resetting its error state in `onChange` (DESIGN.md § A11y).
 */
export function TextField({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  required,
  multiline,
  type = "text",
  inputMode,
  autoComplete,
  placeholder,
  maxLength,
}: TextFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const shared = {
    id,
    value,
    required,
    placeholder,
    maxLength,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => onChange(e.target.value),
    className: `mt-1 w-full rounded-md border-[1.5px] bg-canvas px-3.5 py-3 text-body-lg ${
      error ? "border-danger" : "border-hairline"
    }`,
  };

  return (
    <div>
      <label htmlFor={id} className="text-label">
        {label}
        {required && (
          <span className="text-emergency-text" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      {hint && (
        <p id={hintId} className="mt-0.5 text-caption text-ink-muted">
          {hint}
        </p>
      )}
      {multiline ? (
        <textarea {...shared} rows={4} />
      ) : (
        <input {...shared} type={type} inputMode={inputMode} autoComplete={autoComplete} />
      )}
      {error && (
        <p id={errorId} className="mt-1 text-caption text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
