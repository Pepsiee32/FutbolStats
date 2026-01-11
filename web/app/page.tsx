"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./providers/AuthProvider";
import { matchesApi, type Match, resultLabel, type CreateMatchRequest } from "@/services/matches";
import { translateError } from "@/utils/errorTranslations";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Radar, Doughnut, Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

type Tab = "inicio" | "stats" | "logros" | "historial";

function fmtDate(d: string) {
  try {
    return new Date(d).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function cardBorderByResult(result: number | null) {
  if (result === 1) return "#22c55e"; // win
  if (result === 0) return "#9ca3af"; // draw
  if (result === -1) return "#ef4444"; // loss
  return "rgba(255,255,255,0.15)";
}

export default function HomePage() {
  const router = useRouter();
  const { me, loading, logout } = useAuth();

  const [tab, setTab] = useState<Tab>("inicio");
  const [items, setItems] = useState<Match[]>([]);
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  
  // Stats filters
  const [statsFilter, setStatsFilter] = useState<number | "all">("all");
  const [statsSubTab, setStatsSubTab] = useState<"perfil" | "ataque" | "canchas">("perfil");
  
  // Historial filter
  const [historialFilter, setHistorialFilter] = useState<number | "all">("all");
  const [historialSearch, setHistorialSearch] = useState<string>("");
  
  // Filtered historial items
  const filteredHistorialItems = useMemo(() => {
    let filtered = items;
    
    // Filtrar por formato
    if (historialFilter !== "all") {
      filtered = filtered.filter((m) => m.format === historialFilter);
    }
    
    // Filtrar por búsqueda de rival (búsqueda inteligente de palabras completas)
    if (historialSearch.trim()) {
      const searchTerm = historialSearch.trim().toLowerCase();
      const searchWords = searchTerm.split(/\s+/).filter(w => w.length > 0);
      
      filtered = filtered.filter((m) => {
        if (!m.opponent) return false;
        const opponentLower = m.opponent.toLowerCase();
        
        // Si hay múltiples palabras, todas deben coincidir
        return searchWords.every(word => {
          // Buscar palabra completa (separada por espacios o al inicio/fin)
          const wordBoundaryRegex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
          return wordBoundaryRegex.test(opponentLower);
        });
      });
    }
    
    return filtered;
  }, [items, historialFilter, historialSearch]);

  // Form - Initialize date with today's date
  const getTodayDate = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // Get max date (today) for date inputs
  const getMaxDate = () => {
    return getTodayDate();
  };

  const [date, setDate] = useState(getTodayDate());
  const [opponent, setOpponent] = useState("");
  const [format, setFormat] = useState<number>(5);
  const [result, setResult] = useState<number>(1); // 1/0/-1
  const [goals, setGoals] = useState<number | "">("");
  const [assists, setAssists] = useState<number | "">("");
  const [isMvp, setIsMvp] = useState(false);
  const [notes, setNotes] = useState("");

  // Edit modal
  const [editId, setEditId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editOpponent, setEditOpponent] = useState("");
  const [editFormat, setEditFormat] = useState<number | "">("");
  const [editGoals, setEditGoals] = useState<number | "">("");
  const [editAssists, setEditAssists] = useState<number | "">("");
  const [editResult, setEditResult] = useState<number | "">("");
  const [editIsMvp, setEditIsMvp] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    if (!loading && !me) router.replace("/login");
  }, [loading, me, router]);

  function showToast(message: string, type: "success" | "error" | "info" = "info") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  function countChars(text: string): number {
    return text ? text.length : 0;
  }

  function limitChars(text: string, maxChars: number): string {
    if (!text) return text;
    if (text.length <= maxChars) return text;
    return text.slice(0, maxChars);
  }

  async function load() {
    try {
      const data = await matchesApi.list();
      setItems(data);
    } catch (e: any) {
      const errorMessage = e.message ?? "Error al cargar los partidos";
      showToast(translateError(errorMessage), "error");
    }
  }

  useEffect(() => {
    if (me) load();
  }, [me]);

  const totalGoals = useMemo(
    () => items.reduce((acc, m) => acc + (m.goals ?? 0), 0),
    [items]
  );

  // Estadísticas para la sección de inicio
  const homeStats = useMemo(() => {
    const totalAssists = items.reduce((acc, m) => acc + (m.assists ?? 0), 0);
    const totalMVPs = items.filter((m) => m.isMvp).length;
    const wins = items.filter((m) => m.result === 1).length;
    const totalMatches = items.length || 1;
    const winRate = (wins / totalMatches) * 100;

    // Calcular racha actual (desde el partido más reciente hacia atrás)
    // Los items vienen ordenados por fecha descendente (más reciente primero)
    let currentStreak = 0;
    for (let i = 0; i < items.length; i++) {
      if (items[i].result === 1) {
        currentStreak++;
      } else {
        break; // Si no es victoria, la racha se rompe
      }
    }

    return {
      totalAssists,
      totalMVPs,
      winRate,
      currentStreak,
    };
  }, [items]);

  // Filtered items for stats
  const filteredItems = useMemo(() => {
    if (statsFilter === "all") return items;
    return items.filter((m) => m.format === statsFilter);
  }, [items, statsFilter]);

  // Stats calculations
  const statsData = useMemo(() => {
    const wins = filteredItems.filter((m) => m.result === 1).length;
    const draws = filteredItems.filter((m) => m.result === 0).length;
    const losses = filteredItems.filter((m) => m.result === -1).length;
    const totalGoals = filteredItems.reduce((acc, m) => acc + (m.goals ?? 0), 0);
    const totalAssists = filteredItems.reduce((acc, m) => acc + (m.assists ?? 0), 0);
    const mvps = filteredItems.filter((m) => m.isMvp).length;
    const count = filteredItems.length || 1;
    const avgGoals = totalGoals / count;
    const avgAssists = totalAssists / count;
    const winRate = (wins / count) * 100;
    const mvpRate = (mvps / count) * 100;

    return {
      wins,
      draws,
      losses,
      totalGoals,
      totalAssists,
      mvps,
      count,
      avgGoals,
      avgAssists,
      winRate,
      mvpRate,
    };
  }, [filteredItems]);

  // Achievements data
  const achievements = useMemo(() => {
    const totalGoals = items.reduce((acc, m) => acc + (m.goals ?? 0), 0);
    const totalAssists = items.reduce((acc, m) => acc + (m.assists ?? 0), 0);
    const totalMVPs = items.filter((m) => m.isMvp).length;
    const totalMatches = items.length;
    
    // Calculate longest win streak (5+ consecutive wins anywhere in the list)
    let maxStreak = 0;
    let currentStreak = 0;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].result === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    // Calculate longest unbeaten streak (wins + draws, no losses)
    let maxUnbeatenStreak = 0;
    let currentUnbeatenStreak = 0;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].result !== -1) { // Win or draw
        currentUnbeatenStreak++;
        maxUnbeatenStreak = Math.max(maxUnbeatenStreak, currentUnbeatenStreak);
      } else {
        currentUnbeatenStreak = 0;
      }
    }

    // Calculate Messi 91: goles en el año actual
    const currentYear = new Date().getFullYear();
    let goalsInCurrentYear = 0;
    
    for (const match of items) {
      try {
        const matchDate = new Date(match.date);
        const year = matchDate.getFullYear();
        if (year === currentYear) {
          goalsInCurrentYear += (match.goals ?? 0);
        }
      } catch {
        // Si hay error al parsear la fecha, ignorar ese partido
      }
    }

    return {
      messi91: { 
        current: goalsInCurrentYear, 
        target: 91, 
        unlocked: goalsInCurrentYear >= 91,
        year: currentYear 
      },
      invencible: { streak: maxStreak, unlocked: maxStreak >= 5 },
      mvp: { current: totalMVPs, target: 10, unlocked: totalMVPs >= 10 },
      // Nuevos logros
      asistidorSerial: { current: totalAssists, target: 25, unlocked: totalAssists >= 25 },
      rompeRedes: { current: totalGoals, target: 50, unlocked: totalGoals >= 50 },
      muro: { streak: maxUnbeatenStreak, unlocked: maxUnbeatenStreak >= 10 },
      incansable: { current: totalMatches, target: 30, unlocked: totalMatches >= 30 },
      veterano: { current: totalMatches, target: 100, unlocked: totalMatches >= 100 },
    };
  }, [items]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    
    // Validación de campos requeridos
    if (!date || !date.trim()) {
      showToast("La fecha es requerida", "error");
      return;
    }
    
    if (!opponent || !opponent.trim()) {
      showToast("El rival es requerido", "error");
      return;
    }
    
    if (goals === "" || goals === null || goals === undefined) {
      showToast("Los goles son requeridos", "error");
      return;
    }
    
    if (assists === "" || assists === null || assists === undefined) {
      showToast("Las asistencias son requeridas", "error");
      return;
    }

    // Validar límite de letras en notas (validación adicional de seguridad)
    const notesLength = notes ? notes.length : 0;
    if (notesLength > 100) {
      showToast("Las notas no pueden exceder 100 letras. Tienes " + notesLength + " letras.", "error");
      return;
    }

    try {
      showToast("Guardando partido...", "info");

      await matchesApi.create({
        date: new Date(date).toISOString(),
        opponent: opponent.trim(),
        format,
        goals: Number(goals),
        assists: Number(assists),
        result,
        is_mvp: isMvp,
        notes: notes.trim() ? notes.trim() : null,
      });

      // reset form
      setDate(getTodayDate());
      setOpponent("");
      setFormat(5);
      setResult(1);
      setGoals("");
      setAssists("");
      setIsMvp(false);
      setNotes("");

      await load();
      showToast("Partido guardado exitosamente", "success");
    } catch (e: any) {
      const errorMessage = e.message ?? "Error al guardar el partido";
      showToast(translateError(errorMessage), "error");
    }
  }

  async function openEditModal(id: string) {
    try {
      setEditLoading(true);
      const m = await matchesApi.get(id);
      
      const d = new Date(m.date);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      setEditDate(`${yyyy}-${mm}-${dd}`);

      setEditOpponent(m.opponent ?? "");
      setEditFormat(m.format ?? "");
      setEditGoals(m.goals ?? "");
      setEditAssists(m.assists ?? "");
      setEditResult(m.result ?? "");
      setEditIsMvp(!!m.isMvp);
      setEditNotes(m.notes ?? "");
      setEditId(id);
      setEditLoading(false);
    } catch (e: any) {
      const errorMessage = e.message ?? "Error al cargar el partido";
      showToast(translateError(errorMessage), "error");
      setEditLoading(false);
    }
  }

  function closeEditModal() {
    setEditId(null);
    setEditDate("");
    setEditOpponent("");
    setEditFormat("");
    setEditGoals("");
    setEditAssists("");
    setEditResult("");
    setEditIsMvp(false);
    setEditNotes("");
  }

  async function onUpdateMatch(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;

    // Validación de campos requeridos (igual que en onSave)
    if (!editDate || !editDate.trim()) {
      showToast("La fecha es requerida", "error");
      return;
    }
    
    if (!editOpponent || !editOpponent.trim()) {
      showToast("El rival es requerido", "error");
      return;
    }
    
    if (editFormat === "" || editFormat === null || editFormat === undefined) {
      showToast("El formato es requerido", "error");
      return;
    }
    
    if (editResult === "" || editResult === null || editResult === undefined) {
      showToast("El resultado es requerido", "error");
      return;
    }
    
    if (editGoals === "" || editGoals === null || editGoals === undefined) {
      showToast("Los goles son requeridos", "error");
      return;
    }
    
    if (editAssists === "" || editAssists === null || editAssists === undefined) {
      showToast("Las asistencias son requeridas", "error");
      return;
    }

    // Validar límite de letras en notas (validación adicional de seguridad)
    const editNotesLength = editNotes ? editNotes.length : 0;
    if (editNotesLength > 100) {
      showToast("Las notas no pueden exceder 100 letras. Tienes " + editNotesLength + " letras.", "error");
      return;
    }

    try {
      setMsg("Guardando cambios...");

      const payload: CreateMatchRequest = {
        date: new Date(editDate).toISOString(),
        opponent: editOpponent.trim(),
        format: Number(editFormat),
        goals: Number(editGoals),
        assists: Number(editAssists),
        result: Number(editResult),
        is_mvp: editIsMvp,
        notes: editNotes.trim() ? editNotes.trim() : null,
      };

      await matchesApi.update(editId, payload);
      await load();
      closeEditModal();
      showToast("Partido actualizado exitosamente", "success");
    } catch (e: any) {
      const errorMessage = e.message ?? "Error al actualizar el partido";
      showToast(translateError(errorMessage), "error");
    }
  }

  // Chart data helpers
  const radarChartData = useMemo(() => {
    // Normalización de GOLES: (Promedio / 3) * 100, máximo 100 si >= 3
    const goalsNormalized = statsData.avgGoals >= 3 
      ? 100 
      : (statsData.avgGoals / 3) * 100;

    // Normalización de ASIST: (Promedio / 3) * 100, máximo 100 si >= 3
    const assistsNormalized = statsData.avgAssists >= 3 
      ? 100 
      : (statsData.avgAssists / 3) * 100;

    // WINS: Ya es un porcentaje (0-100)
    const winsNormalized = statsData.winRate;

    // MVP: Porcentaje de partidos donde fuiste MVP (0-100)
    // mvpRate ya está calculado como porcentaje, no necesita multiplicarse
    const mvpNormalized = statsData.mvpRate;

    // FORMA: Sistema de puntos (Victoria=3, Empate=1, Derrota=0)
    // Normalizar como (puntos obtenidos / 15) * 100 donde 15 es el máximo en 5 partidos
    const wins = filteredItems.filter((m) => m.result === 1).length;
    const draws = filteredItems.filter((m) => m.result === 0).length;
    const losses = filteredItems.filter((m) => m.result === -1).length;
    const totalPoints = (wins * 3) + (draws * 1) + (losses * 0);
    // Usar los últimos 5 partidos para calcular la forma, o todos si son menos de 5
    const recentMatches = filteredItems.slice(0, Math.min(5, filteredItems.length));
    const recentWins = recentMatches.filter((m) => m.result === 1).length;
    const recentDraws = recentMatches.filter((m) => m.result === 0).length;
    const recentPoints = (recentWins * 3) + (recentDraws * 1);
    const maxPossiblePoints = recentMatches.length * 3; // Máximo posible en los últimos N partidos
    const formaNormalized = maxPossiblePoints > 0 
      ? (recentPoints / maxPossiblePoints) * 100 
      : 0;

    return {
      labels: ['GOLES', 'ASIST', 'WINS', 'MVP', 'FORMA'],
      datasets: [
        {
          data: [
            goalsNormalized,
            assistsNormalized,
            winsNormalized,
            mvpNormalized,
            formaNormalized,
          ],
          backgroundColor: 'rgba(34,197,94,0.2)',
          borderColor: '#22c55e',
          borderWidth: 2,
        },
      ],
    };
  }, [filteredItems, statsData]);

  const performanceChartData = useMemo(() => {
    return {
      labels: ['W', 'D', 'L'],
      datasets: [
        {
          data: [statsData.wins, statsData.draws, statsData.losses],
          backgroundColor: ['#22c55e', '#666', '#ef4444'],
          borderWidth: 0,
        },
      ],
    };
  }, [statsData]);

  const lineChartData = useMemo(() => {
    // Invertir el orden: más antiguos primero, más reciente al final
    const reversedItems = [...filteredItems].reverse();
    return {
      labels: reversedItems.map((_, i) => `P${i + 1}`),
      datasets: [
        {
          data: reversedItems.map((m) => m.goals ?? 0),
          borderColor: '#22c55e',
          fill: true,
          backgroundColor: 'rgba(34,197,94,0.1)',
          tension: 0.4,
        },
      ],
    };
  }, [filteredItems]);

  const barChartData = useMemo(() => {
    // Invertir el orden: más antiguos primero, más reciente al final
    const reversedItems = [...filteredItems].reverse();
    return {
      labels: reversedItems.map((_, i) => `P${i + 1}`),
      datasets: [
        {
          label: 'G',
          data: reversedItems.map((m) => m.goals ?? 0),
          backgroundColor: '#22c55e',
        },
        {
          label: 'A',
          data: reversedItems.map((m) => m.assists ?? 0),
          backgroundColor: '#fff',
        },
      ],
    };
  }, [filteredItems]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
  };

  const radarChartOptions = {
    ...chartOptions,
    scales: {
      r: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        angleLines: { color: 'rgba(255,255,255,0.05)' },
        pointLabels: { color: '#666' },
        ticks: { display: false },
        suggestedMin: 0,
        suggestedMax: 100,
      },
    },
  };

  const doughnutChartOptions = {
    ...chartOptions,
    cutout: '80%',
  };

  // Canchas data
  const canchasData = useMemo(() => {
    const formats = [5, 7, 8, 11];
    return formats.map((f) => {
      const matches = items.filter((m) => m.format === f);
      const wins = matches.filter((m) => m.result === 1).length;
      const perc = matches.length > 0 ? (wins / matches.length) * 100 : 0;
      return { format: f, matches: matches.length, wins, perc };
    });
  }, [items]);

  if (loading) return <main style={{ padding: 24 }}>Cargando...</main>;
  if (!me) return null;

  const initials =
    me.email?.split("@")[0]?.substring(0, 2)?.toUpperCase() ?? "??";

  return (
    <div
      className="min-h-screen text-white font-sans"
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
      <nav className="bg-black/60 border-b border-white/10 p-4 sticky top-0 z-50 backdrop-blur-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-black italic uppercase tracking-tighter">
            Fut<span style={{ color: "#22c55e" }}>Stats</span>
          </h1>
          <div className="flex items-center gap-3 relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center font-bold text-black text-xs border border-white/20 hover:bg-green-400 transition-colors cursor-pointer"
              title={me.email}
            >
              {initials}
            </button>

            {/* User Menu Dropdown */}
            {userMenuOpen && (
              <>
                {/* Backdrop to close menu */}
                <div
                  className="fixed inset-0 z-[60]"
                  onClick={() => setUserMenuOpen(false)}
                />
                {/* Menu */}
                <div
                  className="absolute right-0 top-12 z-[70] min-w-[200px] rounded-2xl"
                  style={{
                    background: "rgba(10, 25, 10, 0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-white/10">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-1">
                      Perfil
                    </p>
                    <p className="text-sm font-bold text-white">{me.email}</p>
                  </div>
                  <div className="relative z-[80]">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setUserMenuOpen(false);
                        try {
                          await logout();
                          router.push("/login");
                        } catch (error: any) {
                          if (process.env.NODE_ENV === "development") {
                            console.error("Error al cerrar sesión:", error);
                          }
                        }
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      className="w-full p-4 text-left text-sm font-bold text-red-400 hover:bg-white/5 active:bg-white/10 transition-colors rounded-b-2xl cursor-pointer"
                      type="button"
                      style={{ 
                        pointerEvents: 'auto',
                        WebkitTapHighlightColor: 'transparent'
                      }}
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="container mx-auto p-4 max-w-xl" style={{ paddingBottom: 120 }}>
        {/* INICIO */}
        {tab === "inicio" && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {/* 1. Partidos */}
              <div
                className="p-4 text-center rounded-2xl"
                style={{
                  background: "rgba(10, 25, 10, 0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderTop: "2px solid rgba(255,255,255,0.2)",
                }}
              >
                <p className="text-[8px] text-gray-500 uppercase font-bold">
                  Partidos
                </p>
                <p className="text-2xl font-black">{items.length}</p>
              </div>

              {/* 2. % Victorias */}
              <div
                className="p-4 text-center rounded-2xl"
                style={{
                  background: "rgba(10, 25, 10, 0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderTop: "2px solid #22c55e",
                }}
              >
                <p className="text-[8px] text-gray-500 uppercase font-bold">
                  % Victorias
                </p>
                <p className="text-2xl font-black" style={{ color: "#22c55e" }}>
                  {homeStats.winRate.toFixed(0)}%
                </p>
              </div>

              {/* 3. Goles Totales */}
              <div
                className="p-4 text-center rounded-2xl"
                style={{
                  background: "rgba(10, 25, 10, 0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderTop: "2px solid #22c55e",
                }}
              >
                <p className="text-[8px] text-gray-500 uppercase font-bold">
                  Goles
                </p>
                <p className="text-2xl font-black" style={{ color: "#22c55e" }}>
                  {totalGoals}
                </p>
              </div>

              {/* 4. Asistencias */}
              <div
                className="p-4 text-center rounded-2xl"
                style={{
                  background: "rgba(10, 25, 10, 0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderTop: "2px solid #3b82f6",
                }}
              >
                <p className="text-[8px] text-gray-500 uppercase font-bold">
                  Asistencias
                </p>
                <p className="text-2xl font-black" style={{ color: "#3b82f6" }}>
                  {homeStats.totalAssists}
                </p>
              </div>

              {/* 5. MVPs */}
              <div
                className="p-4 text-center rounded-2xl"
                style={{
                  background: "rgba(10, 25, 10, 0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderTop: "2px solid #fbbf24",
                }}
              >
                <p className="text-[8px] text-gray-500 uppercase font-bold">
                  MVPs
                </p>
                <p className="text-2xl font-black" style={{ color: "#fbbf24" }}>
                  {homeStats.totalMVPs}
                </p>
              </div>

              {/* 6. Racha Actual */}
              <div
                className="p-4 text-center rounded-2xl"
                style={{
                  background: "rgba(10, 25, 10, 0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderTop: "2px solid #ef4444",
                }}
              >
                <p className="text-[8px] text-gray-500 uppercase font-bold">
                  Racha Actual
                </p>
                <p className="text-2xl font-black" style={{ color: homeStats.currentStreak > 0 ? "#22c55e" : "#ef4444" }}>
                  {homeStats.currentStreak > 0 ? `🔥 ${homeStats.currentStreak}` : homeStats.currentStreak}
                </p>
              </div>
            </div>

            <div
              className="p-6 rounded-3xl mb-8"
              style={{
                background: "rgba(10, 25, 10, 0.9)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <h3 className="text-[10px] font-black uppercase text-center mb-4 tracking-widest" style={{ color: "#22c55e" }}>
                Registrar Partido
              </h3>

              <form className="space-y-4" onSubmit={onSave}>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={getMaxDate()}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-green-500"
                  style={{ 
                    fontSize: '16px',
                    paddingLeft: '12px',
                    paddingRight: '12px',
                    WebkitAppearance: 'none'
                  }}
                  required
                />

                <input
                  type="text"
                  placeholder="Rival"
                  value={opponent}
                  onChange={(e) => setOpponent(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-green-500"
                  required
                />

                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={format}
                    onChange={(e) => setFormat(Number(e.target.value))}
                    className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-gray-200 outline-none"
                    required
                  >
                    <option value={5}>Fútbol 5</option>
                    <option value={7}>Fútbol 7</option>
                    <option value={8}>Fútbol 8</option>
                    <option value={11}>Fútbol 11</option>
                  </select>

                  <select
                    value={result}
                    onChange={(e) => setResult(Number(e.target.value))}
                    className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-gray-200 outline-none"
                    required
                  >
                    <option value={1}>Ganado</option>
                    <option value={0}>Empatado</option>
                    <option value={-1}>Perdido</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    min={0}
                    placeholder="Goles"
                    value={goals}
                    onChange={(e) => setGoals(e.target.value === "" ? "" : Number(e.target.value))}
                    className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-green-500"
                    required
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="Asistencias"
                    value={assists}
                    onChange={(e) => setAssists(e.target.value === "" ? "" : Number(e.target.value))}
                    className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-green-500"
                    required
                  />
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    setIsMvp(!isMvp);
                    e.currentTarget.blur();
                  }}
                  className={`w-full flex items-center justify-center bg-white/5 border rounded-xl p-3 gap-2 transition-colors ${
                    isMvp 
                      ? "border-yellow-400" 
                      : "border-white/10"
                  } outline-none`}
                >
                  <i
                    className={`fas fa-star ${isMvp ? "text-yellow-400" : "text-gray-500"}`}
                    style={{ fontSize: 18 }}
                  ></i>
                  <span className="text-[10px] font-black text-gray-400 uppercase">
                    ¿Fuiste el MVP?
                  </span>
                </button>

                <div>
                  <textarea
                    placeholder='ej: "gol de chilena" o "partido chivo"'
                    value={notes}
                    maxLength={100}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      // Asegurar que nunca exceda 100 caracteres
                      const limited = limitChars(inputValue, 100);
                      setNotes(limited);
                      if (inputValue.length > 100) {
                        showToast("Límite de 100 letras alcanzado", "info");
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pastedText = e.clipboardData.getData('text');
                      const currentText = notes;
                      const combined = currentText + pastedText;
                      const limited = limitChars(combined, 100);
                      setNotes(limited);
                      if (combined.length > 100) {
                        showToast("El texto pegado excede el límite de 100 letras. Se ha limitado automáticamente.", "info");
                      }
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none resize-none"
                    style={{ minHeight: 90, maxHeight: 90 }}
                  />
                  <p 
                    className="text-[9px] mt-1 text-right font-bold"
                    style={{ 
                      color: countChars(notes) >= 100 ? "#ef4444" : countChars(notes) >= 90 ? "#fbbf24" : "#6b7280",
                      transition: "color 0.2s"
                    }}
                  >
                    {countChars(notes)} / 100
                    {countChars(notes) >= 100 && (
                      <span className="ml-2 text-[8px]">⚠️ Límite alcanzado</span>
                    )}
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full text-black font-black py-4 rounded-xl uppercase text-xs tracking-widest"
                  style={{ background: "#22c55e" }}
                >
                  Guardar
                </button>

              </form>
            </div>
          </>
        )}

        {/* STATS */}
        {tab === "stats" && (
          <div className="space-y-4">
            {/* Filter buttons */}
            <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
              <button
                onClick={() => setStatsFilter("all")}
                className={`px-5 py-2 rounded-full text-[10px] font-black uppercase whitespace-nowrap ${
                  statsFilter === "all"
                    ? "bg-green-500 text-black"
                    : "bg-white/10 text-white"
                }`}
              >
                Global
              </button>
              {[5, 7, 8, 11].map((f) => (
                <button
                  key={f}
                  onClick={() => setStatsFilter(f)}
                  className={`px-5 py-2 rounded-full text-[10px] font-black uppercase whitespace-nowrap ${
                    statsFilter === f
                      ? "bg-green-500 text-black"
                      : "bg-white/10 text-white"
                  }`}
                >
                  F{f}
                </button>
              ))}
            </div>

            {/* Sub-tabs */}
            <div className="flex justify-around mb-4 border-b border-white/5">
              <button
                onClick={() => setStatsSubTab("perfil")}
                className={`pb-2 text-[10px] font-black uppercase ${
                  statsSubTab === "perfil"
                    ? "border-b-2 border-green-500 text-white"
                    : "text-gray-500"
                }`}
              >
                Perfil
              </button>
              <button
                onClick={() => setStatsSubTab("ataque")}
                className={`pb-2 text-[10px] font-black uppercase ${
                  statsSubTab === "ataque"
                    ? "border-b-2 border-green-500 text-white"
                    : "text-gray-500"
                }`}
              >
                Ataque
              </button>
              <button
                onClick={() => setStatsSubTab("canchas")}
                className={`pb-2 text-[10px] font-black uppercase ${
                  statsSubTab === "canchas"
                    ? "border-b-2 border-green-500 text-white"
                    : "text-gray-500"
                }`}
              >
                Canchas
              </button>
            </div>

            {/* Perfil sub-tab */}
            {statsSubTab === "perfil" && (
              <div className="space-y-4">
                <div
                  className="p-6 rounded-3xl"
                  style={{
                    background: "rgba(10, 25, 10, 0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <h4 className="text-[10px] font-black uppercase mb-4 text-gray-500 text-center">
                    Perfil de Rendimiento
                  </h4>
                  <div style={{ height: 280, width: "100%" }}>
                    <Radar data={radarChartData} options={radarChartOptions} />
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-[9px] text-gray-400 leading-relaxed space-y-2">
                      <span className="block">
                        <strong className="text-gray-300">Goles y Asistencias:</strong> Calculamos tu promedio por partido. El 100% se alcanza al promediar 3 o más en cada categoría.
                      </span>
                      <span className="block">
                        <strong className="text-gray-300">Victorias (Wins):</strong> Es el porcentaje de éxito de tu equipo en todos los partidos que has registrado.
                      </span>
                      <span className="block">
                        <strong className="text-gray-300">MVP:</strong> Representa qué tan seguido eres elegido el mejor jugador del partido.
                      </span>
                      <span className="block">
                        <strong className="text-gray-300">Forma:</strong> Mide tu racha actual. Sumas 3 puntos por ganar y 1 por empatar en tus últimos 5 partidos. ¡Llegar al 100% significa que vienes de ganar 5 seguidos!
                      </span>
                    </p>
                  </div>
                </div>
                <div
                  className="p-6 rounded-3xl text-center relative"
                  style={{
                    background: "rgba(10, 25, 10, 0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <h4 className="text-[10px] font-black uppercase mb-4 text-gray-500">
                    Win Rate
                  </h4>
                  <div style={{ height: 200, width: "100%" }}>
                    <Doughnut data={performanceChartData} options={doughnutChartOptions} />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-4">
                    <span className="text-3xl font-black">{statsData.winRate.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Ataque sub-tab */}
            {statsSubTab === "ataque" && (
              <div className="space-y-4">
                <div
                  className="p-6 rounded-3xl"
                  style={{
                    background: "rgba(10, 25, 10, 0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <h4 className="text-[10px] font-black uppercase mb-4 text-gray-500 text-center">
                    Goles por Partido
                  </h4>
                  <div style={{ height: 200, width: "100%" }}>
                    <Line data={lineChartData} options={chartOptions} />
                  </div>
                </div>
                <div
                  className="p-6 rounded-3xl"
                  style={{
                    background: "rgba(10, 25, 10, 0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <h4 className="text-[10px] font-black uppercase mb-4 text-gray-500 text-center">
                    Goles vs Asistencias
                  </h4>
                  <div style={{ height: 200, width: "100%" }}>
                    <Bar data={barChartData} options={chartOptions} />
                  </div>
                </div>
              </div>
            )}

            {/* Canchas sub-tab */}
            {statsSubTab === "canchas" && (
              <div
                className="p-6 rounded-3xl space-y-6"
                style={{
                  background: "rgba(10, 25, 10, 0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {canchasData.map((c) => (
                  <div key={c.format} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold uppercase">
                      <span className="text-gray-300">Fútbol {c.format}</span>
                      <span className="text-green-500">{c.perc.toFixed(0)}% Win Rate</span>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-green-500 h-full"
                        style={{ width: `${c.perc}%` }}
                      />
                    </div>
                    <p className="text-[8px] text-gray-500">{c.matches} jugados</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LOGROS */}
        {tab === "logros" && (
          <div className="space-y-4">
            <h2 className="text-center font-black italic text-xl mb-6 uppercase">
              Vitrina de Trofeos
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {/* Messi 91 */}
              <div
                className={`p-4 rounded-3xl text-center ${
                  achievements.messi91.unlocked ? "" : "grayscale opacity-40"
                }`}
                style={{
                  background: achievements.messi91.unlocked
                    ? "rgba(10, 25, 10, 0.9)"
                    : "rgba(10, 25, 10, 0.9)",
                  border: achievements.messi91.unlocked
                    ? "1px solid #fbbf24"
                    : "1px solid rgba(255,255,255,0.1)",
                  boxShadow: achievements.messi91.unlocked
                    ? "0 0 15px rgba(251, 191, 36, 0.2)"
                    : "none",
                }}
              >
                <div className="text-4xl mb-2">🐐</div>
                <h4 className="font-black text-[10px] uppercase">Messi 2012</h4>
                <p className="text-[8px] text-gray-500 mb-3">91 goles.</p>
                <div className="bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-yellow-500 h-full"
                    style={{
                      width: `${Math.min((achievements.messi91.current / 91) * 100, 100)}%`,
                    }}
                  />
                </div>
                <p className="text-[9px] font-black text-green-500 mt-1">
                  Goles en la Temporada {achievements.messi91.year}: {achievements.messi91.current}
                </p>
              </div>

              {/* Invencible */}
              <div
                className={`p-4 rounded-3xl text-center ${
                  achievements.invencible.unlocked ? "" : "grayscale opacity-40"
                }`}
                style={{
                  background: "rgba(10, 25, 10, 0.9)",
                  border: achievements.invencible.unlocked
                    ? "1px solid #fbbf24"
                    : "1px solid rgba(255,255,255,0.1)",
                  boxShadow: achievements.invencible.unlocked
                    ? "0 0 15px rgba(251, 191, 36, 0.2)"
                    : "none",
                }}
              >
                <div className="text-4xl mb-2">🛡️</div>
                <h4 className="font-black text-[10px] uppercase">Invencible</h4>
                <p className="text-[8px] text-gray-500">5 victorias seguidas.</p>
                <p className="text-[9px] font-black text-green-500 mt-1">
                  Mejor Racha Conseguida: {achievements.invencible.streak}
                </p>
              </div>

              {/* MVP */}
              <div
                className={`p-4 rounded-3xl text-center ${
                  achievements.mvp.unlocked ? "" : "grayscale opacity-40"
                }`}
                style={{
                  background: "rgba(10, 25, 10, 0.9)",
                  border: achievements.mvp.unlocked
                    ? "1px solid #fbbf24"
                    : "1px solid rgba(255,255,255,0.1)",
                  boxShadow: achievements.mvp.unlocked
                    ? "0 0 15px rgba(251, 191, 36, 0.2)"
                    : "none",
                }}
              >
                <div className="text-4xl mb-2">⭐</div>
                <h4 className="font-black text-[10px] uppercase">El Elegido</h4>
                <p className="text-[8px] text-gray-500">Gana 10 MVPs.</p>
                <p className="text-[9px] font-black text-yellow-500 mt-1">
                  {achievements.mvp.current} / 10
                </p>
              </div>
                {/* Fortaleza */}
              <div
                className={`p-4 rounded-3xl text-center ${
                  achievements.muro.unlocked ? "" : "grayscale opacity-40"
                }`}
                style={{
                  background: "rgba(10, 25, 10, 0.9)",
                  border: achievements.muro.unlocked
                    ? "1px solid #fbbf24"
                    : "1px solid rgba(255,255,255,0.1)",
                  boxShadow: achievements.muro.unlocked
                    ? "0 0 15px rgba(251, 191, 36, 0.2)"
                    : "none",
                }}
              >
                <div className="text-4xl mb-2">🏰</div>
                <h4 className="font-black text-[10px] uppercase">Fortaleza</h4>
                <p className="text-[8px] text-gray-500">10 partidos sin perder.</p>
                <p className="text-[9px] font-black text-green-500 mt-1">
                  Mejor Racha: {achievements.muro.streak}
                </p>
              </div>
              {/* Rompe-redes */}
              <div
                className={`p-4 rounded-3xl text-center ${
                  achievements.rompeRedes.unlocked ? "" : "grayscale opacity-40"
                }`}
                style={{
                  background: "rgba(10, 25, 10, 0.9)",
                  border: achievements.rompeRedes.unlocked
                    ? "1px solid #fbbf24"
                    : "1px solid rgba(255,255,255,0.1)",
                  boxShadow: achievements.rompeRedes.unlocked
                    ? "0 0 15px rgba(251, 191, 36, 0.2)"
                    : "none",
                }}
              >
                <div className="text-4xl mb-2">⚽</div>
                <h4 className="font-black text-[10px] uppercase">Rompe-redes</h4>
                <p className="text-[8px] text-gray-500 mb-3">50 goles totales.</p>
                <div className="bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-yellow-500 h-full"
                    style={{
                      width: `${Math.min((achievements.rompeRedes.current / 50) * 100, 100)}%`,
                    }}
                  />
                </div>
                <p className="text-[8px] mt-1 font-bold">
                  {achievements.rompeRedes.current} / 50
                </p>
              </div>
              
              {/* Asistidor Serial */}
              <div
                className={`p-4 rounded-3xl text-center ${
                  achievements.asistidorSerial.unlocked ? "" : "grayscale opacity-40"
                }`}
                style={{
                  background: "rgba(10, 25, 10, 0.9)",
                  border: achievements.asistidorSerial.unlocked
                    ? "1px solid #fbbf24"
                    : "1px solid rgba(255,255,255,0.1)",
                  boxShadow: achievements.asistidorSerial.unlocked
                    ? "0 0 15px rgba(251, 191, 36, 0.2)"
                    : "none",
                }}
              >
                <div className="text-4xl mb-2">👟</div>
                <h4 className="font-black text-[10px] uppercase">Asistidor Serial</h4>
                <p className="text-[8px] text-gray-500 mb-3">25 asistencias totales.</p>
                <div className="bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-yellow-500 h-full"
                    style={{
                      width: `${Math.min((achievements.asistidorSerial.current / 25) * 100, 100)}%`,
                    }}
                  />
                </div>
                <p className="text-[8px] mt-1 font-bold">
                  {achievements.asistidorSerial.current} / 25
                </p>
              </div>
              
              {/* Incansable */}
              <div
                className={`p-4 rounded-3xl text-center ${
                  achievements.incansable.unlocked ? "" : "grayscale opacity-40"
                }`}
                style={{
                  background: "rgba(10, 25, 10, 0.9)",
                  border: achievements.incansable.unlocked
                    ? "1px solid #fbbf24"
                    : "1px solid rgba(255,255,255,0.1)",
                  boxShadow: achievements.incansable.unlocked
                    ? "0 0 15px rgba(251, 191, 36, 0.2)"
                    : "none",
                }}
              >
                <div className="text-4xl mb-2">🏃‍♂️</div>
                <h4 className="font-black text-[10px] uppercase">Incansable</h4>
                <p className="text-[8px] text-gray-500 mb-3">30 partidos jugados.</p>
                <div className="bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-yellow-500 h-full"
                    style={{
                      width: `${Math.min((achievements.incansable.current / 30) * 100, 100)}%`,
                    }}
                  />
                </div>
                <p className="text-[8px] mt-1 font-bold">
                  {achievements.incansable.current} / 30
                </p>
              </div>

              {/* Veterano */}
              <div
                className={`p-4 rounded-3xl text-center ${
                  achievements.veterano.unlocked ? "" : "grayscale opacity-40"
                }`}
                style={{
                  background: "rgba(10, 25, 10, 0.9)",
                  border: achievements.veterano.unlocked
                    ? "1px solid #fbbf24"
                    : "1px solid rgba(255,255,255,0.1)",
                  boxShadow: achievements.veterano.unlocked
                    ? "0 0 15px rgba(251, 191, 36, 0.2)"
                    : "none",
                }}
              >
                <div className="text-4xl mb-2">🎖️</div>
                <h4 className="font-black text-[10px] uppercase">Veterano</h4>
                <p className="text-[8px] text-gray-500 mb-3">100 partidos jugados.</p>
                <div className="bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-yellow-500 h-full"
                    style={{
                      width: `${Math.min((achievements.veterano.current / 100) * 100, 100)}%`,
                    }}
                  />
                </div>
                <p className="text-[8px] mt-1 font-bold">
                  {achievements.veterano.current} / 100
                </p>
              </div>
            </div>
          </div>
        )}

        {/* HISTORIAL */}
        {tab === "historial" && (
          <div className="space-y-3">
            <div
              className="p-6 rounded-3xl mb-4"
              style={{
                background: "rgba(10, 25, 10, 0.9)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-1">
                Historial
              </p>
              <h2 className="text-xl font-black italic uppercase">Todos tus partidos</h2>
              {me?.email && (
                <p className="text-[11px] text-gray-400 mt-1">{me.email}</p>
              )}
            </div>

            {/* Filter buttons */}
            <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar mb-4">
              <button
                onClick={() => setHistorialFilter("all")}
                className={`px-5 py-2 rounded-full text-[10px] font-black uppercase whitespace-nowrap ${
                  historialFilter === "all"
                    ? "bg-green-500 text-black"
                    : "bg-white/10 text-white"
                }`}
              >
                Todos
              </button>
              {[5, 7, 8, 11].map((f) => (
                <button
                  key={f}
                  onClick={() => setHistorialFilter(f)}
                  className={`px-5 py-2 rounded-full text-[10px] font-black uppercase whitespace-nowrap ${
                    historialFilter === f
                      ? "bg-green-500 text-black"
                      : "bg-white/10 text-white"
                  }`}
                >
                  F{f}
                </button>
              ))}
            </div>

            {/* Search input */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="🔍 Buscar por rival..."
                value={historialSearch}
                onChange={(e) => setHistorialSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-green-500 placeholder:text-gray-500"
              />
            </div>

            {/* Filtered items */}
            {filteredHistorialItems.length === 0 ? (
              <div
                className="p-6 rounded-2xl text-center"
                style={{
                  background: "rgba(10, 25, 10, 0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <p className="text-sm text-gray-400">
                  {historialSearch.trim() 
                    ? `No se encontraron partidos que coincidan con "${historialSearch}"${historialFilter !== "all" ? ` en Fútbol ${historialFilter}` : ""}.`
                    : historialFilter === "all" 
                      ? "Todavía no hay partidos." 
                      : `No hay partidos de Fútbol ${historialFilter}.`}
                </p>
              </div>
            ) : (
              filteredHistorialItems.map((m) => (
                <div
                  key={m.id}
                  className="p-5 rounded-3xl"
                  style={{
                    background: "rgba(10, 25, 10, 0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderLeft: `5px solid ${cardBorderByResult(m.result)}`,
                  }}
                >
                  {/* Header: Rival y MVP */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-black text-base italic uppercase">
                          {m.opponent ?? "Sin rival"}
                        </h3>
                        {m.isMvp && (
                          <span className="text-lg" style={{ color: "#fbbf24" }} title="MVP">
                            ⭐
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold" style={{ color: "rgba(156, 163, 175, 0.6)" }}>
                        {fmtDate(m.date)}
                      </p>
                    </div>
                    <div
                      className="px-3 py-1 rounded-full text-[10px] font-black uppercase"
                      style={{
                        background: cardBorderByResult(m.result) + "20",
                        color: cardBorderByResult(m.result),
                        border: `1px solid ${cardBorderByResult(m.result)}40`,
                      }}
                    >
                      {resultLabel(m.result)}
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-3 mb-3">
                    <div className="text-center">
                      <p className="text-[8px] text-gray-500 uppercase font-bold mb-1">Formato</p>
                      <p className="text-sm font-black">{m.format ? `F${m.format}` : "—"}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] text-gray-500 uppercase font-bold mb-1">Goles</p>
                      <p className="text-sm font-black" style={{ color: "#22c55e" }}>
                        ⚽ {m.goals ?? 0}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] text-gray-500 uppercase font-bold mb-1">Asistencias</p>
                      <p className="text-sm font-black" style={{ color: "#3b82f6" }}>
                        👟 {m.assists ?? 0}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] text-gray-500 uppercase font-bold mb-1">Total</p>
                      <p className="text-sm font-black" style={{ color: "#fbbf24" }}>
                        {(m.goals ?? 0) + (m.assists ?? 0)}
                      </p>
                    </div>
                  </div>

                  {/* Notas */}
                  {m.notes && (
                    <div
                      className="mb-3 p-3 rounded-xl"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <p className="text-[9px] text-gray-400 italic leading-relaxed">
                        "{m.notes}"
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() => openEditModal(m.id)}
                      className="flex-1 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-white/10"
                      style={{
                        background: "rgba(255,255,255,0.1)",
                        border: "1px solid rgba(255,255,255,0.15)",
                      }}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      disabled={busyId === m.id}
                      onClick={async () => {
                        const ok = confirm("¿Eliminar este partido? (no se puede deshacer)");
                        if (!ok) return;
                        try {
                          setBusyId(m.id);
                          showToast("Eliminando partido...", "info");
                          await matchesApi.remove(m.id);
                          await load();
                          showToast("Partido eliminado exitosamente", "success");
                        } catch (e: any) {
                          const errorMessage = e.message ?? "Error al eliminar el partido";
                          showToast(translateError(errorMessage), "error");
                        } finally {
                          setBusyId(null);
                        }
                      }}
                      className="flex-1 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-colors hover:bg-red-500/20"
                      style={{
                        background: "rgba(239, 68, 68, 0.2)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        color: "#fca5a5",
                      }}
                    >
                      {busyId === m.id ? "..." : "🗑️ Borrar"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 border-t border-white/5 px-6 pt-4 pb-8 flex justify-around rounded-t-3xl z-[100]"
        style={{ background: "rgba(0,0,0,0.95)" }}
      >
        <button
          onClick={() => setTab("inicio")}
          className="flex flex-col items-center gap-1"
          style={{ color: tab === "inicio" ? "#22c55e" : "#9ca3af" }}
        >
          <i className="fas fa-home" style={{ fontSize: 18 }}></i>
          <span className="text-[8px] font-black uppercase">Inicio</span>
        </button>

        <button
          onClick={() => setTab("stats")}
          className="flex flex-col items-center gap-1"
          style={{ color: tab === "stats" ? "#22c55e" : "#9ca3af" }}
        >
          <i className="fas fa-chart-line" style={{ fontSize: 18 }}></i>
          <span className="text-[8px] font-black uppercase">Stats</span>
        </button>

        <button
          onClick={() => setTab("logros")}
          className="flex flex-col items-center gap-1"
          style={{ color: tab === "logros" ? "#22c55e" : "#9ca3af" }}
        >
          <i className="fas fa-trophy" style={{ fontSize: 18 }}></i>
          <span className="text-[8px] font-black uppercase">Logros</span>
        </button>

        <button
          onClick={() => setTab("historial")}
          className="flex flex-col items-center gap-1"
          style={{ color: tab === "historial" ? "#22c55e" : "#9ca3af" }}
        >
          <i className="fas fa-history" style={{ fontSize: 18 }}></i>
          <span className="text-[8px] font-black uppercase">Historial</span>
        </button>
      </nav>

      {/* Modal de edición */}
      {editId && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.8)" }}
          onClick={closeEditModal}
        >
          <div
            className="w-full max-w-xl rounded-3xl p-6"
            style={{
              background: "rgba(10, 25, 10, 0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#22c55e" }}>
                Editar Partido
              </h3>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-white text-xl"
                style={{ fontSize: 24, lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {editLoading ? (
              <p className="text-center text-sm text-gray-400">Cargando...</p>
            ) : (
              <form className="space-y-4" onSubmit={onUpdateMatch}>
                <label className="block text-[10px] font-black uppercase text-gray-400">
                  Fecha
                  <input
                    type="date"
                    value={editDate}
                    style={{ 
                      fontSize: '16px',
                      paddingLeft: '12px',
                      paddingRight: '12px',
                      WebkitAppearance: 'none'
                    }}
                    onChange={(e) => setEditDate(e.target.value)}
                    max={getMaxDate()}
                    required
                    className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-green-500"
                  />
                </label>

                <input
                  type="text"
                  placeholder="Rival"
                  value={editOpponent}
                  onChange={(e) => setEditOpponent(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-green-500"
                  required
                />

                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={editFormat}
                    onChange={(e) => setEditFormat(e.target.value ? Number(e.target.value) : "")}
                    className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-gray-200 outline-none"
                    required
                  >
                    <option value="">Seleccionar formato</option>
                    <option value={5}>Fútbol 5</option>
                    <option value={7}>Fútbol 7</option>
                    <option value={8}>Fútbol 8</option>
                    <option value={11}>Fútbol 11</option>
                  </select>

                  <select
                    value={editResult}
                    onChange={(e) => setEditResult(e.target.value === "" ? "" : Number(e.target.value))}
                    className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-gray-200 outline-none"
                    required
                  >
                    <option value="">Seleccionar resultado</option>
                    <option value={1}>Ganado</option>
                    <option value={0}>Empatado</option>
                    <option value={-1}>Perdido</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    min={0}
                    placeholder="Goles"
                    value={editGoals}
                    onChange={(e) => setEditGoals(e.target.value === "" ? "" : Number(e.target.value))}
                    className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-green-500"
                    required
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="Asistencias"
                    value={editAssists}
                    onChange={(e) => setEditAssists(e.target.value === "" ? "" : Number(e.target.value))}
                    className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-green-500"
                    required
                  />
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    setEditIsMvp(!editIsMvp);
                    e.currentTarget.blur();
                  }}
                  className={`w-full flex items-center justify-center bg-white/5 border rounded-xl p-3 gap-2 transition-colors ${
                    editIsMvp 
                      ? "border-yellow-400" 
                      : "border-white/10"
                  } outline-none`}
                >
                  <i
                    className={`fas fa-star ${editIsMvp ? "text-yellow-400" : "text-gray-500"}`}
                    style={{ fontSize: 18 }}
                  ></i>
                  <span className="text-[10px] font-black text-gray-400 uppercase">
                    ¿Fuiste el MVP?
                  </span>
                </button>

                <div>
                  <textarea
                    placeholder='ej: "gol de chilena" o "partido chivo"'
                    value={editNotes}
                    maxLength={100}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      // Asegurar que nunca exceda 100 caracteres
                      const limited = limitChars(inputValue, 100);
                      setEditNotes(limited);
                      if (inputValue.length > 100) {
                        showToast("Límite de 100 letras alcanzado", "info");
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pastedText = e.clipboardData.getData('text');
                      const currentText = editNotes;
                      const combined = currentText + pastedText;
                      const limited = limitChars(combined, 100);
                      setEditNotes(limited);
                      if (combined.length > 100) {
                        showToast("El texto pegado excede el límite de 100 letras. Se ha limitado automáticamente.", "info");
                      }
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none resize-none"
                    style={{ minHeight: 90, maxHeight: 90 }}
                  />
                  <p 
                    className="text-[9px] mt-1 text-right font-bold"
                    style={{ 
                      color: countChars(editNotes) >= 100 ? "#ef4444" : countChars(editNotes) >= 90 ? "#fbbf24" : "#6b7280",
                      transition: "color 0.2s"
                    }}
                  >
                    {countChars(editNotes)} / 100
                    {countChars(editNotes) >= 100 && (
                      <span className="ml-2 text-[8px]">⚠️ Límite alcanzado</span>
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="submit"
                    className="w-full text-black font-black py-4 rounded-xl uppercase text-xs tracking-widest"
                    style={{ background: "#22c55e" }}
                  >
                    Guardar cambios
                  </button>

                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="w-full font-black py-4 rounded-xl uppercase text-xs tracking-widest"
                    style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-top-2 duration-300"
          style={{
            animation: "slideDown 0.3s ease-out",
          }}
        >
          <div
            className="px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[280px] max-w-[90vw]"
            style={{
              background:
                toast.type === "success"
                  ? "rgba(34, 197, 94, 0.95)"
                  : toast.type === "error"
                  ? "rgba(239, 68, 68, 0.95)"
                  : "rgba(59, 130, 246, 0.95)",
              border: `1px solid ${
                toast.type === "success"
                  ? "rgba(34, 197, 94, 1)"
                  : toast.type === "error"
                  ? "rgba(239, 68, 68, 1)"
                  : "rgba(59, 130, 246, 1)"
              }`,
              backdropFilter: "blur(12px)",
            }}
          >
            <span className="text-2xl">
              {toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️"}
            </span>
            <p className="text-sm font-bold text-white flex-1">{toast.message}</p>
            <button
              onClick={() => setToast(null)}
              className="text-white/80 hover:text-white text-xl leading-none"
              style={{ fontSize: 20, lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
