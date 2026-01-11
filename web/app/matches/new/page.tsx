"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/services/auth";
import { matchesApi, type CreateMatchRequest } from "@/services/matches";
import { translateError } from "@/utils/errorTranslations";

function resultToNumber(v: string): number | null {
  // UI: "win" | "draw" | "loss" | ""
  if (v === "win") return 1;
  if (v === "draw") return 0;
  if (v === "loss") return -1;
  return null;
}

export default function NewMatchPage() {
  const router = useRouter();

  const [date, setDate] = useState("");
  const [opponent, setOpponent] = useState("");
  const [format, setFormat] = useState<number | "">(8);
  const [goals, setGoals] = useState<number | "">("");
  const [assists, setAssists] = useState<number | "">("");
  const [notes, setNotes] = useState("");

  // nuevos campos que te faltaban ver en UI
  const [resultUi, setResultUi] = useState<"" | "win" | "draw" | "loss">("");
  const [isMvp, setIsMvp] = useState(false);

  const [msg, setMsg] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // ✅ validar sesión con /auth/me
  useEffect(() => {
    (async () => {
      try {
        await auth.me();
      } catch {
        router.push("/login");
      }
    })();
  }, [router]);

  const canSave = useMemo(() => {
    return !!date && !saving;
  }, [date, saving]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;

    try {
      setSaving(true);
      setMsg("Guardando...");

      const payload: CreateMatchRequest = {
        date: new Date(date).toISOString(),
        opponent: opponent?.trim() ? opponent.trim() : null,
        format: format === "" ? null : Number(format),
        goals: goals === "" ? null : Number(goals),
        assists: assists === "" ? null : Number(assists),
        notes: notes?.trim() ? notes.trim() : null,

        // ✅ ahora sí se guardan
        result: resultToNumber(resultUi),
        is_mvp: isMvp,
      };

      await matchesApi.create(payload);

      setMsg("OK ✅ Guardado");
      router.push("/");
    } catch (e: any) {
      const errorMessage = e.message ?? String(e) ?? "Error desconocido";
      setMsg(`Error ❌ ${translateError(errorMessage)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="min-h-screen text-white font-sans"
      style={{
        backgroundColor: "#052e16",
        backgroundImage: `
          linear-gradient(to bottom, transparent 54.8%, rgba(255,255,255,0.15) 54.8%, rgba(255,255,255,0.15) 55.2%, transparent 55.2%),
          radial-gradient(circle at center 55%, transparent 14.8%, rgba(255,255,255,0.15) 15%, rgba(255,255,255,0.15) 15.5%, transparent 15.7%),
          repeating-linear-gradient(90deg, transparent 0, transparent 80px, rgba(0,0,0,0.1) 80px, rgba(0,0,0,0.1) 160px)
        `,
        backgroundAttachment: "fixed",
      }}
    >
      {/* Topbar */}
      <nav
        className="border-b border-white/10 p-4 sticky top-0 z-50 backdrop-blur-md"
        style={{ background: "rgba(0, 0, 0, 0.5)" }}
      >
        <div className="container mx-auto flex justify-between items-center">
          <button
            onClick={() => router.push("/matches")}
            className="text-xs uppercase font-black tracking-widest"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "10px 12px",
              borderRadius: 12,
            }}
          >
            ← Historial
          </button>

          <h1 className="text-xl font-black italic tracking-tighter uppercase">
            Nuevo <span style={{ color: "#22c55e" }}>Partido</span>
          </h1>

          <div style={{ width: 90 }} />
        </div>
      </nav>

      <main className="container mx-auto p-4 md:p-8 max-w-xl">
        <div
          className="p-7 rounded-3xl"
          style={{
            background: "rgba(10, 25, 10, 0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <h2
            className="text-[10px] font-black uppercase mb-5 tracking-widest text-center"
            style={{ color: "#22c55e" }}
          >
            Registrar Partido
          </h2>

          {msg ? (
            <div
              className="p-4 rounded-2xl mb-5"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <p
                className="text-sm"
                style={{
                  color: msg.includes("Error") ? "#f87171" : msg.includes("OK") ? "#34d399" : "#9ca3af",
                }}
              >
                {msg}
              </p>
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-4">
            <input
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              placeholder="Rival / Cancha"
              className="w-full rounded-xl p-3 text-sm outline-none text-white placeholder-gray-400"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            />

            <div className="grid grid-cols-2 gap-3">
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value ? Number(e.target.value) : "")}
                className="rounded-xl p-3 text-sm outline-none"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "white",
                }}
              >
                <option value={5}>Fútbol 5</option>
                <option value={7}>Fútbol 7</option>
                <option value={8}>Fútbol 8</option>
                <option value={11}>Fútbol 11</option>
              </select>

              <select
                value={resultUi}
                onChange={(e) => setResultUi(e.target.value as any)}
                className="rounded-xl p-3 text-sm outline-none"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "white",
                }}
              >
                <option value="">Resultado (opcional)</option>
                <option value="win">Ganado</option>
                <option value="draw">Empatado</option>
                <option value="loss">Perdido</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full rounded-xl p-3 text-sm outline-none text-white"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  colorScheme: "dark",
                }}
              />

              <div
                className="rounded-xl p-3 flex items-center justify-center gap-2"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                <input
                  id="mvp"
                  type="checkbox"
                  checked={isMvp}
                  onChange={(e) => setIsMvp(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: "#22c55e" }}
                />
                <label
                  htmlFor="mvp"
                  className="text-[10px] font-black uppercase"
                  style={{ color: "#9ca3af" }}
                >
                  ⭐ ¿Fuiste el MVP?
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min={0}
                value={goals}
                onChange={(e) => setGoals(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Goles"
                className="w-full rounded-xl p-3 text-sm outline-none text-white placeholder-gray-400"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              />

              <input
                type="number"
                min={0}
                value={assists}
                onChange={(e) => setAssists(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Asist"
                className="w-full rounded-xl p-3 text-sm outline-none text-white placeholder-gray-400"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              />
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={`ej: "gol de chilena" o "partido chivo"`}
              className="w-full rounded-xl p-3 text-sm outline-none text-white placeholder-gray-400"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                minHeight: 110,
              }}
            />

            <button
              type="submit"
              disabled={!canSave}
              className="w-full rounded-xl uppercase text-xs tracking-widest font-black py-4 transition-all"
              style={{
                background: canSave ? "#22c55e" : "rgba(34,197,94,0.3)",
                color: "black",
                opacity: canSave ? 1 : 0.7,
              }}
            >
              {saving ? "Guardando..." : "Guardar Partido"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/matches")}
              className="w-full rounded-xl uppercase text-xs tracking-widest font-black py-3"
              style={{
                background: "rgba(255, 255, 255, 0.10)",
                color: "white",
                border: "1px solid rgba(255, 255, 255, 0.10)",
              }}
            >
              Cancelar
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
