import { useState, useEffect, useRef } from "react";
import api from "./api";

const GYM_ID = 2; // ID del gym — cambiar por el gym correspondiente
const RESET_DELAY = 4000; // ms antes de volver a pantalla inicial

const initials = (name="?") => name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
const COLORS = ["#7c3aed","#0891b2","#d97706","#059669","#db2777","#2563eb","#0f766e","#b45309"];
const avatarColor = (s="") => COLORS[(s.charCodeAt(0)+(s.charCodeAt(1)||0))%COLORS.length];

const fmtDate = (d) => {
  if(!d) return "—";
  const date = new Date(String(d).slice(0,10)+"T12:00:00");
  if(isNaN(date)) return "—";
  return date.toLocaleDateString("es-CR",{day:"2-digit",month:"short",year:"numeric"});
};

const PLAN_COLORS = {
  Mensual:   "#6366f1",
  Semanal:   "#0891b2",
  Quincenal: "#059669",
  Bimensual: "#7c3aed",
  Día:       "#d97706",
};

export default function Kiosko() {
  const [cedula, setCedula] = useState("");
  const [state, setState] = useState("idle"); // idle | loading | found | success | error | blocked | overdue
  const [member, setMember] = useState(null);
  const [message, setMessage] = useState("");
  const [time, setTime] = useState(new Date());
  const inputRef = useRef(null);
  const resetTimer = useRef(null);

  // Reloj en tiempo real
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Focus automático en el input
  useEffect(() => {
    if (state === "idle") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [state]);

  const reset = () => {
    clearTimeout(resetTimer.current);
    setCedula("");
    setMember(null);
    setMessage("");
    setState("idle");
  };

  const scheduleReset = (delay = RESET_DELAY) => {
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(reset, delay);
  };

  const handleBuscar = async () => {
    if (!cedula.trim()) return;
    setState("loading");
    try {
      const r = await api.get(`/kiosko/member?cedula=${cedula.trim()}&gymId=${GYM_ID}`);
      const m = r.data;
      setMember(m);
      if (m.blocked) { setState("blocked"); scheduleReset(); return; }
      if (m.alreadyIn) { setState("success"); setMessage("ya_dentro"); scheduleReset(); return; }
      setState("found");
    } catch (e) {
      if (e.response?.status === 404) {
        setState("error");
        setMessage("no_encontrado");
      } else {
        setState("error");
        setMessage("error_servidor");
      }
      scheduleReset();
    }
  };

  const handleMarcar = async () => {
    setState("loading");
    try {
      await api.post(`/kiosko/attendance`, {
        gymId: GYM_ID,
        memberId: member.id,
        memberName: member.name,
        cedula: member.cedula,
        plan: member.plan,
      });
      setState("success");
      setMessage("entrada_ok");
      scheduleReset();
    } catch (e) {
      setState("error");
      setMessage(e.response?.data?.error || "Error al marcar");
      scheduleReset();
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleBuscar();
  };

  const timeStr = time.toLocaleTimeString("es-CR", { hour:"2-digit", minute:"2-digit" });
  const dateStr = time.toLocaleDateString("es-CR", { weekday:"long", day:"numeric", month:"long" });

  return (
    <div style={{
      minHeight: "100vh", background: "#0f172a",
      fontFamily: "'DM Sans',sans-serif", color: "#f1f5f9",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "24px", userSelect: "none"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800;900&family=DM+Mono:wght@700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus { outline: none; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.05); } }
        .fade { animation: fadeIn 0.3s ease; }
        .pulse { animation: pulse 0.6s ease; }
      `}</style>

      {/* Header */}
      <div style={{ position:"fixed", top:0, left:0, right:0, background:"#1e293b",
        borderBottom:"1px solid #334155", padding:"14px 28px",
        display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10,
            background:"linear-gradient(135deg,#6366f1,#818cf8)",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>💪</div>
          <div>
            <div style={{ fontWeight:900, fontSize:16, color:"#fff" }}>GymOS</div>
            <div style={{ fontSize:11, color:"#64748b" }}>Control de Asistencia</div>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:28, fontWeight:900, color:"#fff", fontFamily:"'DM Mono',monospace" }}>{timeStr}</div>
          <div style={{ fontSize:12, color:"#64748b", textTransform:"capitalize" }}>{dateStr}</div>
        </div>
      </div>

      {/* Contenido principal */}
      <div style={{ marginTop:80, width:"100%", maxWidth:520 }}>

        {/* IDLE — pantalla de búsqueda */}
        {(state === "idle" || state === "loading") && (
          <div className="fade" style={{ textAlign:"center" }}>
            <div style={{ fontSize:64, marginBottom:16 }}>👋</div>
            <h1 style={{ fontSize:28, fontWeight:900, color:"#fff", marginBottom:8 }}>
              ¡Bienvenido!
            </h1>
            <p style={{ color:"#94a3b8", fontSize:16, marginBottom:36 }}>
              Ingresá tu cédula para marcar tu asistencia
            </p>

            <div style={{ background:"#1e293b", border:"2px solid #334155", borderRadius:16,
              padding:"28px 24px", marginBottom:16 }}>
              <label style={{ display:"block", fontSize:12, color:"#64748b",
                fontWeight:700, letterSpacing:"1px", marginBottom:10 }}>
                NÚMERO DE CÉDULA
              </label>
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                placeholder="Ej: 101230456"
                value={cedula}
                onChange={e => setCedula(e.target.value)}
                onKeyDown={handleKey}
                disabled={state === "loading"}
                style={{
                  width:"100%", background:"#0f172a", border:"2px solid #475569",
                  borderRadius:12, padding:"16px 18px", color:"#fff",
                  fontSize:28, fontWeight:700, textAlign:"center",
                  fontFamily:"'DM Mono',monospace", marginBottom:20,
                  transition:"border-color 0.2s"
                }}
              />
              <button onClick={handleBuscar} disabled={!cedula.trim() || state==="loading"}
                style={{
                  width:"100%", padding:"16px", borderRadius:12, border:"none",
                  background: !cedula.trim() ? "#334155" : "linear-gradient(135deg,#6366f1,#818cf8)",
                  color: !cedula.trim() ? "#64748b" : "#fff",
                  fontSize:16, fontWeight:800, cursor: !cedula.trim() ? "not-allowed" : "pointer",
                  fontFamily:"inherit", transition:"all 0.2s"
                }}>
                {state === "loading" ? "Buscando..." : "🔍 Buscar"}
              </button>
            </div>

            <p style={{ color:"#475569", fontSize:12 }}>
              Tocá el campo y escribí tu cédula sin puntos ni guiones
            </p>
          </div>
        )}

        {/* FOUND — confirmar entrada */}
        {state === "found" && member && (
          <div className="fade" style={{ textAlign:"center" }}>
            <div style={{
              width:100, height:100, borderRadius:"50%", background:avatarColor(member.name),
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:38, fontWeight:900, color:"#fff", margin:"0 auto 20px"
            }}>{initials(member.name)}</div>

            <h2 style={{ fontSize:26, fontWeight:900, color:"#fff", marginBottom:6 }}>{member.name}</h2>
            <p style={{ color:"#94a3b8", fontSize:14, marginBottom:16 }}>CI: {member.cedula}</p>

            <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:24 }}>
              <span style={{
                background: PLAN_COLORS[member.plan] ? PLAN_COLORS[member.plan]+"22" : "#1e293b",
                color: PLAN_COLORS[member.plan] || "#94a3b8",
                padding:"6px 16px", borderRadius:20, fontSize:13, fontWeight:700,
                border:`1px solid ${PLAN_COLORS[member.plan] || "#334155"}44`
              }}>{member.plan}</span>
              <span style={{
                background: member.status==="active" ? "#05966922" : "#dc262622",
                color: member.status==="active" ? "#059669" : "#dc2626",
                padding:"6px 16px", borderRadius:20, fontSize:13, fontWeight:700,
                border:`1px solid ${member.status==="active" ? "#05966944" : "#dc262644"}`
              }}>{member.status==="active" ? "✓ Activo" : "Vencido"}</span>
            </div>

            {member.status !== "active" && (
              <div style={{ background:"#dc262618", border:"1px solid #dc262644",
                borderRadius:12, padding:"12px 16px", marginBottom:20, color:"#f87171", fontSize:14 }}>
                ⚠️ Tu membresía venció el {fmtDate(member.expires_at)}. Acercate a recepción para renovarla.
              </div>
            )}

            <div style={{ display:"flex", gap:12 }}>
              <button onClick={reset} style={{
                flex:1, padding:"14px", borderRadius:12, border:"1px solid #334155",
                background:"#1e293b", color:"#94a3b8", fontSize:15, fontWeight:700,
                cursor:"pointer", fontFamily:"inherit"
              }}>Cancelar</button>
              <button onClick={handleMarcar} style={{
                flex:2, padding:"14px", borderRadius:12, border:"none",
                background:"linear-gradient(135deg,#059669,#34d399)",
                color:"#fff", fontSize:15, fontWeight:800,
                cursor:"pointer", fontFamily:"inherit"
              }}>✓ Marcar Entrada</button>
            </div>
          </div>
        )}

        {/* SUCCESS */}
        {state === "success" && (
          <div className="fade pulse" style={{ textAlign:"center" }}>
            <div style={{ fontSize:80, marginBottom:20 }}>
              {message === "ya_dentro" ? "✋" : "✅"}
            </div>
            {member && (
              <div style={{
                width:80, height:80, borderRadius:"50%", background:avatarColor(member.name),
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:30, fontWeight:900, color:"#fff", margin:"0 auto 16px"
              }}>{initials(member.name)}</div>
            )}
            <h2 style={{ fontSize:26, fontWeight:900, color:"#fff", marginBottom:8 }}>
              {message === "ya_dentro" ? "¡Ya estás registrado!" : `¡Hola, ${member?.name.split(" ")[0]}!`}
            </h2>
            <p style={{ color:"#34d399", fontSize:18, fontWeight:600, marginBottom:24 }}>
              {message === "ya_dentro"
                ? "Ya marcaste tu entrada hoy. ¡A entrenar!"
                : "Entrada registrada exitosamente. ¡Buen entrenamiento! 🏋️"}
            </p>
            <div style={{ background:"#05966918", border:"1px solid #05966944",
              borderRadius:12, padding:"14px", color:"#6ee7b7", fontSize:14 }}>
              Volviendo automáticamente en unos segundos...
            </div>
          </div>
        )}

        {/* BLOCKED */}
        {state === "blocked" && (
          <div className="fade" style={{ textAlign:"center" }}>
            <div style={{ fontSize:80, marginBottom:20 }}>🚫</div>
            <h2 style={{ fontSize:26, fontWeight:900, color:"#f87171", marginBottom:8 }}>
              Acceso Restringido
            </h2>
            <p style={{ color:"#94a3b8", fontSize:16, marginBottom:24 }}>
              Tu acceso está suspendido. Acercate a recepción para más información.
            </p>
            <div style={{ background:"#dc262618", border:"1px solid #dc262644",
              borderRadius:12, padding:"14px", color:"#f87171", fontSize:14 }}>
              Volviendo automáticamente...
            </div>
          </div>
        )}

        {/* ERROR */}
        {state === "error" && (
          <div className="fade" style={{ textAlign:"center" }}>
            <div style={{ fontSize:80, marginBottom:20 }}>
              {message === "no_encontrado" ? "🔍" : "⚠️"}
            </div>
            <h2 style={{ fontSize:26, fontWeight:900, color:"#fff", marginBottom:8 }}>
              {message === "no_encontrado" ? "Cédula no encontrada" : "Error del sistema"}
            </h2>
            <p style={{ color:"#94a3b8", fontSize:16, marginBottom:24 }}>
              {message === "no_encontrado"
                ? "No encontramos ningún miembro con esa cédula. Verificá el número o acercate a recepción."
                : "Ocurrió un error. Intentá de nuevo o avisale al administrador."}
            </p>
            <button onClick={reset} style={{
              padding:"14px 32px", borderRadius:12, border:"none",
              background:"#1e293b", color:"#94a3b8", fontSize:15, fontWeight:700,
              cursor:"pointer", fontFamily:"inherit", border:"1px solid #334155"
            }}>Intentar de nuevo</button>
          </div>
        )}

      </div>

      {/* Footer */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0,
        padding:"10px", textAlign:"center", color:"#334155", fontSize:11 }}>
        GymOS — Sistema de Administración de Gimnasio
      </div>
    </div>
  );
}
