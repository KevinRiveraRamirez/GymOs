import { PlanTag, StatusBadge, Avatar, Btn, Card, Modal, SurfaceBox, ToggleButton } from "./ui";
import { T, diffDays, fmtDate, fmtMoney, PLAN_OPTIONS, inputClass } from "./utils";
import api from "../api";
import { cn } from "../lib/cn";

export function DashboardOverview({
  alerts,
  activeCount,
  blockedCount,
  setAlertModal,
  todayAtt,
  todayPayments,
  todayTotal,
  todaySINPE,
  todayEfectivo,
}) {
  return (
    <div>
      {(alerts.expiringToday?.length > 0 ||
        alerts.expiringSoon?.length > 0 ||
        alerts.overdue?.length > 0) && (
        <div className="mb-5 flex flex-col gap-2">
          {alerts.expiringToday?.length > 0 && (
            <div className="overflow-hidden rounded-[14px] border-[1.5px] border-orange-200 bg-orange-100">
              <button
                type="button"
                onClick={() =>
                  setAlertModal({
                    title: "Vencen HOY",
                    members: alerts.expiringToday,
                    color: T.orange,
                    icon: "🔴",
                    type: "today",
                  })
                }
                className="flex w-full items-center gap-2 px-4 py-[11px] text-left"
              >
                <span className="text-base">🔴</span>
                <span className="flex-1 text-[13px] font-bold text-orange-600">
                  {alerts.expiringToday.length} membresía
                  {alerts.expiringToday.length > 1 ? "s" : ""} vence
                  {alerts.expiringToday.length === 1 ? "" : "n"} HOY
                </span>
                <span className="rounded-full border border-orange-200 bg-white px-2.5 py-[3px] text-[11px] font-bold text-orange-600">
                  Ver y avisar →
                </span>
              </button>
              <div className="flex flex-wrap gap-2 border-t border-orange-200 px-4 py-2">
                {alerts.expiringToday.map((member) => (
                  <span
                    key={member.id}
                    className="rounded-full border border-orange-200 bg-white px-2.5 py-[3px] text-[11px] font-semibold text-orange-600"
                  >
                    {member.name.split(" ")[0]} · {member.plan}
                  </span>
                ))}
              </div>
            </div>
          )}

          {alerts.expiringSoon?.length > 0 && (
            <div className="overflow-hidden rounded-[14px] border-[1.5px] border-amber-200 bg-amber-100">
              <button
                type="button"
                onClick={() =>
                  setAlertModal({
                    title: "Vencen en 1-3 días",
                    members: alerts.expiringSoon,
                    color: T.yellow,
                    icon: "⚠️",
                    type: "soon",
                  })
                }
                className="flex w-full items-center gap-2 px-4 py-[11px] text-left"
              >
                <span className="text-base">⚠️</span>
                <span className="flex-1 text-[13px] font-bold text-amber-600">
                  {alerts.expiringSoon.length} vence
                  {alerts.expiringSoon.length === 1 ? "" : "n"} en 1-3 días
                </span>
                <span className="rounded-full border border-amber-200 bg-white px-2.5 py-[3px] text-[11px] font-bold text-amber-600">
                  Ver y avisar →
                </span>
              </button>
              <div className="flex flex-wrap gap-2 border-t border-amber-200 px-4 py-2">
                {alerts.expiringSoon.map((member) => (
                  <span
                    key={member.id}
                    className="rounded-full border border-amber-200 bg-white px-2.5 py-[3px] text-[11px] font-semibold text-amber-600"
                  >
                    {member.name.split(" ")[0]} · {diffDays(member.expires_at)}d
                  </span>
                ))}
              </div>
            </div>
          )}

          {alerts.overdue?.length > 0 && (
            <div className="overflow-hidden rounded-[14px] border-[1.5px] border-violet-300 bg-violet-100">
              <button
                type="button"
                onClick={() =>
                  setAlertModal({
                    title: "Cuotas vencidas",
                    members: alerts.overdue,
                    color: "#7c3aed",
                    icon: "💸",
                    type: "overdue",
                  })
                }
                className="flex w-full items-center gap-2 px-4 py-[11px] text-left"
              >
                <span className="text-base">💸</span>
                <span className="flex-1 text-[13px] font-bold text-violet-600">
                  {alerts.overdue.length} miembro{alerts.overdue.length > 1 ? "s" : ""} con cuota
                  vencida
                </span>
                <span className="rounded-full border border-violet-300 bg-white px-2.5 py-[3px] text-[11px] font-bold text-violet-600">
                  Ver y avisar →
                </span>
              </button>
              <div className="flex flex-wrap gap-2 border-t border-violet-300 px-4 py-2">
                {alerts.overdue.map((member) => (
                  <span
                    key={member.id}
                    className="rounded-full border border-violet-300 bg-white px-2.5 py-[3px] text-[11px] font-semibold text-violet-600"
                  >
                    {member.name.split(" ")[0]} · venció {fmtDate(member.expires_at)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
        {[
          { icon: "👥", label: "Miembros Activos", val: activeCount, color: "#6366f1", bg: "#eef2ff" },
          { icon: "📋", label: "Asistencia Hoy", val: todayAtt.length, color: T.blue, bg: T.blueBg },
          { icon: "💰", label: "Ingresos Hoy", val: fmtMoney(todayTotal), color: T.green, bg: T.greenBg },
          { icon: "🚫", label: "Bloqueados", val: blockedCount, color: T.red, bg: T.redBg },
        ].map((item) => (
          <Card key={item.label} className="px-5 py-[18px]">
            <div className="mb-2.5 flex items-center gap-2">
              <div
                className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] text-base"
                style={{ background: item.bg }}
              >
                {item.icon}
              </div>
              <span className="text-[11px] font-semibold text-slate-600">{item.label}</span>
            </div>
            <div
              className={cn(
                "font-mono font-black",
                typeof item.val === "string" && item.val.length > 8 ? "text-base" : "text-[28px]"
              )}
              style={{ color: item.color }}
            >
              {item.val}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-[14px] lg:grid-cols-2">
        <Card>
          <div className="mb-3.5 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900">Entradas de hoy</span>
            <span className="rounded-full bg-indigo-100 px-2.5 py-[3px] text-[11px] font-bold text-indigo-500">
              {todayAtt.length}
            </span>
          </div>
          {todayAtt.length === 0 && (
            <div className="p-5 text-center text-xs text-slate-400">Sin registros aún</div>
          )}
          {[...todayAtt].reverse().slice(0, 6).map((item, index) => (
            <div
              key={index}
              className="mb-[5px] flex items-center gap-[9px] rounded-[9px] border border-slate-200 bg-slate-50 px-2.5 py-2"
            >
              <Avatar name={item.member_name} size={28} />
              <span className="flex-1 text-xs font-semibold text-slate-900">{item.member_name}</span>
              <span className="font-mono text-[11px] text-slate-400">{item.time}</span>
              <span
                className="h-[7px] w-[7px] rounded-full"
                style={{ background: item.exit_time ? T.text3 : T.green }}
              />
            </div>
          ))}
        </Card>

        <Card>
          <div className="mb-3.5 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900">Pagos de hoy</span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-[3px] text-[11px] font-bold text-emerald-600">
              {fmtMoney(todayTotal)}
            </span>
          </div>
          <div className="mb-3.5 flex flex-col gap-2 sm:flex-row">
            <div className="flex-1 rounded-[10px] border border-indigo-200 bg-indigo-100 px-3 py-2.5">
              <div className="mb-0.5 text-[10px] font-bold text-slate-400">📱 SINPE</div>
              <div className="font-mono text-sm font-extrabold text-indigo-500">{fmtMoney(todaySINPE)}</div>
            </div>
            <div className="flex-1 rounded-[10px] border border-amber-200 bg-amber-100 px-3 py-2.5">
              <div className="mb-0.5 text-[10px] font-bold text-slate-400">💵 Efectivo</div>
              <div className="font-mono text-sm font-extrabold text-amber-600">{fmtMoney(todayEfectivo)}</div>
            </div>
          </div>
          {todayPayments.length === 0 && (
            <div className="p-2.5 text-center text-xs text-slate-400">Sin pagos hoy</div>
          )}
          {todayPayments.slice(0, 5).map((payment, index) => (
            <div
              key={index}
              className="mb-1 flex items-center gap-[9px] rounded-[9px] border border-slate-200 bg-slate-50 px-2.5 py-[7px]"
            >
              <span>{payment.method === "SINPE" ? "📱" : "💵"}</span>
              <span className="flex-1 text-xs font-semibold text-slate-900">{payment.member_name}</span>
              <span className="font-mono text-xs font-bold text-emerald-600">
                {fmtMoney(payment.amount)}
              </span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

export function MembersView({
  search,
  setSearch,
  filterStatus,
  setFilterStatus,
  filterPlan,
  setFilterPlan,
  loadingData,
  members,
  setSelectedMember,
}) {
  return (
    <div>
      <div className="mb-[14px] flex flex-col gap-2">
        <input
          placeholder="🔍  Nombre, cédula o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn(inputClass, "w-full bg-white")}
        />
        <div className="-mx-1 overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2 px-1">
            {["all", "active", "overdue", "inactive", "blocked"].map((status) => (
              <ToggleButton
                key={status}
                active={filterStatus === status}
                onClick={() => setFilterStatus(status)}
                className="shrink-0 px-3 py-2 text-[11px]"
                activeClassName="border-indigo-500 bg-indigo-50 text-indigo-500"
              >
                {{
                  all: "Todos",
                  active: "Activos",
                  overdue: "Vencidos",
                  inactive: "Inactivos",
                  blocked: "Bloqueados",
                }[status]}
              </ToggleButton>
            ))}
          </div>
        </div>
        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
          className="w-full rounded-[9px] border-[1.5px] border-slate-300 bg-white px-3 py-2 text-[11px] text-slate-600 outline-none sm:w-auto"
        >
          <option value="all">Todos los planes</option>
          {PLAN_OPTIONS.map((plan) => (
            <option key={plan}>{plan}</option>
          ))}
        </select>
      </div>

      <div className="mb-2.5 text-[11px] text-slate-400">
        {loadingData ? "Buscando..." : `${members.length} resultado${members.length !== 1 ? "s" : ""}`}
      </div>

      <div className="flex flex-col gap-[7px]">
        {members.map((member) => {
          const days = diffDays(member.expires_at);
          return (
            <button
              key={member.id}
              type="button"
              onClick={() => setSelectedMember(member)}
              className="rounded-[14px] border-[1.5px] bg-white px-4 py-[14px] text-left shadow-[0_1px_3px_#00000008] transition hover:shadow-[0_4px_12px_#00000012] sm:px-[18px]"
              style={{
                borderColor: member.blocked ? "#fca5a5" : days <= 3 && days > 0 ? "#fed7aa" : T.border,
              }}
            >
              <div className="flex items-start gap-3.5">
                <Avatar name={member.name} size={42} />
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 truncate text-sm font-bold text-slate-900">{member.name}</div>
                  <div className="text-xs text-slate-400">
                    CI: {member.cedula}
                    {member.phone ? ` · ${member.phone}` : ""}
                  </div>
                </div>
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm"
                  style={{
                    background: days <= 0 ? T.redBg : days <= 3 ? T.orangeBg : T.greenBg,
                  }}
                >
                  {days <= 0 ? "⚠️" : days <= 3 ? "⏰" : "✓"}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <PlanTag plan={member.plan} />
                <StatusBadge status={member.status} blocked={member.blocked} />
              </div>
            </button>
          );
        })}

        {members.length === 0 && !loadingData && (
          <div className="p-[60px] text-center text-sm text-slate-400">Sin resultados</div>
        )}
      </div>
    </div>
  );
}

export function AttendanceView({ todayAtt, loadAttendance, showToast }) {
  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-2.5 md:grid-cols-3">
        {[
          { label: "Total hoy", val: todayAtt.length, color: "#6366f1" },
          {
            label: "Dentro ahora",
            val: todayAtt.filter((item) => !item.exit_time && item.type === "member").length,
            color: T.green,
          },
          {
            label: "Visitantes",
            val: todayAtt.filter((item) => item.type === "visitor").length,
            color: T.yellow,
          },
        ].map((item) => (
          <Card key={item.label} className="p-[14px] text-center">
            <div className="font-mono text-[28px] font-black" style={{ color: item.color }}>
              {item.val}
            </div>
            <div className="mt-[3px] text-[11px] text-slate-600">{item.label}</div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="mb-3.5 text-sm font-bold text-slate-900">
          Registro —{" "}
          {new Date().toLocaleDateString("es-CR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </div>
        {todayAtt.length === 0 && (
          <div className="p-[30px] text-center text-xs text-slate-400">Sin entradas aún</div>
        )}
        <div className="flex flex-col gap-1.5">
          {[...todayAtt].reverse().map((item, index) => (
            <div
              key={index}
              className="rounded-[10px] border bg-slate-50 px-3.5 py-2.5"
              style={{ borderColor: item.exit_time ? T.border : "#86efac" }}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className="mt-3 h-[9px] w-[9px] shrink-0 rounded-full"
                  style={{ background: item.exit_time ? T.text3 : T.green }}
                />
                <Avatar name={item.member_name} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-slate-900">{item.member_name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <PlanTag plan={item.plan} />
                    <span className="font-mono text-[11px] text-slate-600">
                      ▶{item.time}
                      {item.exit_time && ` ↩${item.exit_time}`}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                {item.exit_time ? (
                  <span className="shrink-0 rounded-full bg-slate-100 px-[9px] py-[3px] text-[10px] text-slate-400">
                    Salió
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      await api.patch(`/attendance/${item.id}/exit`);
                      await loadAttendance();
                      showToast(`↩ Salida: ${item.member_name}`);
                    }}
                    className="w-full rounded-lg border-[1.5px] border-orange-600 bg-orange-100 px-[11px] py-1.5 text-[11px] font-bold text-orange-600 transition hover:bg-orange-200 sm:w-auto"
                  >
                    ↩ Salida
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function PaymentsView({ payments, todayTotal, todaySINPE, todayEfectivo }) {
  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-2.5 md:grid-cols-3">
        {[
          { label: "Total hoy", val: fmtMoney(todayTotal), color: T.green },
          { label: "📱 SINPE", val: fmtMoney(todaySINPE), color: "#6366f1" },
          { label: "💵 Efectivo", val: fmtMoney(todayEfectivo), color: T.yellow },
        ].map((item) => (
          <Card key={item.label} className="text-center">
            <div className="mb-1.5 text-[11px] font-semibold text-slate-600">{item.label}</div>
            <div className="font-mono text-base font-black" style={{ color: item.color }}>
              {item.val}
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="mb-3.5 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900">Historial del mes</span>
          <span className="text-xs text-slate-400">{payments.length} registros</span>
        </div>
        {payments.length === 0 && (
          <div className="p-[30px] text-center text-slate-400">Sin pagos este mes</div>
        )}
        <div className="flex flex-col gap-[5px]">
          {payments.map((payment, index) => (
            <div
              key={index}
              className="rounded-[10px] border border-slate-200 bg-slate-50 px-3.5 py-2.5"
            >
              <div className="flex items-start gap-2.5">
                <span className="pt-0.5 text-lg">{payment.method === "SINPE" ? "📱" : "💵"}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-slate-900">{payment.member_name}</div>
                  <div className="text-[11px] text-slate-400">
                    {fmtDate(payment.paid_at)} · {payment.method}
                  </div>
                </div>
                <span className="font-mono text-sm font-extrabold text-emerald-600">
                  {fmtMoney(payment.amount)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <PlanTag plan={payment.plan} />
                {payment.discount > 0 && (
                  <span className="text-[10px] text-red-600">-{payment.discount}%</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function BlacklistView({ members, toggleBlock }) {
  const blockedMembers = members.filter((member) => member.blocked);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2.5 rounded-xl border-[1.5px] border-red-300 bg-red-100 px-[18px] py-[14px]">
        <span className="text-2xl">🚫</span>
        <div>
          <div className="text-sm font-bold text-red-600">
            {blockedMembers.length} bloqueado{blockedMembers.length !== 1 ? "s" : ""}
          </div>
          <div className="text-xs text-slate-600">Sin acceso al gimnasio</div>
        </div>
      </div>

      {blockedMembers.length === 0 && (
        <div className="p-[60px] text-center text-slate-400">No hay miembros bloqueados</div>
      )}

      {blockedMembers.map((member) => (
        <div
          key={member.id}
          className="mb-2 rounded-[13px] border-[1.5px] border-red-300 bg-white px-4 py-[14px] shadow-[0_1px_4px_#00000009]"
        >
          <div className="mb-2 flex items-start gap-[13px]">
            <Avatar name={member.name} size={40} />
            <div className="flex-1">
              <div className="text-sm font-bold text-slate-900">{member.name}</div>
              <div className="text-xs text-slate-400">CI: {member.cedula}</div>
            </div>
          </div>
          <Btn
            variant="ghost"
            onClick={() => toggleBlock(member)}
            className="mb-3 w-full border border-emerald-600 bg-transparent text-[11px] text-emerald-600 hover:bg-emerald-50 sm:mb-2 sm:w-auto"
          >
            ✓ Desbloquear
          </Btn>
          <div className="rounded-lg border border-red-300 bg-red-100 px-3 py-2">
            <span className="text-xs text-red-600">
              🚫 {member.blacklist_reason || "Sin razón especificada"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MemberDetailModal({
  member,
  onClose,
  toggleBlock,
  setEditMember,
  showToast,
  loadMembers,
  loadAlerts,
}) {
  const days = diffDays(member.expires_at);

  return (
    <Modal title="Perfil del Miembro" onClose={onClose} width={500}>
      <SurfaceBox className="mb-5 flex items-center gap-3.5 p-4">
        <Avatar name={member.name} size={54} />
        <div className="flex-1">
          <div className="text-base font-extrabold text-slate-900">{member.name}</div>
          <div className="mt-0.5 text-xs text-slate-400">
            CI: {member.cedula} · {member.phone}
          </div>
          <div className="mt-2 flex gap-1.5">
            <PlanTag plan={member.plan} />
            <StatusBadge status={member.status} blocked={member.blocked} />
          </div>
        </div>
      </SurfaceBox>

      <div className="mb-[14px] grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {[
          { label: "Ingresó", val: fmtDate(member.joined_at) },
          { label: "Vence", val: fmtDate(member.expires_at), warn: days <= 7 && days >= 0 },
          { label: "Plan", val: member.plan },
          { label: "Días restantes", val: days > 0 ? `${days} días` : "Vencido", warn: days <= 0 },
        ].map((item) => (
          <SurfaceBox key={item.label} className="px-3.5 py-2.5">
            <div className="mb-[3px] text-[10px] font-bold text-slate-400">
              {item.label.toUpperCase()}
            </div>
            <div className="text-[13px] font-bold" style={{ color: item.warn ? T.orange : T.text }}>
              {item.val}
            </div>
          </SurfaceBox>
        ))}
      </div>

      {member.notes && (
        <div className="mb-3 rounded-[10px] border border-amber-200 bg-amber-100 px-3.5 py-2.5 text-xs text-amber-600">
          📝 {member.notes}
        </div>
      )}
      {member.blocked && (
        <div className="mb-3 rounded-[10px] border border-red-300 bg-red-100 px-3.5 py-2.5 text-xs text-red-600">
          🚫 {member.blacklist_reason}
        </div>
      )}

      <div className="mb-2 flex flex-col gap-2 sm:flex-row">
        <Btn variant="ghost" onClick={() => toggleBlock(member)} className="flex-1 text-[11px]">
          {member.blocked ? "✓ Desbloquear" : "🚫 Bloquear"}
        </Btn>
        <Btn
          variant="ghost"
          onClick={() => {
            setEditMember(member);
            onClose();
          }}
          className="flex-1 text-[11px]"
        >
          ✏️ Editar
        </Btn>
      </div>

      <button
        type="button"
        onClick={async () => {
          if (!window.confirm(`¿Eliminar a ${member.name}? Esta acción no se puede deshacer.`)) {
            return;
          }
          try {
            await api.delete(`/members/${member.id}`);
            showToast(`🗑️ ${member.name} eliminado`);
            onClose();
            loadMembers();
            loadAlerts();
          } catch (e) {
            showToast(`❌ ${e.response?.data?.error || "Error al eliminar"}`, "err");
          }
        }}
        className="w-full rounded-[10px] border-[1.5px] border-red-300 bg-red-100 px-3 py-[9px] text-xs font-bold text-red-600 transition hover:bg-red-200"
      >
        🗑️ Eliminar miembro
      </button>
    </Modal>
  );
}
