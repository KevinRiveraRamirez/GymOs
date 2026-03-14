import { createContext, useContext, useState, useEffect } from "react";
import api from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("gymos_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("gymos_token");
    if (token) {
      api.get("/auth/me")
        .then(r => setUser(r.data))
        .catch(() => { localStorage.removeItem("gymos_token"); localStorage.removeItem("gymos_user"); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const r = await api.post("/auth/login", { email, password });
    localStorage.setItem("gymos_token", r.data.token);
    localStorage.setItem("gymos_user", JSON.stringify(r.data.user));
    setUser(r.data.user);
    return r.data;
  };

  const logout = () => {
    localStorage.removeItem("gymos_token");
    localStorage.removeItem("gymos_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
