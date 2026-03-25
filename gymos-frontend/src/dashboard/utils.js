export const todayStr = () => new Date().toISOString().split("T")[0];

export const fmtDate = (d) => {
  if (!d) return "—";
  const date = new Date(String(d).slice(0, 10) + "T12:00:00");
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-CR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const fmtMoney = (n) => `₡${Number(n || 0).toLocaleString("es-CR")}`;

export const diffDays = (d) => {
  if (!d) return 0;
  const date = new Date(String(d).slice(0, 10) + "T12:00:00");
  if (Number.isNaN(date.getTime())) return 0;
  return Math.ceil((date - new Date()) / 86400000);
};

export const initials = (name = "?") =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const T = {
  bg: "#f0f2f7",
  border: "#e2e8f0",
  border2: "#cbd5e1",
  text: "#0f172a",
  text2: "#475569",
  text3: "#94a3b8",
  sidebar: "#1e293b",
  accent: "#6366f1",
  accentBg: "#eef2ff",
  green: "#059669",
  greenBg: "#d1fae5",
  orange: "#ea580c",
  orangeBg: "#ffedd5",
  red: "#dc2626",
  redBg: "#fee2e2",
  blue: "#0891b2",
  blueBg: "#e0f2fe",
  yellow: "#d97706",
  yellowBg: "#fef3c7",
};

export const PLAN_META = {
  Día: { color: "#d97706", bg: "#fef3c7", chip: "bg-amber-100 text-amber-600" },
  Semanal: { color: "#0891b2", bg: "#e0f2fe", chip: "bg-sky-100 text-sky-600" },
  Quincenal: { color: "#059669", bg: "#d1fae5", chip: "bg-emerald-100 text-emerald-600" },
  Mensual: { color: "#6366f1", bg: "#eef2ff", chip: "bg-indigo-100 text-indigo-500" },
  Bimensual: { color: "#7c3aed", bg: "#ede9fe", chip: "bg-violet-100 text-violet-600" },
};

export const PLAN_OPTIONS = ["Día", "Semanal", "Quincenal", "Mensual", "Bimensual"];

export const PLAN_DAYS = {
  Día: 1,
  Semanal: 7,
  Quincenal: 15,
  Mensual: 30,
  Bimensual: 60,
};

export const calcExpiry = (joinedAt, plan) => {
  const d = new Date(String(joinedAt).slice(0, 10) + "T12:00:00");
  d.setDate(d.getDate() + (PLAN_DAYS[plan] || 30));
  return d.toISOString().slice(0, 10);
};

const AVATAR_COLORS = [
  "#7c3aed",
  "#0891b2",
  "#d97706",
  "#059669",
  "#db2777",
  "#2563eb",
  "#0f766e",
  "#b45309",
];

export const avatarColor = (s = "") =>
  AVATAR_COLORS[(s.charCodeAt(0) + (s.charCodeAt(1) || 0)) % AVATAR_COLORS.length];

export const NAV = [
  { id: "dashboard", icon: "⚡", label: "Dashboard" },
  { id: "members", icon: "👥", label: "Miembros" },
  { id: "attendance", icon: "📋", label: "Asistencia" },
  { id: "payments", icon: "💳", label: "Pagos" },
  { id: "blacklist", icon: "🚫", label: "Lista Negra" },
];

export const DASHBOARD_LABELS = {
  dashboard: "Dashboard",
  members: "Miembros",
  attendance: "Asistencia",
  payments: "Pagos",
  blacklist: "Lista Negra",
};

export const inputClass = "app-input";
