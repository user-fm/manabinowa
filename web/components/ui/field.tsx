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
            <label htmlFor={htmlFor} className="block text-sm font-medium">
                {label}
                {hint ? <span className="ml-1 text-xs font-normal text-gray-500">
                {hint}</span> : null}
            </label>
            {children}
        </div>
    );
}