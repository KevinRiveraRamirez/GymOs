import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import Login from "./Login";
import Dashboard from "./Dashboard";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#080a0f", display:"flex",
      alignItems:"center", justifyContent:"center", color:"#475569",
      fontFamily:"'DM Sans',sans-serif", fontSize:14 }}>
      Cargando...
    </div>
  );
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
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
