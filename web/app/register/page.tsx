"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/services/auth";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    if (!email || !password || !confirmPassword) {
      setMsg("Por favor completa todos los campos");
      return;
    }

    if (password !== confirmPassword) {
      setMsg("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 6) {
      setMsg("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    // Validación adicional en frontend para mejor UX
    const hasNumber = /\d/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);

    const errors: string[] = [];
    if (!hasNumber) errors.push("un número");
    if (!hasUpper) errors.push("una mayúscula");
    if (!hasLower) errors.push("una minúscula");

    if (errors.length > 0) {
      setMsg(`La contraseña debe contener al menos: ${errors.join(", ")}`);
      return;
    }

    try {
      setLoading(true);
      setMsg("Creando cuenta...");
      await auth.register(email, password);
      setMsg("OK ✅ Cuenta creada. Redirigiendo...");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (e: any) {
      setMsg(`Error ❌ ${e.message ?? e}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen text-white font-sans flex flex-col"
      style={{
        backgroundColor: "#052e16",
        backgroundImage: `
          linear-gradient(to bottom, transparent 49.8%, rgba(255,255,255,0.15) 49.8%, rgba(255,255,255,0.15) 50.2%, transparent 50.2%),
          radial-gradient(circle at center 50%, transparent 14.8%, rgba(255,255,255,0.15) 15%, rgba(255,255,255,0.15) 15.5%, transparent 15.7%),
          repeating-linear-gradient(90deg, #052e16 0px, #052e16 100px, #063e1e 100px, #063e1e 200px)
        `,
        backgroundAttachment: "fixed",
      }}
    >
      {/* Top nav */}
      <nav className="bg-black/60 border-b border-white/10 p-4 backdrop-blur-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-black italic uppercase tracking-tighter">
            Fut<span style={{ color: "#22c55e" }}>Stats</span> PRO
          </h1>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div
          className="w-full max-w-md p-8 rounded-3xl"
          style={{
            background: "rgba(10, 25, 10, 0.9)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <h2 className="text-2xl font-black italic uppercase text-center mb-2">
            Crear Cuenta
          </h2>
          <p className="text-[10px] text-gray-400 text-center mb-6 uppercase tracking-widest">
            Únete a FutStats PRO
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">
                Email
              </label>
              <input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-green-500 transition-colors"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-green-500 transition-colors"
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">
                Confirmar Contraseña
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-green-500 transition-colors"
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            {msg && (
              <div
                className="p-3 rounded-xl text-xs text-center"
                style={{
                  background: msg.includes("Error")
                    ? "rgba(239, 68, 68, 0.1)"
                    : "rgba(34, 197, 94, 0.1)",
                  border: `1px solid ${
                    msg.includes("Error") ? "rgba(239, 68, 68, 0.3)" : "rgba(34, 197, 94, 0.3)"
                  }`,
                  color: msg.includes("Error") ? "#fca5a5" : "#86efac",
                }}
              >
                {msg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-black font-black py-4 rounded-xl uppercase text-xs tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "#22c55e" }}
            >
              {loading ? "Creando cuenta..." : "Crear Cuenta"}
            </button>

            <div className="text-center pt-4 border-t border-white/10">
              <p className="text-[10px] text-gray-400 mb-2">
                ¿Ya tienes una cuenta?
              </p>
              <Link
                href="/login"
                className="text-[10px] font-black uppercase text-green-400 hover:text-green-300 transition-colors"
              >
                Iniciar Sesión
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
