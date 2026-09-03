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
const PLAN_BG = {
  Mensual:"#eef2ff", Semanal:"#e0f2fe", Quincenal:"#d1fae5", Bimensual:"#ede9fe", "Día":"#fef3c7"
};

export default function Kiosko() {
  const { gymId = "2" } = useParams();
  const GYM_ID = parseInt(gymId);
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState([]);
  const [state, setState]       = useState("idle");
  const [member, setMember]     = useState(null);
  const [message, setMessage]   = useState("");
  const [time, setTime]         = useState(new Date());
  const inputRef   = useRef(null);
  const resetTimer = useRef(null);
  const searchTimer= useRef(null);

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
  }, [GYM_ID]);

  const handleSelectWithCheck = useCallback(async (m) => {
    setResults([]);
    setQuery(m.name);
    if (m.blocked) {
      setMember(m); setState("blocked"); scheduleReset();
      api.post(`/kiosko/denied`, { gymId: GYM_ID, memberName: m.name, cedula: m.cedula, reason: `Bloqueado: ${m.blacklist_reason||'Sin razón especificada'}` }).catch(()=>{});
      return;
    }
    setState("searching");
    try {
      const today = new Date().toISOString().split("T")[0];
      const r = await api.get(`/kiosko/inside?memberId=${m.id}&gymId=${GYM_ID}&date=${today}`);
      setMember({ ...m, alreadyIn: r.data.inside, attendanceId: r.data.attendanceId });
      setState("found");
    } catch {
      setMember({ ...m, alreadyIn: false });
      setState("found");
    }
  }, [GYM_ID]);

  const handleMarcar = async (tipo) => {
    setState("searching");
    try {
      if (tipo === "salida") {
        await api.patch(`/kiosko/attendance/${member.attendanceId}/exit`);
        setState("success"); setMessage("salida_ok");
      } else {
        await api.post(`/kiosko/attendance`, {
          gymId: GYM_ID, memberId: member.id,
          memberName: member.name, cedula: member.cedula, plan: member.plan,
        });
        setState("success"); setMessage("entrada_ok");
      }
      scheduleReset();
    } catch {
      setState("error"); setMessage("error_servidor");
      scheduleReset();
    }
  };

  const timeStr = time.toLocaleTimeString("es-CR",{hour:"2-digit",minute:"2-digit"});
  const dateStr = time.toLocaleDateString("es-CR",{weekday:"long",day:"numeric",month:"long"});

  return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(135deg, #f0f4ff 0%, #fafbff 50%, #f0f9ff 100%)",
      fontFamily:"'DM Sans',sans-serif",
      color:"#0f172a",
      display:"flex",
      flexDirection:"column",
      alignItems:"center",
      justifyContent:"center",
      padding:"24px",
      userSelect:"none",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@500;700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        input:focus { outline:none; }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(16px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity:0; transform:scale(0.92); }
          to   { opacity:1; transform:scale(1); }
        }
        @keyframes bounceIn {
          0%   { opacity:0; transform:scale(0.7); }
          60%  { transform:scale(1.08); }
          100% { opacity:1; transform:scale(1); }
        }
        @keyframes shimmer {
          0%,100% { opacity:1; }
          50%      { opacity:0.6; }
        }
        .fade-up  { animation: fadeUp 0.3s cubic-bezier(.22,1,.36,1); }
        .scale-in { animation: scaleIn 0.3s cubic-bezier(.22,1,.36,1); }
        .bounce   { animation: bounceIn 0.5s cubic-bezier(.22,1,.36,1); }
        .shimmer  { animation: shimmer 1.2s ease-in-out infinite; }
        .result-row { transition: background 0.12s; }
        .result-row:hover { background: #f1f5f9 !important; }
        .btn-primary { transition: transform 0.12s, box-shadow 0.12s; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(99,102,241,0.35) !important; }
        .btn-primary:active { transform: translateY(0); }
        .btn-exit:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(217,119,6,0.35) !important; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:4px; }
      `}</style>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
     <div style={{
  position:"fixed", top:0, left:0, right:0,
  background:"rgba(255,255,255,0.85)",
  backdropFilter:"blur(20px)",
  borderBottom:"1px solid #e2e8f0",
  padding:"10px 32px",
  height:64,
  display:"flex", justifyContent:"space-between", alignItems:"center",
  zIndex:100,
  boxShadow:"0 1px 12px rgba(0,0,0,0.06)",
}}>
   <div style={{ display:"flex", alignItems:"center", gap:12 }}>
  <img src="/img/completo_sin.png" alt="GymTactik"
    style={{ height:40, maxWidth:200, objectFit:"contain" }}/>
  <div style={{ fontSize:11, color:"#94a3b8", fontWeight:500 }}>Control de Asistencia</div>
</div>
        <div style={{ textAlign:"right" }}>
          <div style={{
            fontSize:30, fontWeight:700, color:"#0f172a",
            fontFamily:"'DM Mono',monospace", letterSpacing:"-1px",
          }}>{timeStr}</div>
          <div style={{ fontSize:12, color:"#94a3b8", textTransform:"capitalize", fontWeight:500 }}>{dateStr}</div>
        </div>
      </div>

      {/* ── CONTENIDO ─────────────────────────────────────────────────── */}
      <div style={{ marginTop:72, width:"100%", maxWidth:540 }}>

        {/* IDLE / SEARCHING */}
        {(state === "idle" || state === "searching") && (
          <div className="fade-up" style={{ textAlign:"center" }}>
            <div style={{
              width:88, height:88, borderRadius:"50%",
              background:"linear-gradient(135deg,#6366f1,#818cf8)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:42, margin:"0 auto 20px",
              boxShadow:"0 8px 32px rgba(99,102,241,0.25)",
            }}>👋</div>
            <h1 style={{ fontSize:30, fontWeight:900, color:"#0f172a", marginBottom:8, letterSpacing:"-0.5px" }}>
              ¡Bienvenido!
            </h1>
            <p style={{ color:"#64748b", fontSize:15, marginBottom:32, fontWeight:500 }}>
              Busca tu nombre o cédula para marcar tu asistencia
            </p>
            <div style={{
              background:"#ffffff",
              border:"1px solid #e2e8f0",
              borderRadius:24,
              padding:"28px 24px",
              position:"relative",
              boxShadow:"0 4px 24px rgba(0,0,0,0.07)",
            }}>
              <label style={{
                display:"block", fontSize:11, color:"#94a3b8",
                fontWeight:700, letterSpacing:"1.2px", marginBottom:10, textAlign:"left",
              }}>NOMBRE O CÉDULA</label>
              <div style={{ position:"relative" }}>
                <div style={{
                  position:"absolute", left:16, top:"50%", transform:"translateY(-50%)",
                  fontSize:18, pointerEvents:"none",
                }}>🔍</div>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ej: Juan Pérez o 101230456"
                  value={query}
                  onChange={e => handleQueryChange(e.target.value)}
                  style={{
                    width:"100%",
                    background: query ? "#fff" : "#f8fafc",
                    border: query ? "2px solid #6366f1" : "2px solid #e2e8f0",
                    borderRadius:14,
                    padding:"15px 16px 15px 48px",
                    color:"#0f172a",
                    fontSize:18,
                    fontWeight:600,
                    fontFamily:"inherit",
                    transition:"border-color 0.2s, background 0.2s",
                    boxShadow: query ? "0 0 0 4px rgba(99,102,241,0.1)" : "none",
                  }}
                />
                {state === "searching" && (
                  <div className="shimmer" style={{
                    position:"absolute", right:16, top:"50%", transform:"translateY(-50%)",
                    fontSize:16,
                  }}>⌛</div>
                )}
              </div>

              {results.length > 0 && (
                <div className="scale-in" style={{
                  position:"absolute", left:24, right:24, top:"calc(100% - 4px)",
                  background:"#fff",
                  border:"1px solid #e2e8f0",
                  borderRadius:16,
                  maxHeight:300,
                  overflowY:"auto",
                  zIndex:200,
                  boxShadow:"0 16px 48px rgba(0,0,0,0.12)",
                }}>
                  {results.map((m, idx) => (
                    <div key={m.id} className="result-row"
                      onClick={() => handleSelectWithCheck(m)}
                      style={{
                        display:"flex", alignItems:"center", gap:12,
                        padding:"13px 16px", cursor:"pointer",
                        borderBottom: idx < results.length-1 ? "1px solid #f1f5f9" : "none",
                        background:"transparent",
                      }}>
                      <div style={{
                        width:44, height:44, borderRadius:"50%",
                        background: m.blocked ? "#f1f5f9" : avatarColor(m.name),
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:15, fontWeight:800, color: m.blocked ? "#94a3b8" : "#fff",
                        flexShrink:0,
                      }}>
                        {m.blocked ? "🚫" : initials(m.name)}
                      </div>
                      <div style={{ flex:1, textAlign:"left" }}>
                        <div style={{ fontWeight:700, color:"#0f172a", fontSize:14 }}>{m.name}</div>
                        <div style={{ color:"#94a3b8", fontSize:12, marginTop:1 }}>CI: {m.cedula}</div>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                        <span style={{
                          background: PLAN_BG[m.plan] || "#f1f5f9",
                          color: PLAN_COLORS[m.plan] || "#64748b",
                          padding:"3px 10px", borderRadius:20,
                          fontSize:11, fontWeight:700,
                        }}>{m.plan}</span>
                        <span style={{
                          color: m.status==="active" ? "#059669" : "#dc2626",
                          fontSize:11, fontWeight:600,
                        }}>{m.status==="active" ? "Activo" : "Vencido"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {query.trim().length >= 2 && results.length === 0 && state === "idle" && (
                <div style={{
                  marginTop:12, display:"flex", alignItems:"center", gap:8,
                  color:"#94a3b8", fontSize:13, textAlign:"left",
                }}>
                  <span>😕</span>
                  <span>No se encontraron miembros con <b>"{query}"</b></span>
                </div>
              )}
            </div>
            <p style={{ color:"#cbd5e1", fontSize:12, marginTop:14, fontWeight:500 }}>
              Escribe al menos 2 caracteres para ver resultados
            </p>
          </div>
        )}

        {/* FOUND */}
        {state === "found" && member && (
          <div className="fade-up">
            <div style={{
              background:"#fff",
              border:"1px solid #e2e8f0",
              borderRadius:24,
              padding:"32px 24px",
              textAlign:"center",
              boxShadow:"0 4px 24px rgba(0,0,0,0.08)",
              marginBottom:16,
            }}>
              <div style={{
                width:96, height:96, borderRadius:"50%",
                background:`linear-gradient(135deg, ${avatarColor(member.name)}, ${avatarColor(member.name)}bb)`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:36, fontWeight:900, color:"#fff",
                margin:"0 auto 18px",
                boxShadow:`0 8px 24px ${avatarColor(member.name)}44`,
              }}>
                {initials(member.name)}
              </div>
              <h2 style={{ fontSize:24, fontWeight:900, color:"#0f172a", marginBottom:4, letterSpacing:"-0.3px" }}>
                {member.name}
              </h2>
              <p style={{ color:"#94a3b8", fontSize:13, marginBottom:18 }}>CI: {member.cedula}</p>
              <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:20 }}>
                <span style={{
                  background: PLAN_BG[member.plan] || "#f1f5f9",
                  color: PLAN_COLORS[member.plan] || "#64748b",
                  padding:"6px 16px", borderRadius:20, fontSize:12, fontWeight:700,
                }}>{member.plan}</span>
                <span style={{
                  background: member.status==="active" ? "#d1fae5" : "#fee2e2",
                  color: member.status==="active" ? "#059669" : "#dc2626",
                  padding:"6px 16px", borderRadius:20, fontSize:12, fontWeight:700,
                }}>{member.status==="active" ? "✓ Activo" : "✗ Vencido"}</span>
              </div>
              <div style={{
                background:"#f8fafc", borderRadius:12, padding:"10px 16px",
                display:"inline-flex", alignItems:"center", gap:8,
                color:"#64748b", fontSize:13, fontWeight:500,
              }}>
                <span>📅</span>
                <span>Vence: <b style={{ color:"#0f172a" }}>{fmtDate(member.expires_at)}</b></span>
              </div>
            </div>

            {member.status !== "active" ? (
              <>
                {!member._deniedLogged && (() => {
                  api.post(`/kiosko/denied`, { gymId: GYM_ID, memberName: member.name, cedula: member.cedula, reason: `Membresía vencida desde ${fmtDate(member.expires_at)}` }).catch(()=>{});
                  member._deniedLogged = true;
                })()}
                <div style={{
                  background:"#fff5f5", border:"1px solid #fecaca",
                  borderRadius:20, padding:"24px", textAlign:"center", marginBottom:16,
                }}>
                  <div style={{ fontSize:40, marginBottom:10 }}>⚠️</div>
                  <div style={{ color:"#dc2626", fontWeight:800, fontSize:17, marginBottom:8 }}>Membresía Vencida</div>
                  <div style={{ color:"#ef4444", fontSize:13, lineHeight:1.6 }}>
                    Venció el <b>{fmtDate(member.expires_at)}</b>.<br/>
                    Acércate a recepción para renovar tu plan.
                  </div>
                </div>
                <button onClick={reset} style={{
                  width:"100%", padding:"15px", borderRadius:14,
                  border:"1.5px solid #e2e8f0", background:"#fff",
                  color:"#64748b", fontSize:15, fontWeight:700,
                  cursor:"pointer", fontFamily:"inherit",
                }}>← Volver</button>
              </>
            ) : (
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={reset} style={{
                  flex:1, padding:"15px", borderRadius:14,
                  border:"1.5px solid #e2e8f0", background:"#fff",
                  color:"#64748b", fontSize:14, fontWeight:700,
                  cursor:"pointer", fontFamily:"inherit",
                }}>Cancelar</button>
                {member.alreadyIn ? (
                  <button className="btn-exit" onClick={() => handleMarcar("salida")} style={{
                    flex:2, padding:"15px", borderRadius:14, border:"none",
                    background:"linear-gradient(135deg,#f59e0b,#fbbf24)",
                    color:"#fff", fontSize:15, fontWeight:800,
                    cursor:"pointer", fontFamily:"inherit",
                    boxShadow:"0 4px 16px rgba(245,158,11,0.3)",
                  }}>👋 Marcar Salida</button>
                ) : (
                  <button className="btn-primary" onClick={() => handleMarcar("entrada")} style={{
                    flex:2, padding:"15px", borderRadius:14, border:"none",
                    background:"linear-gradient(135deg,#6366f1,#818cf8)",
                    color:"#fff", fontSize:15, fontWeight:800,
                    cursor:"pointer", fontFamily:"inherit",
                    boxShadow:"0 4px 16px rgba(99,102,241,0.3)",
                  }}>✓ Marcar Entrada</button>
                )}
              </div>
            )}
          </div>
        )}

        {/* SUCCESS */}
        {state === "success" && (
          <div className="bounce" style={{ textAlign:"center" }}>
            <div style={{
              width:120, height:120, borderRadius:"50%",
              background: message === "salida_ok"
                ? "linear-gradient(135deg,#f59e0b,#fbbf24)"
                : "linear-gradient(135deg,#059669,#34d399)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:54, margin:"0 auto 24px",
              boxShadow: message === "salida_ok"
                ? "0 12px 40px rgba(245,158,11,0.35)"
                : "0 12px 40px rgba(5,150,105,0.35)",
            }}>
              {message === "salida_ok" ? "👋" : "✅"}
            </div>
            {member && (
              <div style={{
                width:64, height:64, borderRadius:"50%",
                background: avatarColor(member.name),
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:22, fontWeight:900, color:"#fff",
                margin:"0 auto 16px",
                boxShadow:`0 4px 16px ${avatarColor(member.name)}55`,
              }}>
                {initials(member.name)}
              </div>
            )}
            <h2 style={{ fontSize:28, fontWeight:900, color:"#0f172a", marginBottom:8, letterSpacing:"-0.5px" }}>
              {message === "salida_ok"
                ? `¡Hasta luego, ${member?.name.split(" ")[0]}!`
                : `¡Hola, ${member?.name.split(" ")[0]}!`}
            </h2>
            <p style={{
              fontSize:16, fontWeight:600, marginBottom:28,
              color: message === "salida_ok" ? "#f59e0b" : "#059669",
            }}>
              {message === "salida_ok"
                ? "Salida registrada. ¡Hasta la próxima!"
                : "Entrada registrada. ¡Buen entrenamiento!"}
            </p>
            <div style={{
              background:"#f8fafc", border:"1px solid #e2e8f0",
              borderRadius:14, padding:"14px 20px",
              color:"#94a3b8", fontSize:13, fontWeight:500,
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            }}>
              <span className="shimmer">⏱</span>
              <span>Volviendo automáticamente...</span>
            </div>
          </div>
        )}

        {/* BLOCKED */}
        {state === "blocked" && (
          <div className="fade-up" style={{ textAlign:"center" }}>
            <div style={{
              width:120, height:120, borderRadius:"50%",
              background:"linear-gradient(135deg,#fee2e2,#fecaca)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:54, margin:"0 auto 24px",
              border:"3px solid #fca5a5",
            }}>🚫</div>
            <h2 style={{ fontSize:26, fontWeight:900, color:"#dc2626", marginBottom:10 }}>Acceso Restringido</h2>
            <p style={{ color:"#64748b", fontSize:15, marginBottom:24, lineHeight:1.6 }}>
              Tu acceso está suspendido.<br/>Acércate a recepción para más información.
            </p>
            <div style={{
              background:"#fff5f5", border:"1px solid #fecaca",
              borderRadius:14, padding:"14px 20px",
              color:"#ef4444", fontSize:13, fontWeight:500,
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            }}>
              <span className="shimmer">⏱</span>
              <span>Volviendo automáticamente...</span>
            </div>
          </div>
        )}

        {/* ERROR */}
        {state === "error" && (
          <div className="fade-up" style={{ textAlign:"center" }}>
            <div style={{
              width:120, height:120, borderRadius:"50%",
              background:"linear-gradient(135deg,#fef3c7,#fde68a)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:54, margin:"0 auto 24px",
              border:"3px solid #fcd34d",
            }}>⚠️</div>
            <h2 style={{ fontSize:26, fontWeight:900, color:"#0f172a", marginBottom:10 }}>Error del sistema</h2>
            <p style={{ color:"#64748b", fontSize:15, marginBottom:24, lineHeight:1.6 }}>
              Ocurrió un error.<br/>Intenta de nuevo o avísale al administrador.
            </p>
            <button onClick={reset} style={{
              padding:"15px 36px", borderRadius:14, border:"none",
              background:"linear-gradient(135deg,#6366f1,#818cf8)",
              color:"#fff", fontSize:15, fontWeight:700,
              cursor:"pointer", fontFamily:"inherit",
              boxShadow:"0 4px 16px rgba(99,102,241,0.3)",
            }}>Intentar de nuevo</button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        position:"fixed", bottom:0, left:0, right:0,
        padding:"12px", textAlign:"center",
        color:"#cbd5e1", fontSize:11, fontWeight:500,
        background:"rgba(255,255,255,0.6)",
        backdropFilter:"blur(10px)",
        borderTop:"1px solid #f1f5f9",
      }}>
        GymTactik — Sistema de Administración de Gimnasio · KI Technologies
      </div>
    </div>
  );
}
