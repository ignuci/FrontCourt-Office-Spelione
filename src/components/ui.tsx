import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-orange text-white hover:bg-orange-deep",
  secondary: "bg-purple-soft text-on-purple-soft hover:brightness-95",
  ghost: "bg-transparent text-muted hover:text-bad",
};

export function Button({
  variant = "primary",
  small = false,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; small?: boolean }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 rounded-[10px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
        small ? "px-2.5 py-1.5 text-[13px]" : "px-3.5 py-2 text-sm"
      } ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

type Tone = "good" | "bad" | "lock" | "open";
const TONES: Record<Tone, string> = {
  good: "bg-good-soft text-good",
  bad: "bg-bad-soft text-bad",
  lock: "bg-purple-soft text-on-purple-soft",
  open: "bg-orange-soft text-orange-deep",
};

export function Tag({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function Points({ value }: { value: number }) {
  return (
    <span className="ml-1.5 inline-block rounded-full bg-orange-soft px-1.5 py-0.5 align-middle font-sans text-[11px] font-bold tracking-normal text-orange-deep">
      {value} tšk.
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border-2 border-dashed border-line px-3 py-7 text-center text-muted">{children}</div>;
}

export function SectionHead({ title, children, aside }: { title: string; children?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1">
        <h2 className="text-3xl font-extrabold uppercase">{title}</h2>
        {children && <p className="text-sm text-muted">{children}</p>}
      </div>
      {aside}
    </div>
  );
}

export function Field({ label, htmlFor, className = "", children }: { label: string; htmlFor?: string; className?: string; children: ReactNode }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

export function Toast({ message }: { message: string | null }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-[10px] bg-purple px-4 py-2.5 text-sm text-white shadow-lg transition-all duration-300 ${
        message ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
      }`}
    >
      {message}
    </div>
  );
}
