import type { ReactNode } from "react";

type FieldProps = {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
};

export function Field({ label, htmlFor, hint, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-bold">
        {label}
        {hint ? <span className="ml-2 text-xs font-medium text-muted">{hint}</span> : null}
      </label>
      {children}
    </div>
  );
}
