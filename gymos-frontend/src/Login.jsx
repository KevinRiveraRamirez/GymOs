import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLogo from "./AppLogo";
import { useAuth } from "./AuthContext";
import { cn } from "./lib/cn";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Error al iniciar sesion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080a0f] px-4">
      <div className="w-full max-w-[380px] rounded-[20px] border border-[#1a1d2e] bg-[#0d0f1a] px-6 py-8 shadow-[0_24px_80px_#00000045] sm:px-9 sm:py-10">
        <AppLogo
          variant="light"
          size="lg"
          subtitle="Panel de Administracion"
          className="mb-8"
          titleClassName="text-slate-100"
          subtitleClassName="text-slate-600"
        />

        {error && (
          <div className="mb-4 rounded-[10px] border border-red-900 bg-[#7f1d1d22] px-3.5 py-2.5 text-[13px] text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-[14px]">
          <div>
            <label className="mb-[5px] block text-[11px] font-bold tracking-[0.5px] text-slate-500">
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@tugimnasio.com"
              required
              className="w-full rounded-[10px] border border-[#252838] bg-[#12141f] px-3.5 py-[11px] text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="pb-2.5">
            <label className="mb-[5px] block text-[11px] font-bold tracking-[0.5px] text-slate-500">
              CONTRASENA
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required
              className="w-full rounded-[10px] border border-[#252838] bg-[#12141f] px-3.5 py-[11px] text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={cn(
              "flex w-full items-center justify-center rounded-xl px-3 py-3 text-sm font-bold text-white transition",
              loading
                ? "cursor-not-allowed bg-[#1e2130] text-slate-600"
                : "bg-linear-to-br from-indigo-500 to-indigo-400 hover:from-indigo-600 hover:to-indigo-500"
            )}
          >
            {loading ? "Iniciando sesion..." : "Iniciar Sesion"}
          </button>
        </form>
      </div>
    </div>
  );
}
