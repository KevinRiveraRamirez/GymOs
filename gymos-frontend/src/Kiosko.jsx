import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import AppLogo from "./AppLogo";
import api from "./api";
import { cn } from "./lib/cn";

const RESET_DELAY = 4000;

const initials = (name = "?") =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const COLORS = [
  "#7c3aed",
  "#0891b2",
  "#d97706",
  "#059669",
  "#db2777",
  "#2563eb",
  "#0f766e",
  "#b45309",
];

const avatarColor = (s = "") =>
  COLORS[(s.charCodeAt(0) + (s.charCodeAt(1) || 0)) % COLORS.length];

const fmtDate = (d) => {
  if (!d) return "—";
  const date = new Date(String(d).slice(0, 10) + "T12:00:00");
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-CR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const PLAN_COLORS = {
  Mensual: "#6366f1",
  Semanal: "#0891b2",
  Quincenal: "#059669",
  Bimensual: "#7c3aed",
  Día: "#d97706",
};

const planBadgeStyle = (plan) => {
  const color = PLAN_COLORS[plan];
  return {
    background: color ? `${color}22` : "#1e293b",
    color: color || "#94a3b8",
    borderColor: color ? `${color}44` : "#334155",
  };
};

function Avatar({ member, size, blocked = false }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-black text-white"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        background: blocked ? "#374151" : avatarColor(member),
      }}
    >
      {blocked ? "🚫" : initials(member)}
    </div>
  );
}

export default function Kiosko() {
  const { gymId = "2" } = useParams();
  const GYM_ID = parseInt(gymId, 10);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [state, setState] = useState("idle");
  const [member, setMember] = useState(null);
  const [message, setMessage] = useState("");
  const [time, setTime] = useState(new Date());
  const inputRef = useRef(null);
  const resetTimer = useRef(null);
  const searchTimer = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (state === "idle") {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [state]);

  const reset = useCallback(() => {
    clearTimeout(resetTimer.current);
    clearTimeout(searchTimer.current);
    setQuery("");
    setResults([]);
    setMember(null);
    setMessage("");
    setState("idle");
  }, []);

  const scheduleReset = useCallback((delay = RESET_DELAY) => {
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(reset, delay);
  }, [reset]);

  const handleQueryChange = useCallback(
    (val) => {
      setQuery(val);
      clearTimeout(searchTimer.current);
      if (!val.trim()) {
        setResults([]);
        return;
      }
      setState("searching");
      searchTimer.current = setTimeout(async () => {
        try {
          const r = await api.get(
            `/kiosko/search?q=${encodeURIComponent(val.trim())}&gymId=${GYM_ID}`
          );
          setResults(r.data || []);
          setState("idle");
        } catch {
          setResults([]);
          setState("idle");
        }
      }, 300);
    },
    [GYM_ID]
  );

  const handleSelectWithCheck = useCallback(
    async (m) => {
      setResults([]);
      setQuery(m.name);
      if (m.blocked) {
        setMember(m);
        setState("blocked");
        scheduleReset();
        return;
      }
      setState("searching");
      try {
        const today = new Date().toISOString().split("T")[0];
        const r = await api.get(
          `/kiosko/inside?memberId=${m.id}&gymId=${GYM_ID}&date=${today}`
        );
        setMember({ ...m, alreadyIn: r.data.inside, attendanceId: r.data.attendanceId });
        setState("found");
      } catch {
        setMember({ ...m, alreadyIn: false });
        setState("found");
      }
    },
    [GYM_ID, scheduleReset]
  );

  const handleMarcar = async (tipo) => {
    setState("searching");
    try {
      if (tipo === "salida") {
        await api.patch(`/kiosko/attendance/${member.attendanceId}/exit`);
        setState("success");
        setMessage("salida_ok");
      } else {
        await api.post("/kiosko/attendance", {
          gymId: GYM_ID,
          memberId: member.id,
          memberName: member.name,
          cedula: member.cedula,
          plan: member.plan,
        });
        setState("success");
        setMessage("entrada_ok");
      }
      scheduleReset();
    } catch {
      setState("error");
      setMessage("error_servidor");
      scheduleReset();
    }
  };

  const timeStr = time.toLocaleTimeString("es-CR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const dateStr = time.toLocaleDateString("es-CR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex min-h-screen select-none flex-col items-center justify-center bg-slate-900 px-4 py-6 text-slate-100 sm:px-6">
      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b border-slate-700 bg-slate-800 px-4 py-3 sm:px-7 sm:py-3.5">
        <div className="flex items-center gap-2.5">
          <AppLogo variant="light" size="md" showText={false} />
          <div className="hidden h-9 w-9 items-center justify-center rounded-[10px] bg-linear-to-br from-indigo-500 to-indigo-400 text-lg">
            💪
          </div>
          <div>
            <div className="text-base font-black text-white">FitControl</div>
            <div className="text-[11px] text-slate-500">Control de Asistencia</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[22px] font-black leading-none text-white sm:text-[28px]">
            {timeStr}
          </div>
          <div className="text-xs capitalize text-slate-500">{dateStr}</div>
        </div>
      </header>

      <main className="mt-[88px] w-full max-w-[520px] sm:mt-20">
        {(state === "idle" || state === "searching") && (
          <section className="animate-fade-in-up text-center">
            <div className="mb-3 text-[56px]">👋</div>
            <h1 className="mb-1.5 text-[26px] font-black text-white">Bienvenido!</h1>
            <p className="mb-7 text-[15px] text-slate-400">
              Busca tu nombre o cedula para marcar tu asistencia
            </p>

            <div className="relative rounded-2xl border-2 border-slate-700 bg-slate-800 px-5 py-6">
              <label className="mb-2.5 block text-left text-[11px] font-bold tracking-[1px] text-slate-500">
                NOMBRE O CEDULA
              </label>
              <input
                ref={inputRef}
                type="text"
                placeholder="Ej: Juan Perez o 101230456"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-600 bg-slate-900 px-4 py-3.5 text-xl font-bold text-white outline-none transition focus:border-indigo-400"
              />

              {results.length > 0 && (
                <div className="absolute inset-x-5 top-full z-[200] mt-1 max-h-[280px] overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 shadow-[0_8px_32px_#0008]">
                  {results.map((m) => {
                    const planStyle = planBadgeStyle(m.plan);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectWithCheck(m)}
                        className="flex w-full items-center gap-3 border-b border-slate-800 bg-transparent px-4 py-3 text-left transition hover:bg-slate-700"
                      >
                        <Avatar member={m.name} size={40} blocked={m.blocked} />
                        <div className="flex-1">
                          <div className="text-sm font-bold text-white">{m.name}</div>
                          <div className="text-xs text-slate-500">CI: {m.cedula}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className="rounded-full border px-2.5 py-0.5 text-[11px] font-bold"
                            style={planStyle}
                          >
                            {m.plan}
                          </span>
                          <span
                            className={cn(
                              "text-[11px] font-semibold",
                              m.status === "active" ? "text-emerald-600" : "text-red-400"
                            )}
                          >
                            {m.status === "active" ? "Activo" : "Vencido"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {query.trim().length >= 2 && results.length === 0 && state === "idle" && (
                <div className="mt-3 text-left text-[13px] text-slate-500">
                  No se encontraron miembros con "{query}"
                </div>
              )}

              {state === "searching" && (
                <div className="mt-3 text-left text-[13px] text-slate-500">Buscando...</div>
              )}
            </div>

            <p className="mt-4 text-xs text-slate-600">
              Escribe al menos 2 caracteres para ver resultados
            </p>
          </section>
        )}

        {state === "found" && member && (
          <section className="animate-fade-in-up text-center">
            <div className="mx-auto mb-4">
              <Avatar member={member.name} size={90} />
            </div>
            <h2 className="mb-1.5 text-2xl font-black text-white">{member.name}</h2>
            <p className="mb-4 text-[13px] text-slate-400">CI: {member.cedula}</p>

            <div className="mb-5 flex justify-center gap-2">
              <span
                className="rounded-full border px-3.5 py-1.5 text-xs font-bold"
                style={planBadgeStyle(member.plan)}
              >
                {member.plan}
              </span>
              <span
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-bold",
                  member.status === "active"
                    ? "border-emerald-600/30 bg-emerald-600/15 text-emerald-600"
                    : "border-red-600/30 bg-red-600/15 text-red-600"
                )}
              >
                {member.status === "active" ? "Activo" : "Vencido"}
              </span>
            </div>

            {member.status !== "active" ? (
              <>
                <div className="mb-4 rounded-2xl border border-red-600/30 bg-red-600/10 px-5 py-5 text-center">
                  <div className="mb-2.5 text-[40px]">⚠️</div>
                  <div className="mb-1.5 text-base font-extrabold text-red-400">
                    Membresia Vencida
                  </div>
                  <div className="mb-1 text-[13px] text-red-300">
                    Vencio el {fmtDate(member.expires_at)}
                  </div>
                  <div className="text-[13px] text-red-300">
                    Acercate a recepcion para renovar tu plan y continuar entrenando.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={reset}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-[13px] text-sm font-bold text-slate-400 transition hover:bg-slate-700"
                >
                  Volver
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <button
                  type="button"
                  onClick={reset}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-[13px] text-sm font-bold text-slate-400 transition hover:bg-slate-700"
                >
                  Cancelar
                </button>
                {member.alreadyIn ? (
                  <button
                    type="button"
                    onClick={() => handleMarcar("salida")}
                    className="flex-[2] rounded-xl bg-linear-to-br from-amber-600 to-yellow-400 px-4 py-[13px] text-sm font-extrabold text-white transition hover:brightness-105"
                  >
                    Marcar Salida
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleMarcar("entrada")}
                    className="flex-[2] rounded-xl bg-linear-to-br from-emerald-600 to-emerald-400 px-4 py-[13px] text-sm font-extrabold text-white transition hover:brightness-105"
                  >
                    Marcar Entrada
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        {state === "success" && (
          <section className="animate-fade-in-up animate-pulse-soft text-center">
            <div className="mb-4 text-[72px]">
              {message === "salida_ok" ? "👋" : message === "ya_dentro" ? "✋" : "✅"}
            </div>
            {member && (
              <div className="mx-auto mb-3.5">
                <Avatar member={member.name} size={72} />
              </div>
            )}
            <h2 className="mb-2 text-2xl font-black text-white">
              {message === "salida_ok"
                ? `Hasta luego, ${member?.name.split(" ")[0]}!`
                : message === "ya_dentro"
                  ? "Ya estas registrado!"
                  : `Hola, ${member?.name.split(" ")[0]}!`}
            </h2>
            <p className="mb-5 text-[17px] font-semibold text-emerald-400">
              {message === "salida_ok"
                ? "Salida registrada. Hasta la proxima!"
                : message === "ya_dentro"
                  ? "Ya marcaste tu entrada hoy. A entrenar!"
                  : "Entrada registrada. Buen entrenamiento!"}
            </p>
            <div className="rounded-xl border border-emerald-600/30 bg-emerald-600/10 px-3 py-3 text-[13px] text-emerald-300">
              Volviendo automaticamente...
            </div>
          </section>
        )}

        {state === "blocked" && (
          <section className="animate-fade-in-up text-center">
            <div className="mb-4 text-[72px]">🚫</div>
            <h2 className="mb-2 text-2xl font-black text-red-400">Acceso Restringido</h2>
            <p className="mb-5 text-[15px] text-slate-400">
              Tu acceso esta suspendido. Acercate a recepcion para mas informacion.
            </p>
            <div className="rounded-xl border border-red-600/30 bg-red-600/10 px-3 py-3 text-[13px] text-red-400">
              Volviendo automaticamente...
            </div>
          </section>
        )}

        {state === "error" && (
          <section className="animate-fade-in-up text-center">
            <div className="mb-4 text-[72px]">⚠️</div>
            <h2 className="mb-2 text-2xl font-black text-white">Error del sistema</h2>
            <p className="mb-5 text-[15px] text-slate-400">
              Ocurrio un error. Intenta de nuevo o avisale al administrador.
            </p>
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border border-slate-700 bg-slate-800 px-7 py-[13px] text-sm font-bold text-slate-400 transition hover:bg-slate-700"
            >
              Intentar de nuevo
            </button>
          </section>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 px-2.5 py-2.5 text-center text-[11px] text-slate-700">
        FitControl - Sistema de Administracion de Gimnasio
      </footer>
    </div>
  );
}


