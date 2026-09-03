import { useState, useEffect } from "react";
import api from "./api";

const fmtMoney = (n) => `₡${Number(n||0).toLocaleString("es-CR")}`;
const fmtK     = (n) => n >= 1000000 ? `₡${(n/1000000).toFixed(1)}M` : n >= 1000 ? `₡${(n/1000).toFixed(0)}K` : fmtMoney(n);

const T = {
  surface:"#ffffff", border:"#e2e8f0",
  text:"#0f172a", text2:"#475569", text3:"#94a3b8",
  accent:"#6366f1", accentBg:"#eef2ff",
  green:"#059669",  greenBg:"#d1fae5",
  orange:"#ea580c", orangeBg:"#ffedd5",
  red:"#dc2626",    redBg:"#fee2e2",
  blue:"#0891b2",   blueBg:"#e0f2fe",
  yellow:"#d97706", yellowBg:"#fef3c7",
};

const PLAN_COLORS = {
  Mensual:"#6366f1", Semanal:"#0891b2",
  Quincenal:"#059669", Bimensual:"#7c3aed", "Día":"#d97706",
};

const Card = ({ children, style }) => (
  <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16,
    padding:20, boxShadow:"0 2px 12px rgba(99,102,241,0.06)", ...style }}>{children}</div>
);

const SectionTitle = ({ children }) => (
  <h2 style={{ fontSize:14, fontWeight:800, color:T.text, marginBottom:14,
    letterSpacing:"-0.2px", display:"flex", alignItems:"center", gap:6 }}>{children}</h2>
);

// ─── KPI CARD ─────────────────────────────────────────────────────────────────
const KPI = ({ icon, label, value, sub, change, bg=T.accentBg, color=T.accent }) => {
  const isPositive = change > 0;
  const isNeutral  = change === null || change === undefined;
  return (
    <Card style={{ padding:"20px 22px" }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:14 }}>
        <div style={{ width:40, height:40, borderRadius:12, background:bg,
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{icon}</div>
        {!isNeutral && (
          <span style={{ fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:20,
            background: isPositive ? T.greenBg : T.redBg,
            color: isPositive ? T.green : T.red }}>
            {isPositive ? "▲" : "▼"} {Math.abs(change)}%
          </span>
        )}
      </div>
      <div style={{ fontSize:26, fontWeight:900, color:T.text, fontFamily:"'DM Mono',monospace",
        letterSpacing:"-1px", marginBottom:4 }}>{value}</div>
      <div style={{ fontSize:12, color:T.text2, fontWeight:600 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:T.text3, marginTop:3 }}>{sub}</div>}
    </Card>
  );
};

// ─── BAR CHART ────────────────────────────────────────────────────────────────
function BarChart({ data, valueKey, labelKey, color="#6366f1", formatValue, height=160, showValues=true }) {
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:5, height, paddingTop:24 }}>
      {data.map((d, i) => {
        const pct = (d[valueKey] / max) * 100;
        const val = formatValue ? formatValue(d[valueKey]) : d[valueKey];
        return (
          <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, height:"100%" }}>
            <div style={{ flex:1, display:"flex", alignItems:"flex-end", width:"100%", position:"relative" }}>
              {showValues && d[valueKey] > 0 && (
                <div style={{ position:"absolute", bottom:"100%", left:"50%", transform:"translateX(-50%)",
                  fontSize:9, color:T.text3, fontWeight:600, whiteSpace:"nowrap", marginBottom:2 }}>
                  {val}
                </div>
              )}
              <div style={{ width:"100%", height:`${Math.max(pct, d[valueKey]>0?2:0)}%`,
                background:`linear-gradient(180deg,${color}bb,${color})`,
                borderRadius:"6px 6px 0 0",
                transition:"height 0.5s cubic-bezier(.22,1,.36,1)" }}/>
            </div>
            <div style={{ fontSize:9, color:T.text3, fontWeight:500, textAlign:"center",
              whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"100%" }}>
              {d[labelKey]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── STACKED BAR ─────────────────────────────────────────────────────────────
function StackedBar({ data, height=160 }) {
  const max = Math.max(...data.map(d => d.sinpe + d.efectivo), 1);
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:5, height, paddingTop:24 }}>
      {data.map((d, i) => {
        const total = d.sinpe + d.efectivo;
        const pctTotal = (total / max) * 100;
        const pctSinpe = total > 0 ? (d.sinpe / total) * 100 : 0;
        return (
          <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, height:"100%" }}>
            <div style={{ flex:1, display:"flex", alignItems:"flex-end", width:"100%" }}>
              <div style={{ width:"100%", height:`${Math.max(pctTotal,total>0?2:0)}%`,
                borderRadius:"6px 6px 0 0", overflow:"hidden",
                display:"flex", flexDirection:"column-reverse",
                transition:"height 0.5s cubic-bezier(.22,1,.36,1)" }}>
                <div style={{ width:"100%", height:`${100-pctSinpe}%`,
                  background:"linear-gradient(180deg,#fbbf24bb,#f59e0b)", minHeight:d.efectivo>0?2:0 }}/>
                <div style={{ width:"100%", height:`${pctSinpe}%`,
                  background:"linear-gradient(180deg,#818cf8bb,#6366f1)", minHeight:d.sinpe>0?2:0 }}/>
              </div>
            </div>
            <div style={{ fontSize:9, color:T.text3, fontWeight:500, textAlign:"center" }}>{d.month}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── DONUT CHART ─────────────────────────────────────────────────────────────
function DonutChart({ data, size=130 }) {
  const total = data.reduce((s,d) => s + d.value, 0);
  if (!total) return <div style={{ color:T.text3, textAlign:"center", padding:20, fontSize:12 }}>Sin datos</div>;

  let cum = 0;
  const r = 44, cx = 60, cy = 60;
  const C = 2 * Math.PI * r;
  const GAP = 0.015;

  const segs = data.map(d => {
    const pct = d.value / total;
    const start = cum;
    cum += pct;
    return { ...d, start, end: cum, pct };
  });

  return (
    <div style={{ display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>
      <svg width={size} height={size} viewBox="0 0 120 120" style={{ flexShrink:0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={17}/>
        {segs.map((s, i) => {
          const sPct = s.pct - GAP;
          if (sPct <= 0) return null;
          return (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={s.color} strokeWidth={17}
              strokeDasharray={`${sPct * C} ${C}`}
              strokeDashoffset={-(s.start + GAP/2) * C}
              style={{ transformOrigin:"50% 50%", transform:"rotate(-90deg)" }}/>
          );
        })}
        <text x={cx} y={cy-5} textAnchor="middle" fontSize="15" fontWeight="900" fill={T.text}>{total}</text>
        <text x={cx} y={cy+10} textAnchor="middle" fontSize="9" fill={T.text3}>total</text>
      </svg>
      <div style={{ display:"flex", flexDirection:"column", gap:7, flex:1 }}>
        {segs.map((s,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:9, height:9, borderRadius:3, background:s.color, flexShrink:0 }}/>
            <span style={{ fontSize:12, color:T.text2, fontWeight:600, flex:1 }}>{s.label}</span>
            <span style={{ fontSize:11, color:T.text3 }}>{s.value}</span>
            <span style={{ fontSize:11, color:s.color, fontWeight:700 }}>{Math.round(s.pct*100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── HORIZONTAL BAR ──────────────────────────────────────────────────────────
function HBar({ label, value, max, color="#6366f1", rank }) {
  const pct = max > 0 ? (value/max)*100 : 0;
  const medals = ["🥇","🥈","🥉"];
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, alignItems:"center" }}>
        <span style={{ fontSize:12, color:T.text, fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
          {medals[rank] || <span style={{ fontSize:10, color:T.text3, fontWeight:700 }}>#{rank+1}</span>}
          {label}
        </span>
        <span style={{ fontSize:12, color, fontWeight:700, fontFamily:"'DM Mono',monospace" }}>{value}d</span>
      </div>
      <div style={{ height:8, background:"#f1f5f9", borderRadius:8, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`,
          background:`linear-gradient(90deg,${color}88,${color})`,
          borderRadius:8, transition:"width 0.6s cubic-bezier(.22,1,.36,1)" }}/>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const [overview,   setOverview]   = useState(null);
  const [revenue,    setRevenue]    = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [members,    setMembers]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState("overview");

  useEffect(()=>{
    const load = async () => {
      setLoading(true);
      try {
        const [ov, rev, att, mem] = await Promise.all([
          api.get("/analytics/overview"),
          api.get("/analytics/revenue"),
          api.get("/analytics/attendance"),
          api.get("/analytics/members"),
        ]);
        setOverview(ov.data);
        setRevenue(rev.data);
        setAttendance(att.data);
        setMembers(mem.data);
      } catch(e){ console.error(e); }
      finally{ setLoading(false); }
    };
    load();
  },[]);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      padding:80, flexDirection:"column", gap:14 }}>
      <style>{`@keyframes pulse2{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(0.94)}}`}</style>
      <div style={{ width:52, height:52, borderRadius:16,
        background:"linear-gradient(135deg,#6366f1,#818cf8)",
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:24,
        animation:"pulse2 1.4s ease-in-out infinite",
        boxShadow:"0 8px 20px rgba(99,102,241,0.3)" }}>📊</div>
      <div style={{ color:T.text3, fontSize:13, fontWeight:500 }}>Cargando analítica...</div>
    </div>
  );

  const TABS = [
    { id:"overview",   label:"📊 Resumen" },
    { id:"revenue",    label:"💰 Ingresos" },
    { id:"attendance", label:"📋 Asistencia" },
    { id:"members",    label:"👥 Miembros" },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display:"flex", gap:4, marginBottom:22, background:T.surface,
        padding:5, borderRadius:14, border:`1px solid ${T.border}`,
        boxShadow:"0 2px 8px rgba(99,102,241,0.06)", width:"fit-content" }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{
            padding:"8px 16px", borderRadius:10, border:"none", cursor:"pointer",
            fontFamily:"inherit", fontSize:12, fontWeight:activeTab===t.id?700:500,
            background:activeTab===t.id?"linear-gradient(135deg,#6366f1,#818cf8)":"transparent",
            color:activeTab===t.id?"#fff":T.text2,
            transition:"all 0.15s",
            boxShadow:activeTab===t.id?"0 2px 8px rgba(99,102,241,0.3)":"none",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── OVERVIEW ───────────────────────────────────────────────────── */}
      {activeTab==="overview" && overview && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:12, marginBottom:18 }}>
            <KPI icon="👥" label="Miembros Activos"
              value={overview.members.active}
              sub={`${overview.members.total} registrados en total`}
              color={T.accent} bg={T.accentBg}/>
            <KPI icon="💰" label="Ingresos del Mes"
              value={fmtK(overview.revenue.thisMonth)}
              sub={`Hoy: ${fmtMoney(overview.revenue.today)}`}
              change={overview.revenue.change}
              color={T.green} bg={T.greenBg}/>
            <KPI icon="📋" label="Asistencia Hoy"
              value={overview.attendance.today}
              sub={`Promedio 30d: ${overview.attendance.avg30} por día`}
              color={T.blue} bg={T.blueBg}/>
            <KPI icon="✨" label="Nuevos Miembros"
              value={overview.newMembers.thisMonth}
              sub="Este mes"
              change={overview.newMembers.change}
              color={T.yellow} bg={T.yellowBg}/>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            <Card>
              <SectionTitle>Estado de miembros</SectionTitle>
              <DonutChart data={[
                { label:"Activos",   value:overview.members.active,           color:T.green },
                { label:"Vencidos",  value:overview.members.overdue,          color:T.orange },
                { label:"Bloqueados",value:overview.members.blocked,          color:T.red },
              ].filter(d=>d.value>0)}/>
            </Card>
            <Card>
              <SectionTitle>Ingresos últimos 6 meses</SectionTitle>
              {revenue.length > 0
                ? <BarChart data={revenue} valueKey="total" labelKey="month"
                    color={T.green} formatValue={fmtK} height={150}/>
                : <div style={{ color:T.text3, textAlign:"center", padding:30, fontSize:12 }}>Sin datos suficientes</div>}
            </Card>
          </div>

          <Card>
            <SectionTitle>Comparativa mes actual vs anterior</SectionTitle>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
              {[
                { label:"Mes Actual",   val:fmtMoney(overview.revenue.thisMonth),  color:T.accent },
                { label:"Mes Anterior", val:fmtMoney(overview.revenue.lastMonth),  color:T.text2 },
                { label:"Variación",
                  val: overview.revenue.change === null ? "—"
                    : `${overview.revenue.change > 0 ? "+" : ""}${overview.revenue.change}%`,
                  color: overview.revenue.change > 0 ? T.green
                    : overview.revenue.change < 0 ? T.red : T.text2 },
              ].map(s=>(
                <div key={s.label} style={{ background:"#f8fafc", border:`1px solid ${T.border}`,
                  borderRadius:12, padding:"14px 16px", textAlign:"center" }}>
                  <div style={{ fontSize:10, color:T.text3, fontWeight:700, marginBottom:6, letterSpacing:"0.5px" }}>{s.label.toUpperCase()}</div>
                  <div style={{ fontSize:17, fontWeight:900, color:s.color, fontFamily:"'DM Mono',monospace" }}>{s.val}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── REVENUE ────────────────────────────────────────────────────── */}
      {activeTab==="revenue" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <Card>
            <SectionTitle>💰 Ingresos totales por mes</SectionTitle>
            {revenue.length > 0
              ? <BarChart data={revenue} valueKey="total" labelKey="month"
                  color={T.green} formatValue={fmtK} height={200}/>
              : <div style={{ color:T.text3, textAlign:"center", padding:30, fontSize:12 }}>Sin datos</div>}
          </Card>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <Card>
              <SectionTitle>📱 SINPE vs 💵 Efectivo</SectionTitle>
              {revenue.length > 0 ? <>
                <StackedBar data={revenue} height={160}/>
                <div style={{ display:"flex", gap:16, marginTop:14, justifyContent:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:10,height:10,borderRadius:3,background:T.accent }}/>
                    <span style={{ fontSize:11,color:T.text2,fontWeight:500 }}>SINPE</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:10,height:10,borderRadius:3,background:"#f59e0b" }}/>
                    <span style={{ fontSize:11,color:T.text2,fontWeight:500 }}>Efectivo</span>
                  </div>
                </div>
              </> : <div style={{ color:T.text3, textAlign:"center", padding:30, fontSize:12 }}>Sin datos</div>}
            </Card>

            <Card>
              <SectionTitle>📋 Detalle mensual</SectionTitle>
              <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:280, overflowY:"auto" }}>
                {[...revenue].reverse().map((r,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10,
                    padding:"10px 12px", background:"#f8fafc", borderRadius:10,
                    border:`1px solid ${T.border}` }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, color:T.text, fontSize:13 }}>{r.month}</div>
                      <div style={{ fontSize:11, color:T.text3 }}>{r.transactions} transacciones</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontWeight:800, color:T.green, fontSize:14, fontFamily:"'DM Mono',monospace" }}>{fmtMoney(r.total)}</div>
                      <div style={{ fontSize:10, color:T.text3 }}>
                        📱{fmtK(r.sinpe)} · 💵{fmtK(r.efectivo)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── ATTENDANCE ─────────────────────────────────────────────────── */}
      {activeTab==="attendance" && attendance && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <Card>
              <SectionTitle>📅 Por día de semana</SectionTitle>
              <p style={{ fontSize:11, color:T.text3, marginBottom:10 }}>Últimos 30 días</p>
              <BarChart data={attendance.byDay} valueKey="visits" labelKey="day"
                color={T.blue} height={160}/>
            </Card>
            <Card>
              <SectionTitle>🕐 Horas pico</SectionTitle>
              <p style={{ fontSize:11, color:T.text3, marginBottom:10 }}>Distribución por hora del día</p>
              <BarChart data={attendance.byHour} valueKey="visits" labelKey="hour"
                color={T.accent} height={160} showValues={false}/>
            </Card>
          </div>
          <Card>
            <SectionTitle>📈 Asistencia — últimos 14 días</SectionTitle>
            <BarChart
              data={attendance.daily.map(d=>({ ...d, label:String(d.date).slice(5) }))}
              valueKey="visits" labelKey="label"
              color={T.green} height={180}/>
          </Card>
        </div>
      )}

      {/* ── MEMBERS ────────────────────────────────────────────────────── */}
      {activeTab==="members" && members && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <Card>
              <SectionTitle>📈 Nuevos miembros por mes</SectionTitle>
              <BarChart data={members.growth} valueKey="newMembers" labelKey="month"
                color={T.accent} height={160}/>
            </Card>
            <Card>
              <SectionTitle>🎯 Distribución por plan</SectionTitle>
              <DonutChart data={members.byPlan.map(p=>({
                label: p.plan, value: p.count,
                color: PLAN_COLORS[p.plan] || T.text3,
              }))}/>
            </Card>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <Card>
              <SectionTitle>🏆 Top 5 más frecuentes</SectionTitle>
              <p style={{ fontSize:11, color:T.text3, marginBottom:14 }}>Últimos 30 días</p>
              {members.topAttendees.length > 0
                ? members.topAttendees.map((m,i)=>(
                    <HBar key={i} label={m.name} value={m.visits}
                      max={members.topAttendees[0].visits}
                      color={[T.accent,T.green,T.blue,T.yellow,T.orange][i]}
                      rank={i}/>
                  ))
                : <div style={{ color:T.text3, textAlign:"center", padding:20, fontSize:12 }}>Sin datos</div>}
            </Card>
            <Card>
              <SectionTitle>📊 Estado actual</SectionTitle>
              <DonutChart data={[
                { label:"Activos",   value:members.byStatus.active,   color:T.green },
                { label:"Vencidos",  value:members.byStatus.overdue,  color:T.orange },
                { label:"Inactivos", value:members.byStatus.inactive, color:T.text3 },
                { label:"Bloqueados",value:members.byStatus.blocked,  color:T.red },
              ].filter(d=>d.value>0)}/>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
