import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight:"100vh", background:"#080a0f",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"'DM Sans',sans-serif"
    }}>
      <div style={{
        background:"#0d0f1a", border:"1px solid #1a1d2e",
        borderRadius:20, padding:"40px 36px", width:380, maxWidth:"90vw"
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:32 }}>
          <div style={{
            width:44, height:44, borderRadius:12,
            background:"linear-gradient(135deg,#6366f1,#818cf8)",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:22
          }}>💪</div>
          <div>
            <div style={{ color:"#f1f5f9", fontWeight:900, fontSize:20 }}>GymOS</div>
            <div style={{ color:"#475569", fontSize:12 }}>Panel de Administración</div>
          </div>
        </div>

        {error && (
          <div style={{
            background:"#7f1d1d22", border:"1px solid #7f1d1d",
            borderRadius:10, padding:"10px 14px", marginBottom:16,
            color:"#f87171", fontSize:13
          }}>⚠ {error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:11, color:"#64748b", marginBottom:5, fontWeight:700, letterSpacing:"0.5px" }}>EMAIL</label>
            <input
              type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="admin@tugimnasio.com" required
              style={{
                width:"100%", background:"#12141f", border:"1px solid #252838",
                borderRadius:10, padding:"11px 14px", color:"#f1f5f9",
                fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box"
              }}
            />
          </div>
          <div style={{ marginBottom:24 }}>
            <label style={{ display:"block", fontSize:11, color:"#64748b", marginBottom:5, fontWeight:700, letterSpacing:"0.5px" }}>CONTRASEÑA</label>
            <input
              type="password" value={password} onChange={e=>setPassword(e.target.value)}
              placeholder="••••••••" required
              style={{
                width:"100%", background:"#12141f", border:"1px solid #252838",
                borderRadius:10, padding:"11px 14px", color:"#f1f5f9",
                fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box"
              }}
            />
          </div>
          <button type="submit" disabled={loading} style={{
            width:"100%", padding:"12px", borderRadius:12,
            background: loading ? "#1e2130" : "linear-gradient(135deg,#6366f1,#818cf8)",
            border:"none", color: loading ? "#475569" : "#fff",
            fontSize:14, fontWeight:700, cursor: loading ? "not-allowed" : "pointer",
            fontFamily:"inherit"
          }}>
            {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}
