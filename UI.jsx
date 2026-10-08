import { AlertTriangle, Inbox, RefreshCw, Search } from "lucide-react";

export function LoadingState({ label = "Cargando datos..." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-coral" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-bad-bg bg-bad-row px-6 py-12 text-center">
      <AlertTriangle className="h-7 w-7 text-bad-text" />
      <p className="max-w-sm text-sm text-bad-text">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-bad-text shadow-panel transition hover:shadow-md"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reintentar
        </button>
      )}
    </div>
  );
}

export function EmptyState({ label = "No hay datos para mostrar todavia." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 py-16 text-center text-slate-400">
      <Inbox className="h-7 w-7" />
      <p className="max-w-xs text-sm">{label}</p>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "Buscar..." }) {
  return (
    <div className="relative flex-1 min-w-[160px]">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-coral focus:ring-2 focus:ring-coral/20"
      />
    </div>
  );
}

export function SelectInput({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-coral focus:ring-2 focus:ring-coral/20"
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => {
        const v = typeof opt === "object" ? opt.value : opt;
        const l = typeof opt === "object" ? opt.label : opt;
        return (
          <option key={v} value={v}>
            {l}
          </option>
        );
      })}
    </select>
  );
}

export function Banner({ tone = "warn", icon: Icon = AlertTriangle, children }) {
  const tones = {
    warn: "bg-warn-bg text-warn-text",
    bad: "bg-bad-bg text-bad-text",
    ok: "bg-ok-bg text-ok-text",
  };
  return (
    <div className={`flex items-start gap-3 rounded-2xl px-4 py-3 text-sm ${tones[tone]}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="leading-snug">{children}</div>
    </div>
  );
}

export function Badge({ tone = "warn", children }) {
  const tones = {
    warn: "bg-warn-bg text-warn-text",
    bad: "bg-bad-bg text-bad-text",
    ok: "bg-ok-bg text-ok-text",
    neutral: "bg-slate-100 text-slate-500",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function StatCard({ label, value, sub, accent = "coral" }) {
  const accents = {
    coral: "border-coral",
    navy: "border-navy",
    ok: "border-ok-text",
    warn: "border-warn-text",
  };
  return (
    <div className={`rounded-2xl border-l-4 bg-white p-4 shadow-panel ${accents[accent]}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-navy">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export function PageHeader({ title, description, right }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-xl font-bold text-navy sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {right}
    </div>
  );
}
