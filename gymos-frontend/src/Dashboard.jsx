import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./AuthContext";
import api from "./api";

// ─── UTILS ────────────────────────────────────────────────────────────────────
const todayStr  = () => new Date().toISOString().split("T")[0];
const fmtDate   = (d) => {
  if(!d) return "—";
  const date = new Date(String(d).slice(0,10)+"T12:00:00");
  if(isNaN(date)) return "—";
  return date.toLocaleDateString("es-CR",{day:"2-digit",month:"short",year:"numeric"});
};
const fmtMoney  = (n) => `₡${Number(n||0).toLocaleString("es-CR")}`;
const diffDays  = (d) => {
  if(!d) return 0;
  const date = new Date(String(d).slice(0,10)+"T12:00:00");
  if(isNaN(date)) return 0;
  return Math.ceil((date - new Date()) / 86400000);
};
const initials  = (name="?") => name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();

// ─── THEME (CLARO) ────────────────────────────────────────────────────────────
const T = {
  bg:"#f0f2f7", surface:"#ffffff", border:"#e2e8f0", border2:"#cbd5e1",
  text:"#0f172a", text2:"#475569", text3:"#94a3b8",
  sidebar:"#1e293b",
  accent:"#6366f1", accentBg:"#eef2ff",
  green:"#059669", greenBg:"#d1fae5",
  orange:"#ea580c", orangeBg:"#ffedd5",
  red:"#dc2626", redBg:"#fee2e2",
  blue:"#0891b2", blueBg:"#e0f2fe",
  yellow:"#d97706", yellowBg:"#fef3c7",
};

const PLAN_META = {
  "Día":      { color:"#d97706", bg:"#fef3c7" },
  Semanal:    { color:"#0891b2", bg:"#e0f2fe" },
  Quincenal:  { color:"#059669", bg:"#d1fae5" },
  Mensual:    { color:"#6366f1", bg:"#eef2ff" },
  Bimensual:  { color:"#7c3aed", bg:"#ede9fe" },
};
const PLAN_DAYS = { "Día":1, Semanal:7, Quincenal:15, Mensual:30, Bimensual:60 };
const calcExpiry = (joinedAt, plan) => {
  const d = new Date(String(joinedAt).slice(0,10)+"T12:00:00");
  d.setDate(d.getDate() + (PLAN_DAYS[plan]||30));
  return d.toISOString().slice(0,10);
};
const AVATAR_COLORS = ["#7c3aed","#0891b2","#d97706","#059669","#db2777","#2563eb","#0f766e","#b45309"];
const avatarColor = (s="") => AVATAR_COLORS[(s.charCodeAt(0)+(s.charCodeAt(1)||0))%AVATAR_COLORS.length];

// ─── SHARED UI ────────────────────────────────────────────────────────────────
const Avatar = ({ name="?", size=36 }) => (
  <div style={{ width:size, height:size, borderRadius:"50%", background:avatarColor(name),
    display:"flex", alignItems:"center", justifyContent:"center",
    fontSize:size*0.33, fontWeight:700, color:"#fff", flexShrink:0 }}>
    {initials(name)}
  </div>
);
const PlanTag = ({ plan }) => (
  <span style={{ background:PLAN_META[plan]?.bg||"#f1f5f9", color:PLAN_META[plan]?.color||T.text3,
    padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>{plan}</span>
);
const StatusBadge = ({ status, blocked }) => {
  const s = blocked?"blocked":status;
  const map = { active:{c:T.green,bg:T.greenBg,l:"Activo"}, overdue:{c:T.orange,bg:T.orangeBg,l:"Vencido"},
    inactive:{c:T.text3,bg:"#f1f5f9",l:"Inactivo"}, blocked:{c:T.red,bg:T.redBg,l:"Bloqueado"} };
  const m = map[s]||map.inactive;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, background:m.bg,
      color:m.c, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:m.c }}/>{m.l}
    </span>
  );
};
const Card = ({ children, style }) => (
  <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14,
    padding:20, boxShadow:"0 1px 4px #00000009", ...style }}>{children}</div>
);
const Modal = ({ title, onClose, children, width=460 }) => (
  <div style={{ position:"fixed", inset:0, background:"#00000040", backdropFilter:"blur(2px)",
    display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:18,
      padding:28, width, maxWidth:"94vw", maxHeight:"90vh", overflowY:"auto",
      boxSizing:"border-box", boxShadow:"0 20px 60px #00000022" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
        <h3 style={{ color:T.text, fontSize:17, fontWeight:800, margin:0 }}>{title}</h3>
        <button onClick={onClose} style={{ background:"#f1f5f9", border:"none", color:T.text2,
          width:30, height:30, borderRadius:8, fontSize:20, cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
      </div>
      {children}
    </div>
  </div>
);
const iStyle = { width:"100%", background:"#f8fafc", border:`1.5px solid ${T.border2}`,
  borderRadius:10, padding:"10px 13px", color:T.text, fontSize:13,
  outline:"none", fontFamily:"inherit", boxSizing:"border-box", marginBottom:14 };
const Lbl = ({ children }) => (
  <label style={{ display:"block", fontSize:11, color:T.text2, marginBottom:5, fontWeight:700, letterSpacing:"0.5px" }}>{children}</label>
);
const Btn = ({ children, variant="primary", ...props }) => {
  const s = { primary:{bg:"#6366f1",c:"#fff",b:"none"}, green:{bg:"#059669",c:"#fff",b:"none"},
    red:{bg:"#dc2626",c:"#fff",b:"none"}, ghost:{bg:"#f1f5f9",c:T.text2,b:`1px solid ${T.border}`} }[variant]||{bg:"#6366f1",c:"#fff",b:"none"};
  return (
    <button {...props} style={{ padding:"10px 18px", borderRadius:10, fontSize:13, fontWeight:700,
      background:s.bg, color:s.c, border:s.b, cursor:props.disabled?"not-allowed":"pointer",
      opacity:props.disabled?0.5:1, fontFamily:"inherit", ...props.style }}>{children}</button>
  );
};
const ErrBox = ({ msg }) => !msg ? null : (
  <div style={{ background:T.redBg, border:`1px solid #fca5a5`, borderRadius:10,
    padding:"10px 14px", marginBottom:14, color:T.red, fontSize:13 }}>⚠ {msg}</div>
);

// ─── MEMBER SEARCH DROPDOWN ───────────────────────────────────────────────────
function MemberSearch({ members, onSelect, placeholder="Nombre o cédula..." }) {
  const [query, setQuery] = useState("");
  const [show, setShow]   = useState(false);
  const ref = useRef(null);
  const sug = query.length>=1
    ? members.filter(m=>m.name.toLowerCase().includes(query.toLowerCase())||m.cedula.includes(query)).slice(0,7)
    : [];
  useEffect(()=>{
    const fn=(e)=>{ if(ref.current&&!ref.current.contains(e.target)) setShow(false); };
    document.addEventListener("mousedown",fn); return ()=>document.removeEventListener("mousedown",fn);
  },[]);
  return (
    <div ref={ref} style={{ position:"relative", marginBottom:14 }}>
      <input placeholder={placeholder} value={query}
        onChange={e=>{ setQuery(e.target.value); onSelect(null); setShow(true); }}
        onFocus={()=>setShow(true)} style={{ ...iStyle, marginBottom:0 }}/>
      {show && sug.length>0 && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0,
          background:T.surface, border:`1.5px solid ${T.border2}`, borderRadius:12,
          zIndex:300, overflow:"hidden", boxShadow:"0 8px 24px #00000018" }}>
          {sug.map(s=>(
            <div key={s.id} onClick={()=>{ onSelect(s); setQuery(s.name); setShow(false); }}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px",
                cursor:"pointer", borderBottom:`1px solid ${T.border}` }}
              onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <Avatar name={s.name} size={32}/>
              <div style={{ flex:1 }}>
                <div style={{ color:T.text, fontSize:13, fontWeight:600 }}>{s.name}</div>
                <div style={{ color:T.text3, fontSize:11 }}>CI: {s.cedula}</div>
              </div>
              <PlanTag plan={s.plan}/><StatusBadge status={s.status} blocked={s.blocked}/>
            </div>
          ))}
        </div>
      )}
      {show && query.length>=1 && sug.length===0 && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0,
          background:T.surface, border:`1.5px solid ${T.border2}`, borderRadius:12,
          zIndex:300, padding:14, textAlign:"center", color:T.text3, fontSize:13,
          boxShadow:"0 8px 24px #00000018" }}>Sin resultados</div>
      )}
    </div>
  );
}

// ─── MEMBER MODAL ─────────────────────────────────────────────────────────────
function MemberModal({ member, onClose, onSave }) {
  const editing = !!member;
  const [form, setForm] = useState(member
    ? { cedula:member.cedula, name:member.name, phone:member.phone||"", plan:member.plan,
        joinedAt:member.joined_at?String(member.joined_at).slice(0,10):todayStr(),
        familyGroup:member.family_group||"", notes:member.notes||"" }
    : { cedula:"", name:"", phone:"", plan:"Mensual", joinedAt:todayStr(), familyGroup:"", notes:"" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k,v)=>setForm(f=>({...f,[k]:v}));

  const handlePlanChange = (p) => {
    set("plan", p);
  };

  const expiryPreview = form.joinedAt ? calcExpiry(form.joinedAt, form.plan) : "";

  const handleSave = async()=>{
    setLoading(true); setError("");
    try { await onSave({...form}); onClose(); }
    catch(e){ setError(e.response?.data?.error||"Error al guardar"); }
    finally{ setLoading(false); }
  };
  return (
    <Modal title={editing?"Editar Miembro":"Registrar Miembro"} onClose={onClose}>
      <ErrBox msg={error}/>
      <Lbl>CÉDULA *</Lbl>
      <input placeholder="101230456" value={form.cedula} onChange={e=>set("cedula",e.target.value)}
        disabled={editing} style={{...iStyle,opacity:editing?0.6:1}}/>
      <Lbl>NOMBRE COMPLETO *</Lbl>
      <input placeholder="Juan Pérez Mora" value={form.name} onChange={e=>set("name",e.target.value)} style={iStyle}/>
      <Lbl>TELÉFONO</Lbl>
      <input placeholder="8888-0000" value={form.phone} onChange={e=>set("phone",e.target.value)} style={iStyle}/>
      <Lbl>FECHA DE INGRESO *</Lbl>
      <input type="date" value={form.joinedAt} onChange={e=>set("joinedAt",e.target.value)} style={iStyle}/>
      {expiryPreview && (
        <div style={{ background:T.greenBg, border:`1px solid #86efac`, borderRadius:8, padding:"8px 12px",
          marginBottom:14, fontSize:12, color:T.green, fontWeight:600 }}>
          📅 Vencimiento calculado: {fmtDate(expiryPreview)}
        </div>
      )}
      <Lbl>PLAN</Lbl>
      <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
        {["Día","Semanal","Quincenal","Mensual","Bimensual"].map(p=>(
          <button key={p} onClick={()=>handlePlanChange(p)} style={{
            flex:1, minWidth:80, padding:"9px 6px", borderRadius:10, cursor:"pointer", fontFamily:"inherit",
            border:`2px solid ${form.plan===p?(PLAN_META[p]?.color||T.accent):T.border2}`,
            background:form.plan===p?(PLAN_META[p]?.bg||T.accentBg):T.surface,
            color:form.plan===p?(PLAN_META[p]?.color||T.accent):T.text2, fontSize:11, fontWeight:700
          }}>{p}</button>
        ))}
      </div>
      <Lbl>GRUPO FAMILIAR</Lbl>
      <input placeholder="Familia Pérez (opcional)" value={form.familyGroup} onChange={e=>set("familyGroup",e.target.value)} style={iStyle}/>
      <Lbl>NOTAS</Lbl>
      <input placeholder="Lesiones, preferencias..." value={form.notes} onChange={e=>set("notes",e.target.value)} style={iStyle}/>
      <div style={{ display:"flex", gap:8, marginTop:4 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex:1 }}>Cancelar</Btn>
        <Btn onClick={handleSave} disabled={!form.cedula||!form.name||loading} style={{ flex:2 }}>
          {loading?"Guardando...":(editing?"Guardar Cambios":"Registrar Miembro")}
        </Btn>
      </div>
    </Modal>
  );
}

// ─── PAYMENT MODAL — monto siempre editable ───────────────────────────────────
function PaymentModal({ members, onClose, onSave }) {
  const [visitorMode, setVisitorMode] = useState(false);
  const [selMember, setSelMember] = useState(null);
  const [method, setMethod] = useState("SINPE");
  const [amount, setAmount] = useState("");
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const SUGGESTED = { "Día":1000, Semanal:5000, Quincenal:7500, Mensual:15000, Bimensual:28000 };
  const handleSelect = (m)=>{ setSelMember(m); if(m) setAmount(String(SUGGESTED[m.plan]||"")); };
  const raw = parseInt(amount)||0;
  const disc = Math.round(raw*discount/100);
  const final = raw-disc;
  const canPay = raw>0 && (visitorMode || (selMember && !selMember.blocked));
  const handlePay = async()=>{
    setLoading(true); setError("");
    try {
      await onSave({ memberId:visitorMode?null:selMember?.id,
        memberName:visitorMode?"Visitante Ocasional":selMember?.name,
        cedula:visitorMode?"—":selMember?.cedula,
        plan:visitorMode?"Día":selMember?.plan,
        amount:final, method, discount, type:visitorMode?"visitor":"member" });
      onClose();
    } catch(e){ setError(e.response?.data?.error||"Error"); }
    finally{ setLoading(false); }
  };
  return (
    <Modal title="Registrar Pago" onClose={onClose}>
      <ErrBox msg={error}/>
      <div style={{ display:"flex", gap:8, marginBottom:18 }}>
        {["Miembro","Visitante"].map(t=>(
          <button key={t} onClick={()=>{ setVisitorMode(t==="Visitante"); setSelMember(null); setAmount(""); }}
            style={{ flex:1, padding:"9px", borderRadius:10, cursor:"pointer", fontFamily:"inherit",
              border:`2px solid ${(t==="Visitante")===visitorMode?T.accent:T.border2}`,
              background:(t==="Visitante")===visitorMode?T.accentBg:T.surface,
              color:(t==="Visitante")===visitorMode?T.accent:T.text2, fontSize:13, fontWeight:700 }}>{t}</button>
        ))}
      </div>
      {!visitorMode && (
        <>
          <Lbl>BUSCAR MIEMBRO</Lbl>
          <MemberSearch members={members} onSelect={handleSelect}/>
          {selMember?.blocked && <p style={{ color:T.red, fontSize:12, marginBottom:10 }}>🚫 {selMember.blacklist_reason}</p>}
          {selMember && !selMember.blocked && (
            <div style={{ background:"#f8fafc", border:`1px solid ${T.border}`, borderRadius:12, padding:14, marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <Avatar name={selMember.name} size={38}/>
                <div style={{ flex:1 }}>
                  <div style={{ color:T.text, fontWeight:700 }}>{selMember.name}</div>
                  <div style={{ color:T.text3, fontSize:11 }}>Vence: {fmtDate(selMember.expires_at)}</div>
                </div>
                <PlanTag plan={selMember.plan}/>
              </div>
            </div>
          )}
        </>
      )}
      <Lbl>MONTO A COBRAR (₡) {!visitorMode && selMember && <span style={{ color:T.text3, fontWeight:400, fontSize:11 }}>— monto sugerido, podés cambiarlo</span>}</Lbl>
      <div style={{ position:"relative", marginBottom:14 }}>
        <span style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:T.text3, fontWeight:700 }}>₡</span>
        <input type="number" min="0" placeholder="Ingresá el monto..." value={amount} onChange={e=>setAmount(e.target.value)}
          style={{ ...iStyle, marginBottom:0, paddingLeft:28, fontSize:16, fontWeight:700,
            border:`2px solid ${amount?T.accent:T.border2}`, fontFamily:"'DM Mono',monospace" }}/>
      </div>
      <Lbl>MÉTODO DE PAGO</Lbl>
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        {["SINPE","Efectivo"].map(m=>(
          <button key={m} onClick={()=>setMethod(m)} style={{
            flex:1, padding:"11px", borderRadius:10, cursor:"pointer", fontFamily:"inherit",
            border:`2px solid ${method===m?T.accent:T.border2}`,
            background:method===m?T.accentBg:T.surface,
            color:method===m?T.accent:T.text2, fontSize:13, fontWeight:700
          }}>{m==="SINPE"?"📱 SINPE":"💵 Efectivo"}</button>
        ))}
      </div>
      {!visitorMode && (
        <>
          <Lbl>DESCUENTO (%)</Lbl>
          <div style={{ display:"flex", gap:6, marginBottom:16 }}>
            {[0,5,10,15,20].map(d=>(
              <button key={d} onClick={()=>setDiscount(d)} style={{
                flex:1, padding:"8px 4px", borderRadius:9, cursor:"pointer", fontFamily:"inherit",
                border:`2px solid ${discount===d?T.blue:T.border2}`,
                background:discount===d?T.blueBg:T.surface,
                color:discount===d?T.blue:T.text3, fontSize:11, fontWeight:700
              }}>{d}%</button>
            ))}
          </div>
        </>
      )}
      {raw>0 && (
        <div style={{ background:"#f8fafc", border:`1px solid ${T.border}`, borderRadius:12, padding:"12px 16px", marginBottom:16 }}>
          {disc>0 && <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
            <span style={{ color:T.text2, fontSize:12 }}>Descuento ({discount}%)</span>
            <span style={{ color:T.red, fontSize:12 }}>-{fmtMoney(disc)}</span>
          </div>}
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ color:T.text, fontWeight:700, fontSize:15 }}>Total</span>
            <span style={{ color:T.green, fontWeight:900, fontSize:22, fontFamily:"'DM Mono',monospace" }}>{fmtMoney(final)}</span>
          </div>
        </div>
      )}
      <Btn variant="green" onClick={handlePay} disabled={!canPay||loading} style={{ width:"100%" }}>
        {loading?"Procesando...":`Confirmar Pago${raw>0?" — "+fmtMoney(final):""}`}
      </Btn>
    </Modal>
  );
}

// ─── ATTENDANCE MODAL — con salida ────────────────────────────────────────────
function AttendanceModal({ members, todayAttendance, onClose, onMark, onExit }) {
  const [visitorMode, setVisitorMode] = useState(false);
  const [selMember, setSelMember] = useState(null);
  const [loading, setLoading] = useState(false);
  const alreadyIn  = selMember && todayAttendance.some(a=>Number(a.member_id)===Number(selMember.id) && !a.exit_time);
  const alreadyOut = selMember && todayAttendance.some(a=>Number(a.member_id)===Number(selMember.id) && !!a.exit_time);
  const canEnter = selMember && !selMember.blocked && !alreadyIn;
  const handleMark = async(m)=>{ setLoading(true); await onMark(m); setSelMember(null); setLoading(false); };
  const handleExit = async(m)=>{ setLoading(true); await onExit(m); setSelMember(null); setLoading(false); };
  return (
    <Modal title="Control de Asistencia" onClose={onClose} width={520}>
      <div style={{ display:"flex", gap:8, marginBottom:18 }}>
        {["Miembro","Visitante del día"].map(t=>(
          <button key={t} onClick={()=>{ setVisitorMode(t!=="Miembro"); setSelMember(null); }}
            style={{ flex:1, padding:"9px", borderRadius:10, cursor:"pointer", fontFamily:"inherit",
              border:`2px solid ${(t!=="Miembro")===visitorMode?T.blue:T.border2}`,
              background:(t!=="Miembro")===visitorMode?T.blueBg:T.surface,
              color:(t!=="Miembro")===visitorMode?T.blue:T.text2, fontSize:12, fontWeight:700 }}>{t}</button>
        ))}
      </div>
      {!visitorMode && (
        <>
          <Lbl>BUSCAR MIEMBRO</Lbl>
          <MemberSearch members={members} onSelect={setSelMember}/>
          {selMember && (
            <div style={{ background:"#f8fafc", border:`1.5px solid ${selMember.blocked?"#fca5a5":alreadyIn?"#93c5fd":T.border}`,
              borderRadius:12, padding:16, marginTop:4, marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                <Avatar name={selMember.name} size={44}/>
                <div>
                  <div style={{ color:T.text, fontWeight:800, fontSize:15 }}>{selMember.name}</div>
                  <div style={{ color:T.text3, fontSize:12 }}>CI: {selMember.cedula}</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                <PlanTag plan={selMember.plan}/><StatusBadge status={selMember.status} blocked={selMember.blocked}/>
              </div>
              <div style={{ fontSize:12, color:diffDays(selMember.expires_at)<=3?T.orange:T.text2 }}>
                Vence: {fmtDate(selMember.expires_at)}
              </div>
              {selMember.blocked  && <div style={{ fontSize:12, color:T.red, marginTop:5 }}>🚫 {selMember.blacklist_reason}</div>}
              {alreadyIn   && <div style={{ fontSize:12, color:T.blue, marginTop:5, fontWeight:600 }}>✓ Dentro del gimnasio ahora</div>}
              {alreadyOut  && !alreadyIn && <div style={{ fontSize:12, color:T.text3, marginTop:5 }}>↩ Ya registró entrada y salida hoy</div>}
            </div>
          )}
          {canEnter && <Btn variant="green" onClick={()=>handleMark(selMember)} disabled={loading} style={{ width:"100%", marginBottom:8 }}>
            {loading?"Registrando...":"✓ Registrar Entrada"}
          </Btn>}
          {alreadyIn && <Btn variant="ghost" onClick={()=>handleExit(selMember)} disabled={loading}
            style={{ width:"100%", marginBottom:8, border:`1.5px solid ${T.orange}`, color:T.orange, background:T.orangeBg }}>
            ↩ Registrar Salida
          </Btn>}
          {selMember?.status==="overdue" && !selMember.blocked && !alreadyIn && (
            <div style={{ background:T.orangeBg, border:`1px solid #fed7aa`, borderRadius:10, padding:"10px 14px", color:T.orange, fontSize:12, marginBottom:8 }}>
              ⚠ Membresía vencida
              <Btn variant="ghost" onClick={()=>handleMark(selMember)} style={{ width:"100%", marginTop:8, fontSize:11, border:`1px solid ${T.orange}`, color:T.orange }}>
                Permitir entrada de todos modos
              </Btn>
            </div>
          )}
        </>
      )}
      {visitorMode && (
        <div style={{ textAlign:"center", padding:"20px 0" }}>
          <div style={{ fontSize:44, marginBottom:10 }}>🎫</div>
          <div style={{ color:T.text, fontWeight:700, fontSize:15, marginBottom:6 }}>Visitante ocasional</div>
          <div style={{ color:T.text3, fontSize:12, marginBottom:20 }}>Registrá también el pago</div>
          <Btn onClick={()=>{ handleMark(null); onClose(); }} style={{ width:"100%" }}>Registrar Visitante</Btn>
        </div>
      )}
      <div style={{ borderTop:`1px solid ${T.border}`, marginTop:18, paddingTop:14 }}>
        <div style={{ fontSize:11, color:T.text3, fontWeight:700, marginBottom:8, letterSpacing:"0.5px" }}>
          HOY — {todayAttendance.length} REGISTROS
        </div>
        <div style={{ maxHeight:190, overflowY:"auto", display:"flex", flexDirection:"column", gap:5 }}>
          {[...todayAttendance].reverse().map((a,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px",
              background:"#f8fafc", borderRadius:9, border:`1px solid ${T.border}` }}>
              <span style={{ width:8, height:8, borderRadius:"50%", flexShrink:0,
                background:a.exit_time?T.text3:T.green }}/>
              <Avatar name={a.member_name} size={26}/>
              <span style={{ flex:1, color:T.text, fontSize:12, fontWeight:600 }}>{a.member_name}</span>
              <span style={{ color:T.text3, fontSize:11, fontFamily:"'DM Mono',monospace" }}>
                ▶{a.time}{a.exit_time && ` ↩${a.exit_time}`}
              </span>
              {a.exit_time
                ? <span style={{ fontSize:10, color:T.text3, background:"#f1f5f9", padding:"2px 7px", borderRadius:10 }}>Salió</span>
                : <span style={{ fontSize:10, color:T.green, background:T.greenBg, padding:"2px 7px", borderRadius:10 }}>Dentro</span>}
            </div>
          ))}
          {todayAttendance.length===0 && <div style={{ color:T.text3, fontSize:12, textAlign:"center", padding:16 }}>Sin registros hoy</div>}
        </div>
      </div>
    </Modal>
  );
}

// ─── ALERT MODAL ──────────────────────────────────────────────────────────────
function AlertListModal({ title, members, color, icon, type, onClose, onSelectMember }) {
  const [notified, setNotified] = useState({});
  const cleanPhone = (p="")=>p.replace(/[^0-9]/g,"");

  const waMsg = (m)=>{
    const n = m.name.split(" ")[0];
    const f = fmtDate(m.expires_at);
    const dias = diffDays(m.expires_at);
    const planMsg = {
      Mensual:   { emoji:"💪", renovar:"para no perder continuidad" },
      Bimensual: { emoji:"💪", renovar:"para no perder continuidad" },
      Quincenal: { emoji:"🏋️", renovar:"a tiempo para seguir entrenando" },
      Semanal:   { emoji:"🏋️", renovar:"a tiempo para seguir entrenando esta semana" },
      Día:       { emoji:"😊", renovar:"cuando quieras" },
    };
    const pm = planMsg[m.plan] || { emoji:"💪", renovar:"a tiempo" };

    if(type==="overdue"){
      return encodeURIComponent(`Hola ${n} 👋

Te recordamos que tu membresía *${m.plan}* venció el *${f}*.

Para seguir disfrutando del gimnasio, podés renovarla ${pm.renovar}. ${pm.emoji}

_GymOS_`);
    }
    if(type==="today"){
      return encodeURIComponent(`Hola ${n} 👋

⚠️ Tu membresía *${m.plan}* vence *HOY*.

Acercate al gimnasio para renovarla y no perder acceso. ${pm.emoji}

_GymOS_`);
    }
    // soon
    return encodeURIComponent(`Hola ${n} 👋

Te avisamos que tu membresía *${m.plan}* vence el *${f}* (en *${dias} día${dias!==1?"s":""}*).

Renovála ${pm.renovar}. ${pm.emoji}

_GymOS_`);
    return encodeURIComponent(`Hola ${n} 👋

Tu membresía vence el *${f}*. Renovála pronto. 💪

_GymOS_`);
  };

  const sendOne = (m)=>{
    window.open(`https://wa.me/506${cleanPhone(m.phone)}?text=${waMsg(m)}`,"_blank");
    setNotified(prev=>({...prev,[m.id]:true}));
  };

  const sendAll = ()=>{
    members.filter(m=>!notified[m.id]).forEach((m,i)=>{
      setTimeout(()=>{
        window.open(`https://wa.me/506${cleanPhone(m.phone)}?text=${waMsg(m)}`,"_blank");
        setNotified(prev=>({...prev,[m.id]:true}));
      }, i*800);
    });
  };

  const pendientes = members.filter(m=>!notified[m.id]);
  const avisadosCount = Object.keys(notified).length;

  return (
    <Modal title={title} onClose={onClose} width={540}>
      <div style={{ background:`${color}18`, border:`1.5px solid ${color}44`, borderRadius:12,
        padding:"10px 14px", marginBottom:12, display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:20 }}>{icon}</span>
        <div style={{ flex:1 }}>
          <span style={{ color, fontSize:13, fontWeight:700 }}>{members.length} miembro{members.length!==1?"s":""}</span>
          {avisadosCount>0 && <span style={{ color:T.green, fontSize:11, fontWeight:600, marginLeft:10 }}>✓ {avisadosCount} avisado{avisadosCount!==1?"s":""}</span>}
        </div>
        <span style={{ color:T.text3, fontSize:11 }}>Tocá 📱 para WhatsApp</span>
      </div>

      {pendientes.length>0 ? (
        <button onClick={sendAll} style={{ width:"100%", padding:"10px", borderRadius:10, marginBottom:14,
          border:"1.5px solid #86efac", background:"#dcfce7", color:"#15803d",
          fontFamily:"inherit", fontSize:13, fontWeight:700, cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          📱 Avisar a todos por WhatsApp ({pendientes.length} pendiente{pendientes.length!==1?"s":""})
        </button>
      ) : (
        <div style={{ background:T.greenBg, border:`1px solid #86efac`, borderRadius:10,
          padding:"10px 14px", marginBottom:14, textAlign:"center", color:T.green, fontSize:13, fontWeight:700 }}>
          ✅ Ya se avisó a todos
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:7, maxHeight:380, overflowY:"auto" }}>
        {members.map(m=>{
          const avisado = !!notified[m.id];
          return (
            <div key={m.id} style={{ background:avisado?"#f0fdf4":"#f8fafc",
              border:`1.5px solid ${avisado?"#86efac":T.border}`, borderRadius:12,
              padding:"11px 14px", display:"flex", alignItems:"center", gap:12 }}>
              <Avatar name={m.name} size={40}/>
              <div style={{ flex:1, cursor:"pointer" }} onClick={()=>{ onSelectMember(m); onClose(); }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ color:T.text, fontWeight:700, fontSize:14 }}>{m.name}</span>
                  {avisado && <span style={{ fontSize:10, color:T.green, background:T.greenBg,
                    padding:"2px 7px", borderRadius:10, fontWeight:700 }}>✓ Avisado</span>}
                </div>
                <div style={{ color, fontSize:11, marginTop:2 }}>
                  {type==="overdue"?`Venció: ${fmtDate(m.expires_at)}`:
                   type==="today"?"Vence HOY":
                   `Vence en ${diffDays(m.expires_at)} días — ${fmtDate(m.expires_at)}`}
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:5, alignItems:"flex-end" }}>
                <PlanTag plan={m.plan}/>
                <button onClick={()=>sendOne(m)} style={{ display:"flex", alignItems:"center", gap:5,
                  background:"#dcfce7", border:"1px solid #86efac", color:"#15803d",
                  padding:"4px 10px", borderRadius:8, fontSize:11, fontWeight:700,
                  cursor:"pointer", fontFamily:"inherit", opacity:avisado?0.7:1 }}>
                  {avisado?"📱 Reenviar":"📱 Avisar"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

// ─── CASH REPORT ──────────────────────────────────────────────────────────────
function CashReportModal({ onClose }) {
  const [period, setPeriod] = useState("day");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{ setLoading(true); api.get(`/payments/report?period=${period}`).then(r=>setReport(r.data)).finally(()=>setLoading(false)); },[period]);

  const periodLabel = period==="day"?"Día":period==="week"?"Semana":"Mes";
  const periodTotal = period==="day"?"HOY":period==="week"?"ESTA SEMANA":"ESTE MES";
  const nowStr = new Date().toLocaleDateString("es-CR",{day:"2-digit",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"});

  const fmtMoneyPDF = (n) => `c/${Number(n||0).toLocaleString("es-CR")}`;

  const downloadPDF = async () => {
    if(!report) return;
    // Cargar jsPDF dinámicamente
    if(!window.jspdf) {
      await new Promise((res,rej)=>{
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit:"mm", format:"a4" });
    const now = new Date();
    const dateStr = now.toLocaleDateString("es-CR",{day:"2-digit",month:"2-digit",year:"numeric"});
    const timeStr = now.toLocaleTimeString("es-CR",{hour:"2-digit",minute:"2-digit"});
    const fileDate = now.toISOString().slice(0,10); // YYYY-MM-DD para el nombre del archivo
    const sinpe = report.byMethod.find(m=>m.method==="SINPE");
    const efect = report.byMethod.find(m=>m.method==="Efectivo");

    const W = 210, pad = 20;
    let y = 0;

    // ── Cabecera verde ──
    doc.setFillColor(5,150,105);
    doc.rect(0,0,W,38,"F");
    doc.setTextColor(255,255,255);
    doc.setFontSize(20); doc.setFont("helvetica","bold");
    doc.text("GymOS", pad, 16);
    doc.setFontSize(10); doc.setFont("helvetica","normal");
    doc.setTextColor(209,250,229);
    doc.text(`Cierre de Caja — ${periodLabel}`, pad, 24);
    doc.text(`Generado: ${dateStr} ${timeStr}`, pad, 31);
    y = 50;

    // ── Caja total ──
    doc.setFillColor(240,253,244);
    doc.setDrawColor(134,239,172);
    doc.roundedRect(pad, y, W-pad*2, 32, 4, 4, "FD");
    doc.setTextColor(6,95,70);
    doc.setFontSize(9); doc.setFont("helvetica","bold");
    doc.text(`TOTAL ${periodTotal}`, W/2, y+10, {align:"center"});
    doc.setFontSize(22); doc.setFont("helvetica","bold");
    doc.setTextColor(5,150,105);
    doc.text(fmtMoneyPDF(report.summary.total), W/2, y+22, {align:"center"});
    doc.setFontSize(9); doc.setFont("helvetica","normal");
    doc.setTextColor(100,116,139);
    doc.text(`${report.summary.transactions} transacciones · ${report.summary.visitors} visitantes`, W/2, y+30, {align:"center"});
    y += 42;

    // ── Sección: Por Método ──
    doc.setFontSize(8); doc.setFont("helvetica","bold");
    doc.setTextColor(148,163,184);
    doc.text("DESGLOSE POR MÉTODO", pad, y); y += 5;

    const half = (W-pad*2-8)/2;
    // SINPE
    doc.setFillColor(238,242,255); doc.setDrawColor(199,210,254);
    doc.roundedRect(pad, y, half, 22, 3, 3, "FD");
    doc.setFontSize(8); doc.setFont("helvetica","bold"); doc.setTextColor(99,102,241);
    doc.text("SINPE", pad+5, y+8);
    doc.setFontSize(13); doc.setFont("helvetica","bold");
    doc.text(fmtMoneyPDF(sinpe?.total||0), pad+5, y+17);
    doc.setFontSize(8); doc.setFont("helvetica","normal"); doc.setTextColor(148,163,184);
    doc.text(`${sinpe?.count||0} transacciones`, pad+half-5, y+17, {align:"right"});
    // Efectivo
    const x2 = pad+half+8;
    doc.setFillColor(255,251,235); doc.setDrawColor(253,230,138);
    doc.roundedRect(x2, y, half, 22, 3, 3, "FD");
    doc.setFontSize(8); doc.setFont("helvetica","bold"); doc.setTextColor(245,158,11);
    doc.text("Efectivo", x2+5, y+8);
    doc.setFontSize(13); doc.setFont("helvetica","bold");
    doc.text(fmtMoneyPDF(efect?.total||0), x2+5, y+17);
    doc.setFontSize(8); doc.setFont("helvetica","normal"); doc.setTextColor(148,163,184);
    doc.text(`${efect?.count||0} transacciones`, x2+half-5, y+17, {align:"right"});
    y += 30;

    // ── Sección: Por Plan ──
    doc.setFontSize(8); doc.setFont("helvetica","bold"); doc.setTextColor(148,163,184);
    doc.text("DESGLOSE POR PLAN", pad, y); y += 5;

    const planColors = {
      Mensual:{bg:[237,233,254],bd:[196,181,253],txt:[124,58,237]},
      Semanal:{bg:[219,234,254],bd:[147,197,253],txt:[29,78,216]},
      "Día":  {bg:[254,249,195],bd:[253,224,71], txt:[161,98,7]},
      Visitante:{bg:[240,253,244],bd:[134,239,172],txt:[21,128,61]}
    };
    report.byPlan.forEach(p=>{
      const col = planColors[p.plan]||{bg:[241,245,249],bd:[203,213,225],txt:[71,85,105]};
      doc.setFillColor(...col.bg); doc.setDrawColor(...col.bd);
      doc.roundedRect(pad, y, W-pad*2, 12, 2, 2, "FD");
      doc.setFontSize(8); doc.setFont("helvetica","bold"); doc.setTextColor(...col.txt);
      doc.text(p.plan, pad+5, y+8);
      doc.setTextColor(100,116,139); doc.setFont("helvetica","normal");
      doc.text(`${p.count} pago${p.count!==1?"s":""}`, W/2, y+8, {align:"center"});
      doc.setFont("helvetica","bold"); doc.setTextColor(30,41,59);
      doc.text(fmtMoneyPDF(p.total), W-pad-5, y+8, {align:"right"});
      y += 15;
    });

    // ── Footer ──
    y = Math.max(y+10, 260);
    doc.setDrawColor(226,232,240);
    doc.line(pad, y, W-pad, y); y += 6;
    doc.setFontSize(8); doc.setFont("helvetica","normal"); doc.setTextColor(148,163,184);
    doc.text("GymOS · Sistema de Administración de Gimnasio · Reporte generado automáticamente", W/2, y, {align:"center"});

    // ── Descargar ──
    doc.save(`cierre-caja-${periodLabel.toLowerCase()}-${fileDate}.pdf`);
  };

  return (
    <Modal title="Cierre de Caja" onClose={onClose} width={520}>
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {[["day","Día"],["week","Semana"],["month","Mes"]].map(([k,l])=>(
          <button key={k} onClick={()=>setPeriod(k)} style={{ flex:1, padding:"9px", borderRadius:10, cursor:"pointer", fontFamily:"inherit",
            border:`2px solid ${period===k?T.green:T.border2}`, background:period===k?T.greenBg:T.surface,
            color:period===k?T.green:T.text2, fontSize:13, fontWeight:700 }}>{l}</button>
        ))}
      </div>
      {loading && <div style={{ textAlign:"center", color:T.text3, padding:30 }}>Cargando...</div>}
      {report && !loading && (
        <>
          <div style={{ background:"linear-gradient(135deg,#059669,#34d399)", borderRadius:16, padding:22, textAlign:"center", marginBottom:16 }}>
            <div style={{ color:"#d1fae5", fontSize:12, fontWeight:700, letterSpacing:"1px", marginBottom:6 }}>TOTAL {periodTotal}</div>
            <div style={{ color:"#fff", fontSize:36, fontWeight:900, fontFamily:"'DM Mono',monospace" }}>{fmtMoney(report.summary.total)}</div>
            <div style={{ color:"#d1fae5", fontSize:12, marginTop:4 }}>{report.summary.transactions} transacciones · {report.summary.visitors} visitantes</div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
            {report.byMethod.map(m=>(
              <div key={m.method} style={{ background:"#f8fafc", border:`1px solid ${T.border}`, borderRadius:12, padding:14 }}>
                <div style={{ color:T.text2, fontSize:11, fontWeight:700, marginBottom:6 }}>{m.method==="SINPE"?"📱 SINPE":"💵 Efectivo"}</div>
                <div style={{ color:m.method==="SINPE"?"#6366f1":T.yellow, fontSize:20, fontWeight:800, fontFamily:"'DM Mono',monospace" }}>{fmtMoney(m.total)}</div>
                <div style={{ color:T.text3, fontSize:11 }}>{m.count} transacciones</div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom:16 }}>
            {report.byPlan.map(p=>(
              <div key={p.plan} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", background:"#f8fafc", border:`1px solid ${T.border}`, borderRadius:9, marginBottom:5 }}>
                <PlanTag plan={p.plan}/><span style={{ flex:1, color:T.text2, fontSize:12 }}>{p.count} pago{p.count!==1?"s":""}</span>
                <span style={{ color:T.text, fontWeight:700, fontSize:13, fontFamily:"'DM Mono',monospace" }}>{fmtMoney(p.total)}</span>
              </div>
            ))}
          </div>
          <button onClick={downloadPDF} style={{
            width:"100%", padding:"11px", borderRadius:10, border:"none", cursor:"pointer",
            background:"#059669", color:"#fff", fontFamily:"inherit",
            fontSize:14, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", gap:8
          }}>
            📄 Descargar PDF — {periodLabel}
          </button>
        </>
      )}
    </Modal>
  );
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
const NAV = [
  { id:"dashboard", icon:"⚡", label:"Dashboard" },
  { id:"members",   icon:"👥", label:"Miembros" },
  { id:"attendance",icon:"📋", label:"Asistencia" },
  { id:"payments",  icon:"💳", label:"Pagos" },
  { id:"blacklist", icon:"🚫", label:"Lista Negra" },
];

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab]           = useState("dashboard");
  const [members, setMembers]   = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [payments, setPayments] = useState([]);
  const [alerts, setAlerts]     = useState({ overdue:[], expiringToday:[], expiringSoon:[] });
  const [modal, setModal]       = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [editMember, setEditMember] = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const [search, setSearch]     = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPlan, setFilterPlan]     = useState("all");
  const [toast, setToast]       = useState(null);
  const [loadingData, setLoadingData] = useState(false);

  const showToast = (msg, type="ok") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const loadMembers = useCallback(async()=>{
    setLoadingData(true);
    try {
      const p = new URLSearchParams({ limit:300 });
      if(search) p.set("search",search);
      if(filterStatus!=="all") p.set("status",filterStatus);
      if(filterPlan!=="all") p.set("plan",filterPlan);
      const r = await api.get(`/members?${p}`);
      setMembers(r.data.members||[]);
    } catch{ showToast("❌ Error al cargar miembros","err"); }
    finally{ setLoadingData(false); }
  },[search,filterStatus,filterPlan]);

  const loadAttendance = useCallback(async()=>{
    try { const r=await api.get(`/attendance?date=${todayStr()}`); setAttendance(r.data||[]); } catch{}
  },[]);

  const loadPayments = useCallback(async()=>{
    try { const r=await api.get("/payments?period=month&limit=200"); setPayments(r.data||[]); } catch{}
  },[]);

  const loadAlerts = useCallback(async()=>{
    try { const r=await api.get("/members/alerts"); setAlerts(r.data||{overdue:[],expiringToday:[],expiringSoon:[]}); } catch{}
  },[]);

  useEffect(()=>{ loadMembers(); },[loadMembers]);
  useEffect(()=>{
    loadAttendance(); loadAlerts(); loadPayments();
    const t = setInterval(()=>{ loadAttendance(); loadPayments(); }, 30000);
    return ()=>clearInterval(t);
  },[]);

  // ── ACTIONS ───────────────────────────────────────────────────────────────
  const saveMember = async(form)=>{
    if(editMember){ await api.put(`/members/${editMember.id}`,{name:form.name,phone:form.phone,plan:form.plan,familyGroup:form.familyGroup,notes:form.notes}); showToast("✏️ Cambios guardados"); }
    else { await api.post("/members",form); showToast(`✅ ${form.name} registrado`); }
    setEditMember(null); loadMembers(); loadAlerts();
  };

  const markAttendance = async(member)=>{
    try {
      if(member) { await api.post("/attendance",{memberId:member.id,memberName:member.name,cedula:member.cedula,plan:member.plan,type:"member"}); showToast(`📋 Entrada: ${member.name}`); }
      else { await api.post("/attendance",{memberName:"Visitante",cedula:"—",plan:"Día",type:"visitor"}); showToast("🎫 Visitante registrado"); }
      await loadAttendance();
    } catch(e){ showToast("❌ "+(e.response?.data?.error||"Error"),"err"); }
  };

  const markExit = async(member)=>{
    try {
      const entry = attendance.find(a=>Number(a.member_id)===Number(member.id) && !a.exit_time);
      if(entry){ await api.patch(`/attendance/${entry.id}/exit`); showToast(`↩ Salida: ${member.name}`); await loadAttendance(); }
      else { showToast("❌ No se encontró entrada activa","err"); }
    } catch(e){ showToast("❌ "+(e.response?.data?.error||"Error"),"err"); }
  };

  const registerPayment = async(data)=>{
    await api.post("/payments",data);
    showToast(`💳 Pago ${fmtMoney(data.amount)} — ${data.method}`);
    await Promise.all([loadPayments(),loadMembers(),loadAlerts()]);
  };

  const toggleBlock = async(member,reason="")=>{
    await api.patch(`/members/${member.id}/block`,{blocked:!member.blocked,blacklistReason:reason});
    showToast(member.blocked?`✅ ${member.name} desbloqueado`:`🚫 ${member.name} bloqueado`);
    setSelectedMember(null); loadMembers(); loadAlerts();
  };

  // ── computed ──────────────────────────────────────────────────────────────
  const todayPayments = payments.filter(p => String(p.paid_at).slice(0,10) === todayStr());
  const todayTotal    = todayPayments.reduce((s,p)=>s+Number(p.amount),0);
  const todaySINPE    = todayPayments.filter(p=>p.method==="SINPE").reduce((s,p)=>s+Number(p.amount),0);
  const todayEfectivo = todayPayments.filter(p=>p.method==="Efectivo").reduce((s,p)=>s+Number(p.amount),0);
  const todayAtt      = attendance;
  const activeCount   = members.filter(m=>m.status==="active"&&!m.blocked).length;
  const blockedCount  = members.filter(m=>m.blocked).length;

  // ── DASHBOARD ─────────────────────────────────────────────────────────────
  const renderDashboard = ()=>(
    <div>
      {(alerts.expiringToday?.length>0||alerts.expiringSoon?.length>0||alerts.overdue?.length>0) && (
        <div style={{ marginBottom:20, display:"flex", flexDirection:"column", gap:8 }}>
          {alerts.expiringToday?.length>0 && (
            <div style={{ background:T.orangeBg, border:`1.5px solid #fed7aa`, borderRadius:14, overflow:"hidden" }}>
              <div onClick={()=>setAlertModal({title:"Vencen HOY",members:alerts.expiringToday,color:T.orange,icon:"🔴",type:"today"})}
                style={{ padding:"11px 16px", display:"flex", gap:8, alignItems:"center", cursor:"pointer" }}>
                <span style={{ fontSize:16 }}>🔴</span>
                <span style={{ color:T.orange, fontSize:13, fontWeight:700, flex:1 }}>
                  {alerts.expiringToday.length} membresía{alerts.expiringToday.length>1?"s":""} vence{alerts.expiringToday.length===1?"":"n"} HOY
                </span>
                <span style={{ color:T.orange, fontSize:11, fontWeight:700, background:"#fff", padding:"3px 10px", borderRadius:20, border:`1px solid #fed7aa` }}>Ver y avisar →</span>
              </div>
              <div style={{ borderTop:`1px solid #fed7aa`, padding:"8px 16px", display:"flex", gap:8, flexWrap:"wrap" }}>
                {alerts.expiringToday.map(m=>(
                  <span key={m.id} style={{ fontSize:11, color:T.orange, background:"#fff", padding:"3px 10px", borderRadius:20, border:`1px solid #fed7aa`, fontWeight:600 }}>
                    {m.name.split(" ")[0]} · {m.plan}
                  </span>
                ))}
              </div>
            </div>
          )}
          {alerts.expiringSoon?.length>0 && (
            <div style={{ background:T.yellowBg, border:`1.5px solid #fde68a`, borderRadius:14, overflow:"hidden" }}>
              <div onClick={()=>setAlertModal({title:"Vencen en 1-3 días",members:alerts.expiringSoon,color:T.yellow,icon:"⚠️",type:"soon"})}
                style={{ padding:"11px 16px", display:"flex", gap:8, alignItems:"center", cursor:"pointer" }}>
                <span style={{ fontSize:16 }}>⚠️</span>
                <span style={{ color:T.yellow, fontSize:13, fontWeight:700, flex:1 }}>
                  {alerts.expiringSoon.length} vence{alerts.expiringSoon.length===1?"":"n"} en 1-3 días
                </span>
                <span style={{ color:T.yellow, fontSize:11, fontWeight:700, background:"#fff", padding:"3px 10px", borderRadius:20, border:`1px solid #fde68a` }}>Ver y avisar →</span>
              </div>
              <div style={{ borderTop:`1px solid #fde68a`, padding:"8px 16px", display:"flex", gap:8, flexWrap:"wrap" }}>
                {alerts.expiringSoon.map(m=>(
                  <span key={m.id} style={{ fontSize:11, color:T.yellow, background:"#fff", padding:"3px 10px", borderRadius:20, border:`1px solid #fde68a`, fontWeight:600 }}>
                    {m.name.split(" ")[0]} · {diffDays(m.expires_at)}d
                  </span>
                ))}
              </div>
            </div>
          )}
          {alerts.overdue?.length>0 && (
            <div style={{ background:"#ede9fe", border:`1.5px solid #c4b5fd`, borderRadius:14, overflow:"hidden" }}>
              <div onClick={()=>setAlertModal({title:"Cuotas vencidas",members:alerts.overdue,color:"#7c3aed",icon:"💸",type:"overdue"})}
                style={{ padding:"11px 16px", display:"flex", gap:8, alignItems:"center", cursor:"pointer" }}>
                <span style={{ fontSize:16 }}>💸</span>
                <span style={{ color:"#7c3aed", fontSize:13, fontWeight:700, flex:1 }}>
                  {alerts.overdue.length} miembro{alerts.overdue.length>1?"s":""} con cuota vencida
                </span>
                <span style={{ color:"#7c3aed", fontSize:11, fontWeight:700, background:"#fff", padding:"3px 10px", borderRadius:20, border:`1px solid #c4b5fd` }}>Ver y avisar →</span>
              </div>
              <div style={{ borderTop:`1px solid #c4b5fd`, padding:"8px 16px", display:"flex", gap:8, flexWrap:"wrap" }}>
                {alerts.overdue.map(m=>(
                  <span key={m.id} style={{ fontSize:11, color:"#7c3aed", background:"#fff", padding:"3px 10px", borderRadius:20, border:`1px solid #c4b5fd`, fontWeight:600 }}>
                    {m.name.split(" ")[0]} · venció {fmtDate(m.expires_at)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:20 }}>
        {[
          { icon:"👥", label:"Miembros Activos", val:activeCount, color:"#6366f1", bg:"#eef2ff" },
          { icon:"📋", label:"Asistencia Hoy",   val:todayAtt.length, color:T.blue, bg:T.blueBg },
          { icon:"💰", label:"Ingresos Hoy",     val:fmtMoney(todayTotal), color:T.green, bg:T.greenBg },
          { icon:"🚫", label:"Bloqueados",        val:blockedCount, color:T.red, bg:T.redBg },
        ].map(s=>(
          <Card key={s.label} style={{ padding:"18px 20px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <div style={{ width:34, height:34, borderRadius:10, background:s.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{s.icon}</div>
              <span style={{ fontSize:11, color:T.text2, fontWeight:600 }}>{s.label}</span>
            </div>
            <div style={{ fontSize:typeof s.val==="string"&&s.val.length>8?16:28, fontWeight:900, color:T.text, fontFamily:"'DM Mono',monospace" }}>{s.val}</div>
          </Card>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <Card>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <span style={{ color:T.text, fontWeight:700, fontSize:14 }}>Entradas de hoy</span>
            <span style={{ background:T.accentBg, color:T.accent, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700 }}>{todayAtt.length}</span>
          </div>
          {todayAtt.length===0 && <div style={{ color:T.text3, fontSize:12, textAlign:"center", padding:20 }}>Sin registros aún</div>}
          {[...todayAtt].reverse().slice(0,6).map((a,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:9, padding:"8px 10px", background:"#f8fafc", borderRadius:9, marginBottom:5, border:`1px solid ${T.border}` }}>
              <Avatar name={a.member_name} size={28}/>
              <span style={{ flex:1, color:T.text, fontSize:12, fontWeight:600 }}>{a.member_name}</span>
              <span style={{ color:T.text3, fontSize:11, fontFamily:"'DM Mono',monospace" }}>{a.time}</span>
              <span style={{ width:7, height:7, borderRadius:"50%", background:a.exit_time?T.text3:T.green }}/>
            </div>
          ))}
        </Card>
        <Card>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <span style={{ color:T.text, fontWeight:700, fontSize:14 }}>Pagos de hoy</span>
            <span style={{ background:T.greenBg, color:T.green, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700 }}>{fmtMoney(todayTotal)}</span>
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:14 }}>
            <div style={{ flex:1, background:"#eef2ff", border:`1px solid #c7d2fe`, borderRadius:10, padding:"10px 12px" }}>
              <div style={{ fontSize:10, color:T.text3, fontWeight:700, marginBottom:3 }}>📱 SINPE</div>
              <div style={{ color:"#6366f1", fontWeight:800, fontSize:14, fontFamily:"'DM Mono',monospace" }}>{fmtMoney(todaySINPE)}</div>
            </div>
            <div style={{ flex:1, background:T.yellowBg, border:`1px solid #fde68a`, borderRadius:10, padding:"10px 12px" }}>
              <div style={{ fontSize:10, color:T.text3, fontWeight:700, marginBottom:3 }}>💵 Efectivo</div>
              <div style={{ color:T.yellow, fontWeight:800, fontSize:14, fontFamily:"'DM Mono',monospace" }}>{fmtMoney(todayEfectivo)}</div>
            </div>
          </div>
          {todayPayments.length===0 && <div style={{ color:T.text3, fontSize:12, textAlign:"center", padding:10 }}>Sin pagos hoy</div>}
          {todayPayments.slice(0,5).map((p,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:9, padding:"7px 10px", background:"#f8fafc", borderRadius:9, marginBottom:4, border:`1px solid ${T.border}` }}>
              <span>{p.method==="SINPE"?"📱":"💵"}</span>
              <span style={{ flex:1, color:T.text, fontSize:12, fontWeight:600 }}>{p.member_name}</span>
              <span style={{ color:T.green, fontWeight:700, fontSize:12, fontFamily:"'DM Mono',monospace" }}>{fmtMoney(p.amount)}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );

  const renderMembers = ()=>(
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
        <input placeholder="🔍  Nombre, cédula o teléfono..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{ flex:1, minWidth:180, background:T.surface, border:`1.5px solid ${T.border2}`,
            borderRadius:10, padding:"10px 13px", color:T.text, fontSize:13, outline:"none", fontFamily:"inherit" }}/>
        {["all","active","overdue","inactive","blocked"].map(s=>(
          <button key={s} onClick={()=>setFilterStatus(s)} style={{ padding:"8px 12px", borderRadius:9, fontSize:11, fontWeight:700,
            cursor:"pointer", fontFamily:"inherit", border:`2px solid ${filterStatus===s?T.accent:T.border2}`,
            background:filterStatus===s?T.accentBg:T.surface, color:filterStatus===s?T.accent:T.text2 }}>
            {{all:"Todos",active:"Activos",overdue:"Vencidos",inactive:"Inactivos",blocked:"Bloqueados"}[s]}
          </button>
        ))}
        <select value={filterPlan} onChange={e=>setFilterPlan(e.target.value)} style={{ background:T.surface, border:`1.5px solid ${T.border2}`,
          borderRadius:9, padding:"8px 12px", color:T.text2, fontSize:11, outline:"none", fontFamily:"inherit" }}>
          <option value="all">Todos los planes</option>
          {["Día","Semanal","Quincenal","Mensual","Bimensual"].map(p=><option key={p}>{p}</option>)}
        </select>
      </div>
      <div style={{ color:T.text3, fontSize:11, marginBottom:10 }}>{loadingData?"Buscando...":`${members.length} resultado${members.length!==1?"s":""}`}</div>
      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        {members.map(m=>{
          const days=diffDays(m.expires_at);
          return (
            <div key={m.id} onClick={()=>setSelectedMember(m)} style={{
              background:T.surface, borderRadius:14, padding:"14px 18px", display:"flex", alignItems:"center", gap:14, cursor:"pointer",
              border:`1.5px solid ${m.blocked?"#fca5a5":days<=3&&days>0?"#fed7aa":T.border}`,
              boxShadow:"0 1px 3px #00000008" }}
              onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 12px #00000012"}
              onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 3px #00000008"}>
              <Avatar name={m.name} size={42}/>
              <div style={{ flex:1 }}>
                <div style={{ color:T.text, fontWeight:700, fontSize:14, marginBottom:2 }}>{m.name}</div>
                <div style={{ color:T.text3, fontSize:12 }}>CI: {m.cedula} · {m.phone}</div>
              </div>
              <PlanTag plan={m.plan}/>
              <StatusBadge status={m.status} blocked={m.blocked}/>
              <div style={{ width:32, height:32, borderRadius:8, flexShrink:0, fontSize:14,
                background:days<=0?T.redBg:days<=3?T.orangeBg:T.greenBg,
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                {days<=0?"⚠️":days<=3?"⏰":"✓"}
              </div>
            </div>
          );
        })}
        {members.length===0&&!loadingData&&<div style={{ color:T.text3, textAlign:"center", padding:60, fontSize:14 }}>Sin resultados</div>}
      </div>
    </div>
  );

  const renderAttendance = ()=>(
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
        {[
          { label:"Total hoy", val:todayAtt.length, color:"#6366f1" },
          { label:"Dentro ahora", val:todayAtt.filter(a=>!a.exit_time&&a.type==="member").length, color:T.green },
          { label:"Visitantes", val:todayAtt.filter(a=>a.type==="visitor").length, color:T.yellow },
        ].map(s=>(
          <Card key={s.label} style={{ textAlign:"center", padding:14 }}>
            <div style={{ fontSize:28, fontWeight:900, color:s.color, fontFamily:"'DM Mono',monospace" }}>{s.val}</div>
            <div style={{ fontSize:11, color:T.text2, marginTop:3 }}>{s.label}</div>
          </Card>
        ))}
      </div>
      <Card>
        <div style={{ color:T.text, fontWeight:700, fontSize:14, marginBottom:14 }}>
          Registro — {new Date().toLocaleDateString("es-CR",{weekday:"long",day:"numeric",month:"long"})}
        </div>
        {todayAtt.length===0&&<div style={{ color:T.text3, fontSize:12, textAlign:"center", padding:30 }}>Sin entradas aún</div>}
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {[...todayAtt].reverse().map((a,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"#f8fafc", borderRadius:10, border:`1px solid ${a.exit_time?T.border:"#86efac"}` }}>
              <span style={{ width:9, height:9, borderRadius:"50%", flexShrink:0, background:a.exit_time?T.text3:T.green }}/>
              <Avatar name={a.member_name} size={32}/>
              <span style={{ flex:1, color:T.text, fontSize:13, fontWeight:600 }}>{a.member_name}</span>
              <PlanTag plan={a.plan}/>
              <div style={{ color:T.text2, fontSize:11, fontFamily:"'DM Mono',monospace", textAlign:"right", minWidth:80 }}>
                <div>▶{a.time}{a.exit_time&&` ↩${a.exit_time}`}</div>
              </div>
              {a.exit_time
                ? <span style={{ fontSize:10, color:T.text3, background:"#f1f5f9", padding:"3px 9px", borderRadius:10, flexShrink:0 }}>Salió</span>
                : <button onClick={async()=>{ await api.patch(`/attendance/${a.id}/exit`); await loadAttendance(); showToast(`↩ Salida: ${a.member_name}`); }}
                    style={{ flexShrink:0, padding:"4px 11px", borderRadius:8, border:`1.5px solid ${T.orange}`,
                      background:T.orangeBg, color:T.orange, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                    ↩ Salida
                  </button>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderPayments = ()=>(
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
        {[
          { label:"Total hoy", val:fmtMoney(todayTotal), color:T.green },
          { label:"📱 SINPE", val:fmtMoney(todaySINPE), color:"#6366f1" },
          { label:"💵 Efectivo", val:fmtMoney(todayEfectivo), color:T.yellow },
        ].map(s=>(
          <Card key={s.label} style={{ textAlign:"center" }}>
            <div style={{ fontSize:11, color:T.text2, marginBottom:6, fontWeight:600 }}>{s.label}</div>
            <div style={{ fontSize:16, fontWeight:900, color:s.color, fontFamily:"'DM Mono',monospace" }}>{s.val}</div>
          </Card>
        ))}
      </div>
      <Card>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <span style={{ color:T.text, fontWeight:700, fontSize:14 }}>Historial del mes</span>
          <span style={{ color:T.text3, fontSize:12 }}>{payments.length} registros</span>
        </div>
        {payments.length===0&&<div style={{ color:T.text3, textAlign:"center", padding:30 }}>Sin pagos este mes</div>}
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          {payments.map((p,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"#f8fafc", borderRadius:10, border:`1px solid ${T.border}` }}>
              <span style={{ fontSize:18 }}>{p.method==="SINPE"?"📱":"💵"}</span>
              <div style={{ flex:1 }}>
                <div style={{ color:T.text, fontSize:13, fontWeight:600 }}>{p.member_name}</div>
                <div style={{ color:T.text3, fontSize:11 }}>{fmtDate(p.paid_at)} · {p.method}</div>
              </div>
              <PlanTag plan={p.plan}/>
              {p.discount>0&&<span style={{ color:T.red, fontSize:10 }}>-{p.discount}%</span>}
              <span style={{ color:T.green, fontWeight:800, fontSize:14, fontFamily:"'DM Mono',monospace" }}>{fmtMoney(p.amount)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderBlacklist = ()=>{
    const blocked = members.filter(m=>m.blocked);
    return (
      <div>
        <div style={{ background:T.redBg, border:`1.5px solid #fca5a5`, borderRadius:12, padding:"14px 18px", marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:24 }}>🚫</span>
          <div>
            <div style={{ color:T.red, fontWeight:700, fontSize:14 }}>{blocked.length} bloqueado{blocked.length!==1?"s":""}</div>
            <div style={{ color:T.text2, fontSize:12 }}>Sin acceso al gimnasio</div>
          </div>
        </div>
        {blocked.length===0&&<div style={{ color:T.text3, textAlign:"center", padding:60 }}>No hay miembros bloqueados</div>}
        {blocked.map(m=>(
          <div key={m.id} style={{ background:T.surface, border:`1.5px solid #fca5a5`, borderRadius:13, padding:"14px 16px", marginBottom:8, boxShadow:"0 1px 4px #00000009" }}>
            <div style={{ display:"flex", alignItems:"center", gap:13, marginBottom:8 }}>
              <Avatar name={m.name} size={40}/>
              <div style={{ flex:1 }}>
                <div style={{ color:T.text, fontWeight:700, fontSize:14 }}>{m.name}</div>
                <div style={{ color:T.text3, fontSize:12 }}>CI: {m.cedula}</div>
              </div>
              <Btn variant="ghost" onClick={()=>toggleBlock(m)} style={{ fontSize:11, border:`1px solid ${T.green}`, color:T.green }}>✓ Desbloquear</Btn>
            </div>
            <div style={{ background:T.redBg, border:`1px solid #fca5a5`, borderRadius:8, padding:"8px 12px" }}>
              <span style={{ color:T.red, fontSize:12 }}>🚫 {m.blacklist_reason||"Sin razón especificada"}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderMemberDetail = ()=>{
    if(!selectedMember) return null;
    const m = selectedMember;
    const days = diffDays(m.expires_at);
    return (
      <Modal title="Perfil del Miembro" onClose={()=>setSelectedMember(null)} width={500}>
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20, padding:16, background:"#f8fafc", border:`1px solid ${T.border}`, borderRadius:14 }}>
          <Avatar name={m.name} size={54}/>
          <div style={{ flex:1 }}>
            <div style={{ color:T.text, fontWeight:800, fontSize:16 }}>{m.name}</div>
            <div style={{ color:T.text3, fontSize:12, marginTop:2 }}>CI: {m.cedula} · {m.phone}</div>
            <div style={{ display:"flex", gap:6, marginTop:8 }}><PlanTag plan={m.plan}/><StatusBadge status={m.status} blocked={m.blocked}/></div>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
          {[
            { label:"Ingresó",        val:fmtDate(m.joined_at) },
            { label:"Vence",          val:fmtDate(m.expires_at), warn:days<=7&&days>=0 },
            { label:"Plan",           val:m.plan },
            { label:"Días restantes", val:days>0?`${days} días`:"Vencido", warn:days<=0 },
          ].map(s=>(
            <div key={s.label} style={{ background:"#f8fafc", border:`1px solid ${T.border}`, borderRadius:10, padding:"10px 14px" }}>
              <div style={{ fontSize:10, color:T.text3, fontWeight:700, marginBottom:3 }}>{s.label.toUpperCase()}</div>
              <div style={{ color:s.warn?T.orange:T.text, fontWeight:700, fontSize:13 }}>{s.val}</div>
            </div>
          ))}
        </div>
        {m.notes&&<div style={{ background:T.yellowBg, border:`1px solid #fde68a`, borderRadius:10, padding:"10px 14px", marginBottom:12, color:T.yellow, fontSize:12 }}>📝 {m.notes}</div>}
        {m.blocked&&<div style={{ background:T.redBg, border:`1px solid #fca5a5`, borderRadius:10, padding:"10px 14px", marginBottom:12, color:T.red, fontSize:12 }}>🚫 {m.blacklist_reason}</div>}
        <div style={{ display:"flex", gap:8, marginBottom:8 }}>
          <Btn variant="ghost" onClick={()=>toggleBlock(m)} style={{ flex:1, fontSize:11 }}>{m.blocked?"✓ Desbloquear":"🚫 Bloquear"}</Btn>
          <Btn variant="ghost" onClick={()=>{ setEditMember(m); setSelectedMember(null); }} style={{ flex:1, fontSize:11 }}>✏️ Editar</Btn>
        </div>
        <button onClick={async()=>{
          if(!window.confirm(`¿Eliminar a ${m.name}? Esta acción no se puede deshacer.`)) return;
          try {
            await api.delete(`/members/${m.id}`);
            showToast(`🗑️ ${m.name} eliminado`);
            setSelectedMember(null);
            loadMembers(); loadAlerts();
          } catch(e){ showToast("❌ "+(e.response?.data?.error||"Error al eliminar"),"err"); }
        }} style={{ width:"100%", padding:"9px", borderRadius:10, border:`1.5px solid #fca5a5`,
          background:T.redBg, color:T.red, fontFamily:"inherit", fontSize:12, fontWeight:700, cursor:"pointer" }}>
          🗑️ Eliminar miembro
        </button>
      </Modal>
    );
  };

  const TABS = { dashboard:renderDashboard, members:renderMembers, attendance:renderAttendance, payments:renderPayments, blacklist:renderBlacklist };
  const LABELS = { dashboard:"Dashboard", members:"Miembros", attendance:"Asistencia", payments:"Pagos", blacklist:"Lista Negra" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;} body{background:${T.bg};}
        ::-webkit-scrollbar{width:5px;} ::-webkit-scrollbar-track{background:#f1f5f9;} ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px;}
        select option{background:#fff;color:#0f172a;}
        input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
        @keyframes toastIn{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
      `}</style>
      <div style={{ minHeight:"100vh", background:T.bg, fontFamily:"'DM Sans',sans-serif", color:T.text, display:"flex" }}>
        {/* SIDEBAR */}
        <div style={{ position:"fixed", top:0, left:0, bottom:0, width:220, background:T.sidebar,
          display:"flex", flexDirection:"column", zIndex:100, boxShadow:"2px 0 10px #0000001a" }}>
          <div style={{ padding:"22px 20px 18px", borderBottom:"1px solid #334155" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:38, height:38, borderRadius:11, background:"linear-gradient(135deg,#6366f1,#818cf8)",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>💪</div>
              <div>
                <div style={{ fontWeight:900, fontSize:15, color:"#fff" }}>GymOS</div>
                <div style={{ fontSize:10, color:"#64748b" }}>{user?.gym?.name}</div>
              </div>
            </div>
          </div>
          <nav style={{ padding:"10px 10px", flex:1 }}>
            {NAV.map(item=>(
              <button key={item.id} onClick={()=>setTab(item.id)} style={{
                width:"100%", display:"flex", alignItems:"center", gap:10, padding:"11px 12px",
                borderRadius:10, marginBottom:3, border:"none", cursor:"pointer", textAlign:"left",
                fontFamily:"inherit", fontSize:13, fontWeight:tab===item.id?700:400,
                background:tab===item.id?"#334155":"transparent", color:tab===item.id?"#fff":"#94a3b8" }}>
                <span>{item.icon}</span><span>{item.label}</span>
                {item.id==="blacklist"&&blockedCount>0&&(
                  <span style={{ marginLeft:"auto", background:"#ef4444", color:"#fff", borderRadius:20, padding:"1px 7px", fontSize:10, fontWeight:800 }}>{blockedCount}</span>
                )}
              </button>
            ))}
          </nav>
          <div style={{ padding:"10px 10px 20px", borderTop:"1px solid #334155" }}>
            <div style={{ fontSize:10, color:"#475569", fontWeight:700, letterSpacing:"1px", padding:"0 12px", marginBottom:8 }}>ACCIONES RÁPIDAS</div>
            {[
              { icon:"👤", label:"Nuevo Miembro",    action:"member",     color:"#818cf8" },
              { icon:"📋", label:"Marcar Asistencia",action:"attendance", color:"#38bdf8" },
              { icon:"💳", label:"Registrar Pago",   action:"payment",    color:"#4ade80" },
              { icon:"🗂️", label:"Cierre de Caja",   action:"cashreport", color:"#fbbf24" },
            ].map(a=>(
              <button key={a.action} onClick={()=>setModal(a.action)} style={{
                width:"100%", display:"flex", alignItems:"center", gap:9, padding:"9px 12px",
                borderRadius:8, marginBottom:2, border:"none", cursor:"pointer", textAlign:"left",
                background:"transparent", color:a.color, fontWeight:600, fontSize:12, fontFamily:"inherit"
              }}><span>{a.icon}</span><span>{a.label}</span></button>
            ))}
            <button onClick={logout} style={{ width:"100%", display:"flex", alignItems:"center", gap:9, padding:"9px 12px",
              borderRadius:8, marginTop:6, border:"1px solid #334155", cursor:"pointer",
              background:"transparent", color:"#64748b", fontWeight:600, fontSize:12, fontFamily:"inherit" }}>🚪 Cerrar sesión</button>
          </div>
        </div>

        {/* MAIN */}
        <div style={{ marginLeft:220, flex:1, padding:"28px 28px 48px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
            <div>
              <h1 style={{ fontSize:22, fontWeight:900, color:T.text }}>{LABELS[tab]}</h1>
              <p style={{ color:T.text3, fontSize:12, marginTop:2 }}>
                {new Date().toLocaleDateString("es-CR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
              </p>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              {tab==="members"    && <Btn onClick={()=>setModal("member")}>+ Nuevo Miembro</Btn>}
              {tab==="attendance" && <Btn onClick={()=>setModal("attendance")}>+ Marcar Entrada</Btn>}
              {tab==="payments"   && <>
                <Btn variant="ghost" onClick={()=>setModal("cashreport")}>🗂️ Cierre de Caja</Btn>
                <Btn variant="green" onClick={()=>setModal("payment")}>+ Registrar Pago</Btn>
              </>}
            </div>
          </div>
          {TABS[tab]?.()}
        </div>

        {/* MODALS */}
        {modal==="member"     && <MemberModal onClose={()=>setModal(null)} onSave={saveMember}/>}
        {modal==="attendance" && <AttendanceModal members={members} todayAttendance={todayAtt} onClose={()=>setModal(null)} onMark={markAttendance} onExit={markExit}/>}
        {modal==="payment"    && <PaymentModal members={members} onClose={()=>setModal(null)} onSave={registerPayment}/>}
        {modal==="cashreport" && <CashReportModal onClose={()=>setModal(null)}/>}
        {editMember && <MemberModal member={editMember} onClose={()=>setEditMember(null)} onSave={saveMember}/>}
        {selectedMember&&!editMember && renderMemberDetail()}
        {alertModal && <AlertListModal {...alertModal} onClose={()=>setAlertModal(null)} onSelectMember={m=>setSelectedMember(m)}/>}

        {/* Toast */}
        {toast && (
          <div style={{ position:"fixed", bottom:24, right:24, background:toast.type==="err"?T.redBg:T.surface,
            border:`1px solid ${toast.type==="err"?"#fca5a5":T.border}`, borderRadius:12, padding:"12px 18px",
            color:toast.type==="err"?T.red:T.text, fontSize:13, fontWeight:600,
            boxShadow:"0 8px 24px #00000018", zIndex:9999, animation:"toastIn 0.3s cubic-bezier(.22,1,.36,1)" }}>{toast.msg}</div>
        )}
      </div>
    </>
  );
}
