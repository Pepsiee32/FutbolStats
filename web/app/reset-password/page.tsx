"use client";

import { useState, FormEvent, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { translateError } from "@/utils/errorTranslations";

// Forzar renderizado dinámico para evitar pre-render durante el build
export const dynamic = 'force-dynamic';

function ResetPasswordContent() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [validToken, setValidToken] = useState(false);

  useEffect(() => {
    // Intercambiar el token de la URL por una sesión
    const handleTokenExchange = async () => {
      // Verificar que estamos en el cliente
      if (typeof window === 'undefined') {
        return;
      }

      try {
        // Leer el hash de la URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const type = hashParams.get("type");

        if (!accessToken || type !== "recovery") {
          setMsg("Error ❌ Enlace inválido o expirado. Por favor solicita un nuevo enlace.");
          return;
        }

        // Intercambiar el token por una sesión
        if (accessToken && refreshToken) {
          const { data: { session }, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error("Error al establecer sesión:", error);
            setMsg(`Error ❌ ${translateError(error.message)}`);
            return;
          }

          if (session) {
            setValidToken(true);
            // Limpiar el hash de la URL para seguridad
            if (typeof window !== 'undefined') {
              window.history.replaceState(null, "", window.location.pathname);
            }
          } else {
            setMsg("Error ❌ No se pudo establecer la sesión");
          }
        } else {
          // Si no hay tokens en el hash, verificar si ya hay una sesión
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setValidToken(true);
          } else {
            setMsg("Error ❌ Enlace inválido o expirado. Por favor solicita un nuevo enlace.");
          }
        }
      } catch (error: any) {
        console.error("Error:", error);
        setMsg("Error ❌ No se pudo procesar el enlace");
      }
    };

    handleTokenExchange();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    if (!password || !confirmPassword) {
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

    // Validación adicional
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
      setMsg("Actualizando contraseña...");

      // Verificar que tenemos una sesión válida
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error("Sesión no válida. Por favor solicita un nuevo enlace de recuperación.");
      }

      // Actualizar la contraseña
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw new Error(translateError(error.message));
      }

      setMsg("✅ Contraseña actualizada correctamente. Redirigiendo...");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (e: any) {
      const errorMessage = e.message ?? String(e) ?? "Error desconocido";
      setMsg(`Error ❌ ${translateError(errorMessage)}`);
    } finally {
      setLoading(false);
    }
  }

  if (!validToken) {
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
        <nav className="bg-black/60 border-b border-white/10 p-4 backdrop-blur-md">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-xl font-black italic uppercase tracking-tighter">
              Fut<span style={{ color: "#22c55e" }}>Stats</span> PRO
            </h1>
          </div>
        </nav>

        <main className="flex-1 flex items-center justify-center p-4">
          <div
            className="w-full max-w-md p-8 rounded-3xl"
            style={{
              background: "rgba(10, 25, 10, 0.9)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div
              className="p-4 rounded-xl text-xs text-center"
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#fca5a5",
              }}
            >
              {msg || "Enlace inválido o expirado"}
            </div>
            <Link
              href="/forgot-password"
              className="block w-full text-center mt-4 text-[10px] font-black uppercase text-green-400 hover:text-green-300 transition-colors"
            >
              Solicitar nuevo enlace
            </Link>
          </div>
        </main>
      </div>
    );
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
      <nav className="bg-black/60 border-b border-white/10 p-4 backdrop-blur-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-black italic uppercase tracking-tighter">
            Fut<span style={{ color: "#22c55e" }}>Stats</span> PRO
          </h1>
        </div>
      </nav>

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
            Nueva Contraseña
          </h2>
          <p className="text-[10px] text-gray-400 text-center mb-6 uppercase tracking-widest">
            Ingresa tu nueva contraseña
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">
                Nueva Contraseña
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-base outline-none focus:border-green-500 transition-colors"
                required
                disabled={loading}
                minLength={6}
                style={{ fontSize: '16px' }}
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
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-base outline-none focus:border-green-500 transition-colors"
                required
                disabled={loading}
                minLength={6}
                style={{ fontSize: '16px' }}
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
              {loading ? "Actualizando..." : "Actualizar Contraseña"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen text-white font-sans flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Cargando...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
