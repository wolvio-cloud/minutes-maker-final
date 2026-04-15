import React from "react";

// ─── Status Badge ──────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const config = {
    NotStarted: { color: "bg-slate-100 text-slate-500 border border-slate-200", dot: "bg-slate-400", label: "Not Started" },
    Pending:    { color: "bg-amber-50 text-amber-600 border border-amber-200",  dot: "bg-amber-500 animate-pulse", label: "Pending" },
    Processing: { color: "bg-blue-50 text-blue-600 border border-blue-200",     dot: "bg-blue-500 animate-pulse",  label: "Processing" },
    Completed:  { color: "bg-emerald-50 text-emerald-700 border border-emerald-200", dot: "bg-emerald-500", label: "Completed" },
    Failed:     { color: "bg-red-50 text-red-600 border border-red-200",        dot: "bg-red-500",    label: "Failed" },
  };
  const c = config[status] || config.NotStarted;
  return (
    <span className={`status-badge ${c.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {c.label}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export function SkeletonCard() {
  return (
    <div className="card rounded-xl p-5 space-y-3">
      <div className="shimmer h-4 w-2/3 rounded-md" />
      <div className="shimmer h-3 w-full rounded-md" />
      <div className="shimmer h-3 w-4/5 rounded-md" />
      <div className="flex gap-2 pt-2">
        <div className="shimmer h-5 w-16 rounded-full" />
        <div className="shimmer h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl w-full max-w-lg p-6 shadow-modal animate-fade-up border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-sm">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
export function Field({ label, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-500 font-mono uppercase tracking-wider">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function Input({ className = "", ...props }) {
  return <input className={`input-field ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }) {
  return <textarea className={`input-field resize-none ${className}`} {...props} />;
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
export function ProgressBar({ value, label }) {
  return (
    <div className="space-y-1.5">
      {label && <p className="text-xs text-slate-500 font-medium">{label}</p>}
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-brand rounded-full transition-all duration-300" style={{ width: `${value}%` }} />
      </div>
      <p className="text-xs text-slate-400 text-right font-mono">{value}%</p>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-brand-soft border border-brand-border flex items-center justify-center text-3xl mb-5">{icon}</div>
      <h3 className="font-display text-lg font-semibold text-slate-700 mb-2">{title}</h3>
      <p className="text-sm text-slate-400 max-w-xs mb-6 leading-relaxed">{description}</p>
      {action}
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
export function Toast({ toasts }) {
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={`flex items-center gap-2.5 pl-3 pr-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-fade-up ${
          t.type === "success" ? "bg-white border-emerald-200 text-emerald-700"
          : t.type === "error" ? "bg-white border-red-200 text-red-700"
          : "bg-white border-slate-200 text-slate-700"
        }`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
            t.type === "success" ? "bg-emerald-100 text-emerald-600"
            : t.type === "error" ? "bg-red-100 text-red-600"
            : "bg-slate-100 text-slate-500"
          }`}>
            {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "i"}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
