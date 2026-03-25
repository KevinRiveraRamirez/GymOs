import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/cn";
import { PLAN_META, T, avatarColor, initials, inputClass } from "./utils";

export function Avatar({ name = "?", size = 36 }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.33,
        background: avatarColor(name),
      }}
    >
      {initials(name)}
    </div>
  );
}

export function PlanTag({ plan }) {
  return (
    <span className={cn("app-chip", PLAN_META[plan]?.chip || "bg-slate-100 text-slate-400")}>
      {plan}
    </span>
  );
}

export function StatusBadge({ status, blocked }) {
  const resolved = blocked ? "blocked" : status;
  const map = {
    active: {
      label: "Activo",
      className: "bg-emerald-100 text-emerald-600",
      dot: "bg-emerald-600",
    },
    overdue: {
      label: "Vencido",
      className: "bg-orange-100 text-orange-600",
      dot: "bg-orange-600",
    },
    inactive: {
      label: "Inactivo",
      className: "bg-slate-100 text-slate-400",
      dot: "bg-slate-400",
    },
    blocked: {
      label: "Bloqueado",
      className: "bg-red-100 text-red-600",
      dot: "bg-red-600",
    },
  };
  const meta = map[resolved] || map.inactive;
  return (
    <span className={cn("app-chip gap-1", meta.className)}>
      <span className={cn("h-[5px] w-[5px] rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

export function Card({ children, className }) {
  return <div className={cn("app-card", className)}>{children}</div>;
}

export function Modal({ title, onClose, children, width = 460 }) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/25 px-3 py-4 backdrop-blur-[2px]">
      <div
        className="max-h-[90vh] max-w-[94vw] overflow-y-auto rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_20px_60px_#00000022] sm:p-7"
        style={{ width }}
      >
        <div className="mb-4 flex items-center justify-between sm:mb-[22px]">
          <h3 className="pr-3 text-base font-extrabold text-slate-900 sm:text-[17px]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-slate-100 text-xl text-slate-600 transition hover:bg-slate-200"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Lbl({ children }) {
  return <label className="app-label">{children}</label>;
}

export function Btn({ children, variant = "primary", className, ...props }) {
  const variants = {
    primary: "app-btn app-btn-primary",
    green: "app-btn app-btn-green",
    red: "app-btn app-btn-red",
    ghost: "app-btn app-btn-ghost",
  };

  return (
    <button {...props} className={cn(variants[variant] || variants.primary, className)}>
      {children}
    </button>
  );
}

export function ToggleButton({
  active,
  activeClassName,
  inactiveClassName,
  className,
  ...props
}) {
  return (
    <button
      {...props}
      type="button"
      className={cn(
        "rounded-[10px] border-2 px-3 py-2 text-[13px] font-bold transition",
        active ? activeClassName : inactiveClassName || "border-slate-300 bg-white text-slate-600",
        className
      )}
    />
  );
}

export function ErrBox({ msg }) {
  if (!msg) return null;
  return (
    <div className="mb-3.5 rounded-[10px] border border-red-300 bg-red-100 px-3.5 py-2.5 text-[13px] text-red-600">
      ⚠ {msg}
    </div>
  );
}

export function MemberSearch({ members, onSelect, placeholder = "Nombre o cédula..." }) {
  const [query, setQuery] = useState("");
  const [show, setShow] = useState(false);
  const ref = useRef(null);

  const suggestions =
    query.length >= 1
      ? members
          .filter(
            (member) =>
              member.name.toLowerCase().includes(query.toLowerCase()) ||
              member.cedula.includes(query)
          )
          .slice(0, 7)
      : [];

  useEffect(() => {
    const onPointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setShow(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <div ref={ref} className="relative mb-3.5">
      <input
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onSelect(null);
          setShow(true);
        }}
        onFocus={() => setShow(true)}
        className={inputClass}
      />

      {show && suggestions.length > 0 && (
        <div className="absolute inset-x-0 top-[calc(100%+4px)] z-[300] overflow-hidden rounded-xl border-[1.5px] border-slate-300 bg-white shadow-[0_8px_24px_#00000018]">
          {suggestions.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => {
                onSelect(member);
                setQuery(member.name);
                setShow(false);
              }}
              className="flex w-full items-center gap-2.5 border-b border-slate-200 px-3.5 py-[11px] text-left transition last:border-b-0 hover:bg-slate-50"
            >
              <Avatar name={member.name} size={32} />
              <div className="flex-1">
                <div className="text-[13px] font-semibold text-slate-900">{member.name}</div>
                <div className="text-[11px] text-slate-400">CI: {member.cedula}</div>
              </div>
              <PlanTag plan={member.plan} />
              <StatusBadge status={member.status} blocked={member.blocked} />
            </button>
          ))}
        </div>
      )}

      {show && query.length >= 1 && suggestions.length === 0 && (
        <div className="absolute inset-x-0 top-[calc(100%+4px)] z-[300] rounded-xl border-[1.5px] border-slate-300 bg-white px-3.5 py-3.5 text-center text-[13px] text-slate-400 shadow-[0_8px_24px_#00000018]">
          Sin resultados
        </div>
      )}
    </div>
  );
}

export function PillNotice({ children, colorClass = "text-slate-400", className }) {
  return <span className={cn("text-[11px]", colorClass, className)}>{children}</span>;
}

export function SurfaceBox({ children, className }) {
  return <div className={cn("app-surface-muted", className)}>{children}</div>;
}
