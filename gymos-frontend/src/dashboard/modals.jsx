import { useEffect, useState } from "react";
import {
  PLAN_META,
  PLAN_OPTIONS,
  T,
  calcExpiry,
  diffDays,
  fmtDate,
  fmtMoney,
  inputClass,
} from "./utils";
import {
  Avatar,
  Btn,
  ErrBox,
  Lbl,
  MemberSearch,
  Modal,
  PlanTag,
  StatusBadge,
  SurfaceBox,
  ToggleButton,
} from "./ui";
import api from "../api";
import { cn } from "../lib/cn";

export function MemberModal({ member, onClose, onSave }) {
  const editing = Boolean(member);
  const [form, setForm] = useState(
    member
      ? {
          cedula: member.cedula,
          name: member.name,
          phone: member.phone || "",
          plan: member.plan,
          joinedAt: member.joined_at ? String(member.joined_at).slice(0, 10) : new Date().toISOString().split("T")[0],
          familyGroup: member.family_group || "",
          notes: member.notes || "",
        }
      : {
          cedula: "",
          name: "",
          phone: "",
          plan: "Mensual",
          joinedAt: new Date().toISOString().split("T")[0],
          familyGroup: "",
          notes: "",
        }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const setValue = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const expiryPreview = form.joinedAt ? calcExpiry(form.joinedAt, form.plan) : "";

  const handleSave = async () => {
    setLoading(true);
    setError("");
    try {
      await onSave({ ...form });
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={editing ? "Editar Miembro" : "Registrar Miembro"} onClose={onClose}>
      <ErrBox msg={error} />

      <Lbl>CÉDULA *</Lbl>
      <input
        placeholder="101230456"
        value={form.cedula}
        onChange={(e) => setValue("cedula", e.target.value)}
        disabled={editing}
        className={inputClass}
      />

      <Lbl>NOMBRE COMPLETO *</Lbl>
      <input
        placeholder="Juan Pérez Mora"
        value={form.name}
        onChange={(e) => setValue("name", e.target.value)}
        className={inputClass}
      />

      <Lbl>TELÉFONO</Lbl>
      <input
        placeholder="8888-0000"
        value={form.phone}
        onChange={(e) => setValue("phone", e.target.value)}
        className={inputClass}
      />

      <Lbl>FECHA DE INGRESO *</Lbl>
      <input
        type="date"
        value={form.joinedAt}
        onChange={(e) => setValue("joinedAt", e.target.value)}
        className={inputClass}
      />

      {expiryPreview && (
        <div className="mb-3.5 rounded-lg border border-green-300 bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-600">
          📅 Vencimiento calculado: {fmtDate(expiryPreview)}
        </div>
      )}

      <Lbl>PLAN</Lbl>
      <div className="mb-3.5 flex flex-wrap gap-1.5">
        {PLAN_OPTIONS.map((plan) => {
          const selected = form.plan === plan;
          const meta = PLAN_META[plan];
          return (
            <button
              key={plan}
              type="button"
              onClick={() => setValue("plan", plan)}
              className={cn(
                "min-w-20 flex-1 rounded-[10px] border-2 px-1.5 py-[9px] text-[11px] font-bold transition",
                selected ? "" : "border-slate-300 bg-white text-slate-600"
              )}
              style={
                selected
                  ? {
                      borderColor: meta?.color || T.accent,
                      background: meta?.bg || T.accentBg,
                      color: meta?.color || T.accent,
                    }
                  : undefined
              }
            >
              {plan}
            </button>
          );
        })}
      </div>

      <Lbl>GRUPO FAMILIAR</Lbl>
      <input
        placeholder="Familia Pérez (opcional)"
        value={form.familyGroup}
        onChange={(e) => setValue("familyGroup", e.target.value)}
        className={inputClass}
      />

      <Lbl>NOTAS</Lbl>
      <input
        placeholder="Lesiones, preferencias..."
        value={form.notes}
        onChange={(e) => setValue("notes", e.target.value)}
        className={inputClass}
      />

      <div className="mt-1 flex flex-col gap-2 sm:flex-row">
        <Btn variant="ghost" onClick={onClose} className="flex-1">
          Cancelar
        </Btn>
        <Btn
          onClick={handleSave}
          disabled={!form.cedula || !form.name || loading}
          className="flex-[2]"
        >
          {loading ? "Guardando..." : editing ? "Guardar Cambios" : "Registrar Miembro"}
        </Btn>
      </div>
    </Modal>
  );
}

export function PaymentModal({ members, onClose, onSave }) {
  const [visitorMode, setVisitorMode] = useState(false);
  const [selMember, setSelMember] = useState(null);
  const [method, setMethod] = useState("SINPE");
  const [amount, setAmount] = useState("");
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const suggestedAmounts = {
    Día: 1000,
    Semanal: 5000,
    Quincenal: 7500,
    Mensual: 15000,
    Bimensual: 28000,
  };

  const handleSelect = (member) => {
    setSelMember(member);
    if (member) setAmount(String(suggestedAmounts[member.plan] || ""));
  };

  const raw = parseInt(amount, 10) || 0;
  const discountAmount = Math.round((raw * discount) / 100);
  const final = raw - discountAmount;
  const canPay = raw > 0 && (visitorMode || (selMember && !selMember.blocked));

  const handlePay = async () => {
    setLoading(true);
    setError("");
    try {
      await onSave({
        memberId: visitorMode ? null : selMember?.id,
        memberName: visitorMode ? "Visitante Ocasional" : selMember?.name,
        cedula: visitorMode ? "—" : selMember?.cedula,
        plan: visitorMode ? "Día" : selMember?.plan,
        amount: final,
        method,
        discount,
        type: visitorMode ? "visitor" : "member",
      });
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Registrar Pago" onClose={onClose}>
      <ErrBox msg={error} />

      <div className="mb-[18px] flex flex-col gap-2 sm:flex-row">
        {["Miembro", "Visitante"].map((label) => {
          const active = (label === "Visitante") === visitorMode;
          return (
            <ToggleButton
              key={label}
              active={active}
              onClick={() => {
                setVisitorMode(label === "Visitante");
                setSelMember(null);
                setAmount("");
              }}
              className="flex-1"
              activeClassName="border-indigo-500 bg-indigo-50 text-indigo-500"
            >
              {label}
            </ToggleButton>
          );
        })}
      </div>

      {!visitorMode && (
        <>
          <Lbl>BUSCAR MIEMBRO</Lbl>
          <MemberSearch members={members} onSelect={handleSelect} />
          {selMember?.blocked && (
            <p className="mb-2.5 text-xs text-red-600">🚫 {selMember.blacklist_reason}</p>
          )}
          {selMember && !selMember.blocked && (
            <SurfaceBox className="mb-3.5 p-3.5">
              <div className="flex items-center gap-3">
                <Avatar name={selMember.name} size={38} />
                <div className="flex-1">
                  <div className="font-bold text-slate-900">{selMember.name}</div>
                  <div className="text-[11px] text-slate-400">
                    Vence: {fmtDate(selMember.expires_at)}
                  </div>
                </div>
                <PlanTag plan={selMember.plan} />
              </div>
            </SurfaceBox>
          )}
        </>
      )}

      <Lbl>
        MONTO A COBRAR (₡){" "}
        {!visitorMode && selMember && (
          <span className="text-[11px] font-normal text-slate-400">
            — monto sugerido, podés cambiarlo
          </span>
        )}
      </Lbl>
      <div className="relative mb-3.5">
        <span className="absolute left-[13px] top-1/2 -translate-y-1/2 font-bold text-slate-400">
          ₡
        </span>
        <input
          type="number"
          min="0"
          placeholder="Ingresá el monto..."
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={cn(
            inputClass,
            "pl-7 text-base font-bold font-mono",
            amount ? "border-2 border-indigo-500" : "border-2 border-slate-300"
          )}
        />
      </div>

      <Lbl>MÉTODO DE PAGO</Lbl>
      <div className="mb-3.5 flex flex-col gap-2 sm:flex-row">
        {["SINPE", "Efectivo"].map((option) => (
          <ToggleButton
            key={option}
            active={method === option}
            onClick={() => setMethod(option)}
            className="flex-1"
            activeClassName="border-indigo-500 bg-indigo-50 text-indigo-500"
          >
            {option === "SINPE" ? "📱 SINPE" : "💵 Efectivo"}
          </ToggleButton>
        ))}
      </div>

      {!visitorMode && (
        <>
          <Lbl>DESCUENTO (%)</Lbl>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {[0, 5, 10, 15, 20].map((value) => (
              <ToggleButton
                key={value}
                active={discount === value}
                onClick={() => setDiscount(value)}
                className="flex-1 px-1 py-2 text-[11px]"
                activeClassName="border-sky-600 bg-sky-100 text-sky-600"
              >
                {value}%
              </ToggleButton>
            ))}
          </div>
        </>
      )}

      {raw > 0 && (
        <SurfaceBox className="mb-4 px-4 py-3">
          {discountAmount > 0 && (
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-slate-600">Descuento ({discount}%)</span>
              <span className="text-red-600">-{fmtMoney(discountAmount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-bold text-slate-900">Total</span>
            <span className="font-mono text-[22px] font-black text-emerald-600">
              {fmtMoney(final)}
            </span>
          </div>
        </SurfaceBox>
      )}

      <Btn variant="green" onClick={handlePay} disabled={!canPay || loading} className="w-full">
        {loading ? "Procesando..." : `Confirmar Pago${raw > 0 ? ` — ${fmtMoney(final)}` : ""}`}
      </Btn>
    </Modal>
  );
}

export function AttendanceModal({ members, todayAttendance, onClose, onMark, onExit }) {
  const [visitorMode, setVisitorMode] = useState(false);
  const [selMember, setSelMember] = useState(null);
  const [loading, setLoading] = useState(false);

  const alreadyIn =
    selMember &&
    todayAttendance.some(
      (item) => Number(item.member_id) === Number(selMember.id) && !item.exit_time
    );
  const alreadyOut =
    selMember &&
    todayAttendance.some(
      (item) => Number(item.member_id) === Number(selMember.id) && Boolean(item.exit_time)
    );
  const canEnter = selMember && !selMember.blocked && !alreadyIn;

  const handleMark = async (member) => {
    setLoading(true);
    await onMark(member);
    setSelMember(null);
    setLoading(false);
  };

  const handleExit = async (member) => {
    setLoading(true);
    await onExit(member);
    setSelMember(null);
    setLoading(false);
  };

  return (
    <Modal title="Control de Asistencia" onClose={onClose} width={520}>
      <div className="mb-[18px] flex flex-col gap-2 sm:flex-row">
        {["Miembro", "Visitante del día"].map((label) => {
          const active = (label !== "Miembro") === visitorMode;
          return (
            <ToggleButton
              key={label}
              active={active}
              onClick={() => {
                setVisitorMode(label !== "Miembro");
                setSelMember(null);
              }}
              className="flex-1 text-xs"
              activeClassName="border-sky-600 bg-sky-100 text-sky-600"
            >
              {label}
            </ToggleButton>
          );
        })}
      </div>

      {!visitorMode && (
        <>
          <Lbl>BUSCAR MIEMBRO</Lbl>
          <MemberSearch members={members} onSelect={setSelMember} />

          {selMember && (
            <div
              className="mb-3.5 mt-1 rounded-xl border-[1.5px] bg-slate-50 p-4"
              style={{
                borderColor: selMember.blocked ? "#fca5a5" : alreadyIn ? "#93c5fd" : T.border,
              }}
            >
              <div className="mb-2.5 flex items-center gap-3">
                <Avatar name={selMember.name} size={44} />
                <div>
                  <div className="text-[15px] font-extrabold text-slate-900">
                    {selMember.name}
                  </div>
                  <div className="text-xs text-slate-400">CI: {selMember.cedula}</div>
                </div>
              </div>
              <div className="mb-2 flex gap-2">
                <PlanTag plan={selMember.plan} />
                <StatusBadge status={selMember.status} blocked={selMember.blocked} />
              </div>
              <div
                className="text-xs"
                style={{ color: diffDays(selMember.expires_at) <= 3 ? T.orange : T.text2 }}
              >
                Vence: {fmtDate(selMember.expires_at)}
              </div>
              {selMember.blocked && (
                <div className="mt-1.5 text-xs text-red-600">
                  🚫 {selMember.blacklist_reason}
                </div>
              )}
              {alreadyIn && (
                <div className="mt-1.5 text-xs font-semibold text-sky-600">
                  ✓ Dentro del gimnasio ahora
                </div>
              )}
              {alreadyOut && !alreadyIn && (
                <div className="mt-1.5 text-xs text-slate-400">
                  ↩ Ya registró entrada y salida hoy
                </div>
              )}
            </div>
          )}

          {canEnter && (
            <Btn
              variant="green"
              onClick={() => handleMark(selMember)}
              disabled={loading}
              className="mb-2 w-full"
            >
              {loading ? "Registrando..." : "✓ Registrar Entrada"}
            </Btn>
          )}

          {alreadyIn && (
            <Btn
              variant="ghost"
              onClick={() => handleExit(selMember)}
              disabled={loading}
              className="mb-2 w-full border-[1.5px] border-orange-600 bg-orange-100 text-orange-600 hover:bg-orange-200"
            >
              ↩ Registrar Salida
            </Btn>
          )}

          {selMember?.status === "overdue" && !selMember.blocked && !alreadyIn && (
            <div className="mb-2 rounded-[10px] border border-orange-200 bg-orange-100 px-3.5 py-2.5 text-xs text-orange-600">
              ⚠ Membresía vencida
              <Btn
                variant="ghost"
                onClick={() => handleMark(selMember)}
                className="mt-2 w-full border border-orange-600 bg-transparent text-[11px] text-orange-600 hover:bg-orange-200"
              >
                Permitir entrada de todos modos
              </Btn>
            </div>
          )}
        </>
      )}

      {visitorMode && (
        <div className="py-5 text-center">
          <div className="mb-2.5 text-[44px]">🎫</div>
          <div className="mb-1.5 text-[15px] font-bold text-slate-900">Visitante ocasional</div>
          <div className="mb-5 text-xs text-slate-400">Registrá también el pago</div>
          <Btn
            onClick={() => {
              handleMark(null);
              onClose();
            }}
            className="w-full"
          >
            Registrar Visitante
          </Btn>
        </div>
      )}

      <div className="mt-[18px] border-t border-slate-200 pt-3.5">
        <div className="mb-2 text-[11px] font-bold tracking-[0.5px] text-slate-400">
          HOY — {todayAttendance.length} REGISTROS
        </div>
        <div className="flex max-h-[190px] flex-col gap-[5px] overflow-y-auto">
          {[...todayAttendance].reverse().map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-2.5 rounded-[9px] border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  background: item.exit_time ? T.text3 : T.green,
                }}
              />
              <Avatar name={item.member_name} size={26} />
              <span className="flex-1 text-xs font-semibold text-slate-900">
                {item.member_name}
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                ▶{item.time}
                {item.exit_time && ` ↩${item.exit_time}`}
              </span>
              {item.exit_time ? (
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-400">
                  Salió
                </span>
              ) : (
                <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-600">
                  Dentro
                </span>
              )}
            </div>
          ))}
          {todayAttendance.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-400">Sin registros hoy</div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function AlertListModal({
  title,
  members,
  color,
  icon,
  type,
  onClose,
  onSelectMember,
}) {
  const [notified, setNotified] = useState({});

  const cleanPhone = (phone = "") => phone.replace(/[^0-9]/g, "");

  const waMsg = (member) => {
    const firstName = member.name.split(" ")[0];
    const expiry = fmtDate(member.expires_at);
    const days = diffDays(member.expires_at);
    const planMessage = {
      Mensual: { renovar: "para no perder continuidad" },
      Bimensual: { renovar: "para no perder continuidad" },
      Quincenal: { renovar: "a tiempo para seguir entrenando" },
      Semanal: { renovar: "a tiempo para seguir entrenando esta semana" },
      Día: { renovar: "cuando quieras" },
    };
    const meta = planMessage[member.plan] || { renovar: "a tiempo" };

    if (type === "overdue") {
      return encodeURIComponent(`Hola ${firstName}!

Te recordamos que tu membresia *${member.plan}* vencio el *${expiry}*.

Para seguir disfrutando del gimnasio, podes renovarla ${meta.renovar}.

_FitControl_`);
    }

    if (type === "today") {
      return encodeURIComponent(`Hola ${firstName}!

Tu membresia *${member.plan}* vence *HOY*.

Acercate al gimnasio para renovarla y no perder acceso.

_FitControl_`);
    }

    return encodeURIComponent(`Hola ${firstName}!

Te avisamos que tu membresia *${member.plan}* vence el *${expiry}* (en *${days} dia${days !== 1 ? "s" : ""}*).

Renovala ${meta.renovar}.

_FitControl_`);
  };

  const sendOne = (member) => {
    window.open(`https://wa.me/506${cleanPhone(member.phone)}?text=${waMsg(member)}`, "_blank");
    setNotified((current) => ({ ...current, [member.id]: true }));
  };

  const sendAll = () => {
    members
      .filter((member) => !notified[member.id])
      .forEach((member, index) => {
        setTimeout(() => {
          window.open(
            `https://wa.me/506${cleanPhone(member.phone)}?text=${waMsg(member)}`,
            "_blank"
          );
          setNotified((current) => ({ ...current, [member.id]: true }));
        }, index * 800);
      });
  };

  const pending = members.filter((member) => !notified[member.id]);
  const notifiedCount = Object.keys(notified).length;

  return (
    <Modal title={title} onClose={onClose} width={540}>
      <div
        className="mb-3 flex flex-col gap-2 rounded-xl border-[1.5px] px-3.5 py-2.5 sm:flex-row sm:items-center"
        style={{ background: `${color}18`, borderColor: `${color}44` }}
      >
        <span className="text-xl">{icon}</span>
        <div className="flex-1">
          <span className="text-[13px] font-bold" style={{ color }}>
            {members.length} miembro{members.length !== 1 ? "s" : ""}
          </span>
          {notifiedCount > 0 && (
            <span className="ml-2.5 text-[11px] font-semibold text-emerald-600">
              ✓ {notifiedCount} avisado{notifiedCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <span className="text-[11px] text-slate-400">Tocá 📱 para WhatsApp</span>
      </div>

      {pending.length > 0 ? (
        <button
          type="button"
          onClick={sendAll}
          className="mb-3.5 flex w-full items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-green-300 bg-green-100 px-3 py-2.5 text-[13px] font-bold text-green-700 transition hover:bg-green-200"
        >
          📱 Avisar a todos por WhatsApp ({pending.length} pendiente
          {pending.length !== 1 ? "s" : ""})
        </button>
      ) : (
        <div className="mb-3.5 rounded-[10px] border border-green-300 bg-emerald-100 px-3.5 py-2.5 text-center text-[13px] font-bold text-emerald-600">
          ✅ Ya se avisó a todos
        </div>
      )}

      <div className="flex max-h-[380px] flex-col gap-[7px] overflow-y-auto">
        {members.map((member) => {
          const alreadyNotified = Boolean(notified[member.id]);
          return (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-xl border-[1.5px] px-3.5 py-[11px]"
              style={{
                background: alreadyNotified ? "#f0fdf4" : "#f8fafc",
                borderColor: alreadyNotified ? "#86efac" : T.border,
              }}
            >
              <Avatar name={member.name} size={40} />
              <button
                type="button"
                onClick={() => {
                  onSelectMember(member);
                  onClose();
                }}
                className="flex-1 cursor-pointer text-left"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-900">{member.name}</span>
                  {alreadyNotified && (
                    <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                      ✓ Avisado
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[11px]" style={{ color }}>
                  {type === "overdue"
                    ? `Venció: ${fmtDate(member.expires_at)}`
                    : type === "today"
                      ? "Vence HOY"
                      : `Vence en ${diffDays(member.expires_at)} días — ${fmtDate(
                          member.expires_at
                        )}`}
                </div>
              </button>
              <div className="flex flex-col items-end gap-[5px]">
                <PlanTag plan={member.plan} />
                <button
                  type="button"
                  onClick={() => sendOne(member)}
                  className="flex items-center gap-[5px] rounded-lg border border-green-300 bg-green-100 px-2.5 py-1 text-[11px] font-bold text-green-700 transition hover:bg-green-200"
                  style={{ opacity: alreadyNotified ? 0.7 : 1 }}
                >
                  {alreadyNotified ? "📱 Reenviar" : "📱 Avisar"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

export function CashReportModal({ onClose }) {
  const [period, setPeriod] = useState("day");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchReport = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/payments/report?period=${period}`);
        if (active) setReport(response.data);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchReport();

    return () => {
      active = false;
    };
  }, [period]);

  const periodLabel = period === "day" ? "Día" : period === "week" ? "Semana" : "Mes";
  const periodTotal = period === "day" ? "HOY" : period === "week" ? "ESTA SEMANA" : "ESTE MES";
  const fmtMoneyPDF = (n) => `c/${Number(n || 0).toLocaleString("es-CR")}`;

  const downloadPDF = async () => {
    if (!report) return;

    if (!window.jspdf) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const now = new Date();
    const dateStr = now.toLocaleDateString("es-CR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const timeStr = now.toLocaleTimeString("es-CR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const fileDate = now.toISOString().slice(0, 10);
    const sinpe = report.byMethod.find((item) => item.method === "SINPE");
    const cash = report.byMethod.find((item) => item.method === "Efectivo");

    const W = 210;
    const pad = 20;
    let y = 0;

    doc.setFillColor(5, 150, 105);
    doc.rect(0, 0, W, 38, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("FitControl", pad, 16);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(209, 250, 229);
    doc.text(`Cierre de Caja — ${periodLabel}`, pad, 24);
    doc.text(`Generado: ${dateStr} ${timeStr}`, pad, 31);
    y = 50;

    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(134, 239, 172);
    doc.roundedRect(pad, y, W - pad * 2, 32, 4, 4, "FD");
    doc.setTextColor(6, 95, 70);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL ${periodTotal}`, W / 2, y + 10, { align: "center" });
    doc.setFontSize(22);
    doc.setTextColor(5, 150, 105);
    doc.text(fmtMoneyPDF(report.summary.total), W / 2, y + 22, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${report.summary.transactions} transacciones · ${report.summary.visitors} visitantes`,
      W / 2,
      y + 30,
      { align: "center" }
    );
    y += 42;

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(148, 163, 184);
    doc.text("DESGLOSE POR MÉTODO", pad, y);
    y += 5;

    const half = (W - pad * 2 - 8) / 2;
    doc.setFillColor(238, 242, 255);
    doc.setDrawColor(199, 210, 254);
    doc.roundedRect(pad, y, half, 22, 3, 3, "FD");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(99, 102, 241);
    doc.text("SINPE", pad + 5, y + 8);
    doc.setFontSize(13);
    doc.text(fmtMoneyPDF(sinpe?.total || 0), pad + 5, y + 17);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(`${sinpe?.count || 0} transacciones`, pad + half - 5, y + 17, {
      align: "right",
    });

    const x2 = pad + half + 8;
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(253, 230, 138);
    doc.roundedRect(x2, y, half, 22, 3, 3, "FD");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(245, 158, 11);
    doc.text("Efectivo", x2 + 5, y + 8);
    doc.setFontSize(13);
    doc.text(fmtMoneyPDF(cash?.total || 0), x2 + 5, y + 17);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(`${cash?.count || 0} transacciones`, x2 + half - 5, y + 17, {
      align: "right",
    });
    y += 30;

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(148, 163, 184);
    doc.text("DESGLOSE POR PLAN", pad, y);
    y += 5;

    const planColors = {
      Mensual: { bg: [237, 233, 254], bd: [196, 181, 253], txt: [124, 58, 237] },
      Semanal: { bg: [219, 234, 254], bd: [147, 197, 253], txt: [29, 78, 216] },
      Día: { bg: [254, 249, 195], bd: [253, 224, 71], txt: [161, 98, 7] },
      Visitante: { bg: [240, 253, 244], bd: [134, 239, 172], txt: [21, 128, 61] },
    };

    report.byPlan.forEach((planItem) => {
      const col =
        planColors[planItem.plan] || {
          bg: [241, 245, 249],
          bd: [203, 213, 225],
          txt: [71, 85, 105],
        };
      doc.setFillColor(...col.bg);
      doc.setDrawColor(...col.bd);
      doc.roundedRect(pad, y, W - pad * 2, 12, 2, 2, "FD");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...col.txt);
      doc.text(planItem.plan, pad + 5, y + 8);
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      doc.text(`${planItem.count} pago${planItem.count !== 1 ? "s" : ""}`, W / 2, y + 8, {
        align: "center",
      });
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text(fmtMoneyPDF(planItem.total), W - pad - 5, y + 8, { align: "right" });
      y += 15;
    });

    y = Math.max(y + 10, 260);
    doc.setDrawColor(226, 232, 240);
    doc.line(pad, y, W - pad, y);
    y += 6;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(
      "FitControl - Sistema de Administracion de Gimnasio - Reporte generado automaticamente",
      W / 2,
      y,
      { align: "center" }
    );

    doc.save(`cierre-caja-${periodLabel.toLowerCase()}-${fileDate}.pdf`);
  };

  return (
    <Modal title="Cierre de Caja" onClose={onClose} width={520}>
      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        {[
          ["day", "Día"],
          ["week", "Semana"],
          ["month", "Mes"],
        ].map(([key, label]) => (
          <ToggleButton
            key={key}
            active={period === key}
            onClick={() => setPeriod(key)}
            className="flex-1"
            activeClassName="border-emerald-600 bg-emerald-100 text-emerald-600"
          >
            {label}
          </ToggleButton>
        ))}
      </div>

      {loading && <div className="p-7 text-center text-slate-400">Cargando...</div>}

      {report && !loading && (
        <>
          <div className="mb-4 rounded-2xl bg-linear-to-br from-emerald-600 to-emerald-400 p-[22px] text-center">
            <div className="mb-1.5 text-xs font-bold tracking-[1px] text-emerald-100">
              TOTAL {periodTotal}
            </div>
            <div className="font-mono text-4xl font-black text-white">
              {fmtMoney(report.summary.total)}
            </div>
            <div className="mt-1 text-xs text-emerald-100">
              {report.summary.transactions} transacciones · {report.summary.visitors} visitantes
            </div>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {report.byMethod.map((method) => (
              <SurfaceBox key={method.method} className="p-3.5">
                <div className="mb-1.5 text-[11px] font-bold text-slate-600">
                  {method.method === "SINPE" ? "📱 SINPE" : "💵 Efectivo"}
                </div>
                <div
                  className="font-mono text-xl font-extrabold"
                  style={{ color: method.method === "SINPE" ? "#6366f1" : T.yellow }}
                >
                  {fmtMoney(method.total)}
                </div>
                <div className="text-[11px] text-slate-400">{method.count} transacciones</div>
              </SurfaceBox>
            ))}
          </div>

          <div className="mb-4">
            {report.byPlan.map((planItem) => (
              <SurfaceBox
                key={planItem.plan}
                className="mb-[5px] flex items-center gap-2.5 px-3 py-[9px]"
              >
                <PlanTag plan={planItem.plan} />
                <span className="flex-1 text-xs text-slate-600">
                  {planItem.count} pago{planItem.count !== 1 ? "s" : ""}
                </span>
                <span className="font-mono text-[13px] font-bold text-slate-900">
                  {fmtMoney(planItem.total)}
                </span>
              </SurfaceBox>
            ))}
          </div>

          <button
            type="button"
            onClick={downloadPDF}
            className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-emerald-600 px-3 py-[11px] text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            📄 Descargar PDF — {periodLabel}
          </button>
        </>
      )}
    </Modal>
  );
}


