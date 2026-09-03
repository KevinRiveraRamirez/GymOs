import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import Login from "./Login";
import Dashboard from "./Dashboard";
import Kiosko from "./Kiosko";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(135deg, #f0f4ff 0%, #fafbff 60%, #f0f9ff 100%)",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      fontFamily:"'DM Sans',sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700;900&display=swap');
        @keyframes pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.7; transform:scale(0.95); }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .loading-card { animation: fadeUp 0.4s cubic-bezier(.22,1,.36,1); }
        .loading-icon { animation: pulse 1.4s ease-in-out infinite; }
      `}</style>
      <div className="loading-card" style={{ textAlign:"center" }}>
        <div className="loading-icon" style={{
          width:68, height:68, borderRadius:20,
          background:"linear-gradient(135deg,#6366f1,#818cf8)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:32, margin:"0 auto 18px",
          boxShadow:"0 8px 28px rgba(99,102,241,0.3)",
        }}>💪</div>
        <div style={{ color:"#0f172a", fontWeight:900, fontSize:20, marginBottom:6, letterSpacing:"-0.3px" }}>GymOS</div>
        <div style={{ color:"#94a3b8", fontSize:13, fontWeight:500 }}>Cargando...</div>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/kiosko/:gymId" element={<Kiosko />} />
      <Route path="/*" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}