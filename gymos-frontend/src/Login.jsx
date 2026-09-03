import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Email o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(135deg, #f0f4ff 0%, #fafbff 50%, #f0f9ff 100%)",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"'DM Sans',sans-serif",
      padding:"24px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes shimmer {
          0%,100% { opacity:1; } 50% { opacity:0.5; }
        }
        .login-card { animation: fadeUp 0.4s cubic-bezier(.22,1,.36,1); }
        .login-input {
          width:100%; border-radius:12px; padding:13px 16px;
          font-size:14px; font-family:inherit; outline:none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          background:#f8fafc; border:2px solid #e2e8f0; color:#0f172a;
        }
        .login-input:focus {
          border-color:#6366f1;
          box-shadow: 0 0 0 4px rgba(99,102,241,0.12);
          background:#fff;
        }
        .login-input::placeholder { color:#cbd5e1; }
        .login-btn {
          width:100%; padding:14px; border-radius:14px; border:none;
          font-size:15px; font-weight:800; font-family:inherit; cursor:pointer;
          background:linear-gradient(135deg,#6366f1,#818cf8);
          color:#fff; transition:transform 0.15s, box-shadow 0.15s;
          box-shadow:0 4px 16px rgba(99,102,241,0.3);
        }
        .login-btn:hover:not(:disabled) {
          transform:translateY(-2px);
          box-shadow:0 8px 28px rgba(99,102,241,0.4);
        }
        .login-btn:active:not(:disabled) { transform:translateY(0); }
        .login-btn:disabled { background:#e2e8f0; color:#94a3b8; cursor:not-allowed; box-shadow:none; }
        .show-pass-btn {
          position:absolute; right:14px; top:50%; transform:translateY(-50%);
          background:none; border:none; cursor:pointer; font-size:16px;
          color:#94a3b8; padding:4px; line-height:1;
          transition:color 0.15s;
        }
        .show-pass-btn:hover { color:#6366f1; }
      `}</style>

      <div className="login-card" style={{
        background:"#ffffff",
        border:"1px solid #e2e8f0",
        borderRadius:28,
        padding:"44px 40px",
        width:420, maxWidth:"100%",
        boxShadow:"0 8px 48px rgba(99,102,241,0.1), 0 2px 12px rgba(0,0,0,0.06)",
      }}>

        {/* Logo */}
 <img src="/img/completo_con.png" alt="GymTactik"
  style={{ width:"100%", maxWidth:280, objectFit:"contain", margin:"0 auto 8px", display:"block" }}/>


        {/* Error */}
        {error && (
          <div style={{
            background:"#fff5f5", border:"1px solid #fecaca",
            borderRadius:12, padding:"12px 16px", marginBottom:20,
            color:"#dc2626", fontSize:13, fontWeight:600,
            display:"flex", alignItems:"center", gap:8,
          }}>
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={{ display:"block", fontSize:11, color:"#94a3b8", fontWeight:700, letterSpacing:"1px", marginBottom:8 }}>EMAIL</label>
          <input className="login-input" type="email" value={email}
            onChange={e=>setEmail(e.target.value)} placeholder="admin@tugimnasio.com" required
            style={{ marginBottom:16 }}/>

          <label style={{ display:"block", fontSize:11, color:"#94a3b8", fontWeight:700, letterSpacing:"1px", marginBottom:8 }}>CONTRASEÑA</label>
          <div style={{ position:"relative", marginBottom:28 }}>
            <input className="login-input" type={showPass?"text":"password"} value={password}
              onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required
              style={{ paddingRight:46 }}/>
            <button type="button" className="show-pass-btn" onClick={()=>setShowPass(v=>!v)} tabIndex={-1}>
              {showPass?"🙈":"👁️"}
            </button>
          </div>

          <button type="submit" className="login-btn" disabled={loading||!email||!password}>
            {loading ? (
              <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                <span style={{ animation:"shimmer 1s infinite" }}>⏳</span>
                Iniciando sesión...
              </span>
            ) : "Iniciar Sesión →"}
          </button>
        </form>

        <div style={{ textAlign:"center", marginTop:24, color:"#cbd5e1", fontSize:11, fontWeight:500 }}>
          GymTactik · KI Technologies
        </div>
      </div>
    </div>
  );
}
