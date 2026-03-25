import { useCallback, useEffect, useState } from "react";
import AppLogo from "./AppLogo";
import { useAuth } from "./AuthContext";
import { cn } from "./lib/cn";
import api from "./api";
import { AlertListModal, AttendanceModal, CashReportModal, MemberModal, PaymentModal } from "./dashboard/modals";
import {
  BlacklistView,
  DashboardOverview,
  MembersView,
  MemberDetailModal,
  AttendanceView,
  PaymentsView,
} from "./dashboard/views";
import { Btn } from "./dashboard/ui";
import { DASHBOARD_LABELS, NAV, T, fmtMoney, todayStr } from "./dashboard/utils";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [payments, setPayments] = useState([]);
  const [alerts, setAlerts] = useState({ overdue: [], expiringToday: [], expiringSoon: [] });
  const [modal, setModal] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [editMember, setEditMember] = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPlan, setFilterPlan] = useState("all");
  const [toast, setToast] = useState(null);
  const [loadingData, setLoadingData] = useState(false);

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadMembers = useCallback(async () => {
    setLoadingData(true);
    try {
      const params = new URLSearchParams({ limit: 300 });
      if (search) params.set("search", search);
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterPlan !== "all") params.set("plan", filterPlan);
      const response = await api.get(`/members?${params}`);
      setMembers(response.data.members || []);
    } catch {
      showToast("❌ Error al cargar miembros", "err");
    } finally {
      setLoadingData(false);
    }
  }, [search, filterStatus, filterPlan]);

  const loadAttendance = useCallback(async () => {
    try {
      const response = await api.get(`/attendance?date=${todayStr()}`);
      setAttendance(response.data || []);
    } catch {
      return null;
    }
  }, []);

  const loadPayments = useCallback(async () => {
    try {
      const response = await api.get("/payments?period=month&limit=200");
      setPayments(response.data || []);
    } catch {
      return null;
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    try {
      const response = await api.get("/members/alerts");
      setAlerts(response.data || { overdue: [], expiringToday: [], expiringSoon: [] });
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    loadAttendance();
    loadAlerts();
    loadPayments();
    const timer = setInterval(() => {
      loadAttendance();
      loadPayments();
    }, 3000);
    return () => clearInterval(timer);
  }, [loadAttendance, loadAlerts, loadPayments]);

  const saveMember = async (form) => {
    if (editMember) {
      await api.put(`/members/${editMember.id}`, {
        name: form.name,
        phone: form.phone,
        plan: form.plan,
        joinedAt: form.joinedAt,
        familyGroup: form.familyGroup,
        notes: form.notes,
      });
      showToast("✏️ Cambios guardados");
    } else {
      await api.post("/members", form);
      showToast(`✅ ${form.name} registrado`);
    }
    setEditMember(null);
    loadMembers();
    loadAlerts();
  };

  const markAttendance = async (member) => {
    try {
      if (member) {
        await api.post("/attendance", {
          memberId: member.id,
          memberName: member.name,
          cedula: member.cedula,
          plan: member.plan,
          type: "member",
        });
        showToast(`📋 Entrada: ${member.name}`);
      } else {
        await api.post("/attendance", {
          memberName: "Visitante",
          cedula: "—",
          plan: "Día",
          type: "visitor",
        });
        showToast("🎫 Visitante registrado");
      }
      await loadAttendance();
    } catch (e) {
      showToast(`❌ ${e.response?.data?.error || "Error"}`, "err");
    }
  };

  const markExit = async (member) => {
    try {
      const entry = attendance.find(
        (item) => Number(item.member_id) === Number(member.id) && !item.exit_time
      );
      if (entry) {
        await api.patch(`/attendance/${entry.id}/exit`);
        showToast(`↩ Salida: ${member.name}`);
        await loadAttendance();
      } else {
        showToast("❌ No se encontró entrada activa", "err");
      }
    } catch (e) {
      showToast(`❌ ${e.response?.data?.error || "Error"}`, "err");
    }
  };

  const registerPayment = async (data) => {
    await api.post("/payments", data);
    showToast(`💳 Pago ${fmtMoney(data.amount)} — ${data.method}`);
    await Promise.all([loadPayments(), loadMembers(), loadAlerts()]);
  };

  const toggleBlock = async (member, reason = "") => {
    await api.patch(`/members/${member.id}/block`, {
      blocked: !member.blocked,
      blacklistReason: reason,
    });
    showToast(member.blocked ? `✅ ${member.name} desbloqueado` : `🚫 ${member.name} bloqueado`);
    setSelectedMember(null);
    loadMembers();
    loadAlerts();
  };

  const todayPayments = payments.filter((payment) => String(payment.paid_at).slice(0, 10) === todayStr());
  const todayTotal = todayPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const todaySINPE = todayPayments
    .filter((payment) => payment.method === "SINPE")
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
  const todayEfectivo = todayPayments
    .filter((payment) => payment.method === "Efectivo")
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
  const todayAtt = attendance;
  const activeCount = members.filter((member) => member.status === "active" && !member.blocked).length;
  const blockedCount = members.filter((member) => member.blocked).length;

  const tabs = {
    dashboard: (
      <DashboardOverview
        alerts={alerts}
        activeCount={activeCount}
        blockedCount={blockedCount}
        setAlertModal={setAlertModal}
        todayAtt={todayAtt}
        todayPayments={todayPayments}
        todayTotal={todayTotal}
        todaySINPE={todaySINPE}
        todayEfectivo={todayEfectivo}
      />
    ),
    members: (
      <MembersView
        search={search}
        setSearch={setSearch}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterPlan={filterPlan}
        setFilterPlan={setFilterPlan}
        loadingData={loadingData}
        members={members}
        setSelectedMember={setSelectedMember}
      />
    ),
    attendance: (
      <AttendanceView todayAtt={todayAtt} loadAttendance={loadAttendance} showToast={showToast} />
    ),
    payments: (
      <PaymentsView
        payments={payments}
        todayTotal={todayTotal}
        todaySINPE={todaySINPE}
        todayEfectivo={todayEfectivo}
      />
    ),
    blacklist: <BlacklistView members={members} toggleBlock={toggleBlock} />,
  };

  useEffect(() => {
    setSidebarOpen(false);
  }, [tab]);

  return (
    <div className="flex min-h-screen bg-[#f0f2f7] text-slate-900">
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-lg text-slate-700 transition hover:bg-slate-100"
          >
            ☰
          </button>
          <AppLogo
            variant="dark"
            size="sm"
            subtitle={DASHBOARD_LABELS[tab]}
            titleClassName="text-sm text-slate-900"
            subtitleClassName="text-[11px] text-slate-500"
          />
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold text-slate-900">{user?.gym?.name}</div>
          <div className="text-[10px] text-slate-500">Panel</div>
        </div>
      </div>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[220px] flex-col bg-slate-800 shadow-[2px_0_10px_#0000001a] transition-transform duration-200 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="border-b border-slate-700 px-5 pb-[18px] pt-[22px]">
          <div className="flex items-center gap-2.5">
            <AppLogo variant="light" size="md" showText={false} />
            <div className="hidden h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-linear-to-br from-indigo-500 to-indigo-400 text-xl">
              💪
            </div>
            <div>
              <div className="text-[15px] font-black text-white">FitControl</div>
              <div className="text-[10px] text-slate-500">{user?.gym?.name}</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2.5 py-2.5">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setSidebarOpen(false);
              }}
              className={cn(
                "mb-[3px] flex w-full items-center gap-2.5 rounded-[10px] px-3 py-[11px] text-left text-[13px] transition",
                tab === item.id
                  ? "bg-slate-700 font-bold text-white"
                  : "font-normal text-slate-400 hover:bg-slate-700/70"
              )}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
              {item.id === "blacklist" && blockedCount > 0 && (
                <span className="ml-auto rounded-full bg-red-500 px-[7px] py-px text-[10px] font-extrabold text-white">
                  {blockedCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="border-t border-slate-700 px-2.5 pb-5 pt-2.5">
          <div className="mb-2 px-3 text-[10px] font-bold tracking-[1px] text-slate-600">
            ACCIONES RÁPIDAS
          </div>
          {[
            { icon: "👤", label: "Nuevo Miembro", action: "member", color: "#818cf8" },
            { icon: "📋", label: "Marcar Asistencia", action: "attendance", color: "#38bdf8" },
            { icon: "💳", label: "Registrar Pago", action: "payment", color: "#4ade80" },
            { icon: "🗂️", label: "Cierre de Caja", action: "cashreport", color: "#fbbf24" },
          ].map((item) => (
            <button
              key={item.action}
              type="button"
              onClick={() => setModal(item.action)}
              className="mb-0.5 flex w-full items-center gap-[9px] rounded-lg px-3 py-[9px] text-left text-xs font-semibold transition hover:bg-slate-700/60"
              style={{ color: item.color }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}

          <button
            type="button"
            onClick={logout}
            className="mt-1.5 flex w-full items-center gap-[9px] rounded-lg border border-slate-700 px-3 py-[9px] text-left text-xs font-semibold text-slate-500 transition hover:bg-slate-700/60"
          >
            🚪 Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 px-4 pb-8 pt-20 sm:px-5 md:px-6 lg:ml-[220px] lg:px-7 lg:pb-12 lg:pt-7">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900 sm:text-[22px]">{DASHBOARD_LABELS[tab]}</h1>
            <p className="mt-0.5 text-[11px] text-slate-400 sm:text-xs">
              {new Date().toLocaleDateString("es-CR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {tab === "members" && <Btn onClick={() => setModal("member")}>+ Nuevo Miembro</Btn>}
            {tab === "attendance" && (
              <Btn onClick={() => setModal("attendance")}>+ Marcar Entrada</Btn>
            )}
            {tab === "payments" && (
              <>
                <Btn variant="ghost" onClick={() => setModal("cashreport")}>
                  🗂️ Cierre de Caja
                </Btn>
                <Btn variant="green" onClick={() => setModal("payment")}>
                  + Registrar Pago
                </Btn>
              </>
            )}
          </div>
        </div>

        {tabs[tab]}
      </main>

      {modal === "member" && <MemberModal onClose={() => setModal(null)} onSave={saveMember} />}
      {modal === "attendance" && (
        <AttendanceModal
          members={members}
          todayAttendance={todayAtt}
          onClose={() => setModal(null)}
          onMark={markAttendance}
          onExit={markExit}
        />
      )}
      {modal === "payment" && (
        <PaymentModal members={members} onClose={() => setModal(null)} onSave={registerPayment} />
      )}
      {modal === "cashreport" && <CashReportModal onClose={() => setModal(null)} />}
      {editMember && (
        <MemberModal
          member={editMember}
          onClose={() => setEditMember(null)}
          onSave={saveMember}
        />
      )}
      {selectedMember && !editMember && (
        <MemberDetailModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          toggleBlock={toggleBlock}
          setEditMember={setEditMember}
          showToast={showToast}
          loadMembers={loadMembers}
          loadAlerts={loadAlerts}
        />
      )}
      {alertModal && (
        <AlertListModal
          {...alertModal}
          onClose={() => setAlertModal(null)}
          onSelectMember={(member) => setSelectedMember(member)}
        />
      )}

      {toast && (
        <div
          className={cn(
            "animate-toast-in fixed bottom-4 left-4 right-4 z-[9999] rounded-xl border px-4 py-3 text-[13px] font-semibold shadow-[0_8px_24px_#00000018] sm:left-auto sm:right-6 sm:w-auto sm:max-w-sm sm:px-[18px]",
            toast.type === "err"
              ? "border-red-300 bg-red-100 text-red-600"
              : "border-slate-200 bg-white text-slate-900"
          )}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
