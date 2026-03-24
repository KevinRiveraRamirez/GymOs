import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import api from "./api";

const RESET_DELAY = 4000;

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
  Mensual:"#6366f1", Semanal:"#0891b2", Quincenal:"#059669", Bimensual:"#7c3aed", "Día":"#d97706"
};

export default function Kiosko() {
  const { gymId = "2" } = useParams();
  const GYM_ID = parseInt(gymId);
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState([]);
  const [state, setState]       = useState("idle"); // idle | searching | found | success | error | blocked
  const [member, setMember]     = useState(null);
  const [message, setMessage]   = useState("");
  const [time, setTime]         = useState(new Date());
  const inputRef  = useRef(null);
  const resetTimer= useRef(null);
  const searchTimer = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (state === "idle") setTimeout(() => inputRef.current?.focus(), 100);
  }, [state]);

  const reset = () => {
    clearTimeout(resetTimer.current);
    clearTimeout(searchTimer.current);
    setQuery(""); setResults([]); setMember(null); setMessage(""); setState("idle");
  };

  const scheduleReset = (delay = RESET_DELAY) => {
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(reset, delay);
  };

  // Búsqueda en tiempo real con debounce
  const handleQueryChange = useCallback((val) => {
    setQuery(val);
    clearTimeout(searchTimer.current);
    if (!val.trim()) { setResults([]); return; }
    setState("searching");
    searchTimer.current = setTimeout(async () => {
      try {
        const r = await api.get(`/kiosko/search?q=${encodeURIComponent(val.trim())}&gymId=${GYM_ID}`);
        setResults(r.data || []);
        setState("idle");
      } catch { setResults([]); setState("idle"); }
    }, 300);
  }, []);

  // Al seleccionar un miembro de la lista
  const handleSelect = (m) => {
    setResults([]);
    setQuery(m.name);
    setMember(m);
    if (m.blocked) { setState("blocked"); scheduleReset(); return; }
    setState("found");
  };

  const handleMarcar = async () => {
    setState("searching");
    try {
      await api.post(`/kiosko/attendance`, {
        gymId: GYM_ID, memberId: member.id,
        memberName: member.name, cedula: member.cedula, plan: member.plan,
      });
      setState("success"); setMessage(member.alreadyIn ? "ya_dentro" : "entrada_ok");
      scheduleReset();
    } catch (e) {
      const msg = e.response?.data?.error || "";
      if (msg.includes("ya está dentro")) { setState("success"); setMessage("ya_dentro"); }
      else { setState("error"); setMessage("error_servidor"); }
      scheduleReset();
    }
  };

  const timeStr = time.toLocaleTimeString("es-CR",{hour:"2-digit",minute:"2-digit"});
  const dateStr = time.toLocaleDateString("es-CR",{weekday:"long",day:"numeric",month:"long"});

  return (
    <div style={{ minHeight:"100vh", background:"#0f172a", fontFamily:"'DM Sans',sans-serif",
      color:"#f1f5f9", display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:"24px", userSelect:"none" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800;900&family=DM+Mono:wght@700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        input:focus { outline:none; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
        .fade { animation:fadeIn 0.25s ease; }
        .pulse { animation:pulse 0.5s ease; }
        .result-item:hover { background:#334155 !important; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:#334155; border-radius:4px; }
      `}</style>

      {/* Header */}
      <div style={{ position:"fixed", top:0, left:0, right:0, background:"#1e293b",
        borderBottom:"1px solid #334155", padding:"14px 28px",
        display:"flex", justifyContent:"space-between", alignItems:"center", zIndex:100 }}>
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

      <div style={{ marginTop:80, width:"100%", maxWidth:520 }}>

        {/* IDLE / SEARCHING — búsqueda */}
        {(state === "idle" || state === "searching") && (
          <div className="fade" style={{ textAlign:"center" }}>
            <div style={{ fontSize:56, marginBottom:12 }}>👋</div>
            <h1 style={{ fontSize:26, fontWeight:900, color:"#fff", marginBottom:6 }}>Bienvenido!</h1>
            <p style={{ color:"#94a3b8", fontSize:15, marginBottom:28 }}>
              Busca tu nombre o cedula para marcar tu asistencia
            </p>

            <div style={{ background:"#1e293b", border:"2px solid #334155",
              borderRadius:16, padding:"24px 20px", position:"relative" }}>
              <label style={{ display:"block", fontSize:11, color:"#64748b",
                fontWeight:700, letterSpacing:"1px", marginBottom:10, textAlign:"left" }}>
                NOMBRE O CEDULA
              </label>
              <input
                ref={inputRef}
                type="text"
                placeholder="Ej: Juan Perez o 101230456"
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                style={{
                  width:"100%", background:"#0f172a", border:"2px solid #475569",
                  borderRadius:12, padding:"14px 16px", color:"#fff",
                  fontSize:20, fontWeight:700, fontFamily:"inherit",
                  transition:"border-color 0.2s"
                }}
              />

              {/* Resultados dropdown */}
              {results.length > 0 && (
                <div style={{ position:"absolute", left:20, right:20, top:"100%",
                  background:"#1e293b", border:"1px solid #334155", borderRadius:12,
                  maxHeight:280, overflowY:"auto", zIndex:200, boxShadow:"0 8px 32px #0008",
                  marginTop:4 }}>
                  {results.map(m => (
                    <div key={m.id} className="result-item"
                      onClick={() => handleSelect(m)}
                      style={{ display:"flex", alignItems:"center", gap:12,
                        padding:"12px 16px", cursor:"pointer", borderBottom:"1px solid #1e293b",
                        background:"transparent", transition:"background 0.15s" }}>
                      <div style={{ width:40, height:40, borderRadius:"50%",
                        background: m.blocked ? "#374151" : avatarColor(m.name),
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:14, fontWeight:900, color:"#fff", flexShrink:0 }}>
                        {m.blocked ? "🚫" : initials(m.name)}
                      </div>
                      <div style={{ flex:1, textAlign:"left" }}>
                        <div style={{ fontWeight:700, color:"#fff", fontSize:14 }}>{m.name}</div>
                        <div style={{ color:"#64748b", fontSize:12 }}>CI: {m.cedula}</div>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                        <span style={{
                          background: PLAN_COLORS[m.plan] ? PLAN_COLORS[m.plan]+"22" : "#1e293b",
                          color: PLAN_COLORS[m.plan] || "#94a3b8",
                          padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:700
                        }}>{m.plan}</span>
                        <span style={{
                          color: m.status==="active" ? "#059669" : "#f87171",
                          fontSize:11, fontWeight:600
                        }}>{m.status==="active" ? "Activo" : "Vencido"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sin resultados */}
              {query.trim().length >= 2 && results.length === 0 && state === "idle" && (
                <div style={{ marginTop:12, color:"#64748b", fontSize:13, textAlign:"left" }}>
                  No se encontraron miembros con "{query}"
                </div>
              )}

              {state === "searching" && (
                <div style={{ marginTop:12, color:"#64748b", fontSize:13, textAlign:"left" }}>
                  Buscando...
                </div>
              )}
            </div>

            <p style={{ color:"#475569", fontSize:12, marginTop:16 }}>
              Escribe al menos 2 caracteres para ver resultados
            </p>
          </div>
        )}

        {/* FOUND — confirmar entrada */}
        {state === "found" && member && (
          <div className="fade" style={{ textAlign:"center" }}>
            <div style={{ width:90, height:90, borderRadius:"50%", background:avatarColor(member.name),
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:34, fontWeight:900, color:"#fff", margin:"0 auto 16px" }}>
              {initials(member.name)}
            </div>
            <h2 style={{ fontSize:24, fontWeight:900, color:"#fff", marginBottom:6 }}>{member.name}</h2>
            <p style={{ color:"#94a3b8", fontSize:13, marginBottom:16 }}>CI: {member.cedula}</p>

            <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:20 }}>
              <span style={{
                background: PLAN_COLORS[member.plan] ? PLAN_COLORS[member.plan]+"22" : "#1e293b",
                color: PLAN_COLORS[member.plan] || "#94a3b8",
                padding:"5px 14px", borderRadius:20, fontSize:12, fontWeight:700,
                border:`1px solid ${(PLAN_COLORS[member.plan]||"#334155")}44`
              }}>{member.plan}</span>
              <span style={{
                background: member.status==="active" ? "#05966922" : "#dc262622",
                color: member.status==="active" ? "#059669" : "#dc2626",
                padding:"5px 14px", borderRadius:20, fontSize:12, fontWeight:700,
                border:`1px solid ${member.status==="active"?"#05966944":"#dc262644"}`
              }}>{member.status==="active" ? "Activo" : "Vencido"}</span>
            </div>

            {member.status !== "active" && (
              <div style={{ background:"#dc262618", border:"1px solid #dc262644",
                borderRadius:12, padding:"10px 14px", marginBottom:16, color:"#f87171", fontSize:13 }}>
                Tu membresia vencio el {fmtDate(member.expires_at)}. Acercate a recepcion para renovarla.
              </div>
            )}

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={reset} style={{ flex:1, padding:"13px", borderRadius:12,
                border:"1px solid #334155", background:"#1e293b", color:"#94a3b8",
                fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                Cancelar
              </button>
              <button onClick={handleMarcar} style={{ flex:2, padding:"13px", borderRadius:12,
                border:"none", background:"linear-gradient(135deg,#059669,#34d399)",
                color:"#fff", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
                Marcar Entrada
              </button>
            </div>
          </div>
        )}

        {/* SUCCESS */}
        {state === "success" && (
          <div className="fade pulse" style={{ textAlign:"center" }}>
            <div style={{ fontSize:72, marginBottom:16 }}>
              {message === "ya_dentro" ? "✋" : "✅"}
            </div>
            {member && (
              <div style={{ width:72, height:72, borderRadius:"50%", background:avatarColor(member.name),
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:26, fontWeight:900, color:"#fff", margin:"0 auto 14px" }}>
                {initials(member.name)}
              </div>
            )}
            <h2 style={{ fontSize:24, fontWeight:900, color:"#fff", marginBottom:8 }}>
              {message === "ya_dentro" ? "Ya estas registrado!" : `Hola, ${member?.name.split(" ")[0]}!`}
            </h2>
            <p style={{ color:"#34d399", fontSize:17, fontWeight:600, marginBottom:20 }}>
              {message === "ya_dentro" ? "Ya marcaste tu entrada hoy. A entrenar!" : "Entrada registrada. Buen entrenamiento!"}
            </p>
            <div style={{ background:"#05966918", border:"1px solid #05966944",
              borderRadius:12, padding:"12px", color:"#6ee7b7", fontSize:13 }}>
              Volviendo automaticamente...
            </div>
          </div>
        )}

        {/* BLOCKED */}
        {state === "blocked" && (
          <div className="fade" style={{ textAlign:"center" }}>
            <div style={{ fontSize:72, marginBottom:16 }}>🚫</div>
            <h2 style={{ fontSize:24, fontWeight:900, color:"#f87171", marginBottom:8 }}>Acceso Restringido</h2>
            <p style={{ color:"#94a3b8", fontSize:15, marginBottom:20 }}>
              Tu acceso esta suspendido. Acercate a recepcion para mas informacion.
            </p>
            <div style={{ background:"#dc262618", border:"1px solid #dc262644",
              borderRadius:12, padding:"12px", color:"#f87171", fontSize:13 }}>
              Volviendo automaticamente...
            </div>
          </div>
        )}

        {/* ERROR */}
        {state === "error" && (
          <div className="fade" style={{ textAlign:"center" }}>
            <div style={{ fontSize:72, marginBottom:16 }}>⚠️</div>
            <h2 style={{ fontSize:24, fontWeight:900, color:"#fff", marginBottom:8 }}>Error del sistema</h2>
            <p style={{ color:"#94a3b8", fontSize:15, marginBottom:20 }}>
              Ocurrio un error. Intenta de nuevo o avisale al administrador.
            </p>
            <button onClick={reset} style={{ padding:"13px 28px", borderRadius:12,
              border:"1px solid #334155", background:"#1e293b", color:"#94a3b8",
              fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              Intentar de nuevo
            </button>
          </div>
        )}

      </div>

      <div style={{ position:"fixed", bottom:0, left:0, right:0,
        padding:"10px", textAlign:"center", color:"#334155", fontSize:11 }}>
        GymOS — Sistema de Administracion de Gimnasio
      </div>
    </div>
  );
}
