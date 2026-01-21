"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./providers/AuthProvider";
import { matchesApi, type Match, resultLabel, type CreateMatchRequest } from "@/services/matches";
import { feedbackApi, type FeedbackKind } from "@/services/feedback";
import { translateError } from "@/utils/errorTranslations";
import confetti from "canvas-confetti";
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
type HistorialDateMode = "all" | "week" | "month" | "year";

function fmtDate(d: string) {
  try {
    // Usar UTC para evitar problemas de zona horaria
    const date = new Date(d);
    const day = date.getUTCDate();
    const month = date.getUTCMonth();
    const year = date.getUTCFullYear();
    
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    
    return `${day.toString().padStart(2, '0')} ${months[month]}, ${year}`;
  } catch {
    return d;
  }
}

// Función helper para convertir fecha YYYY-MM-DD a ISO string sin problemas de zona horaria
function dateToISOString(dateString: string): string {
  // dateString viene en formato "YYYY-MM-DD"
  // Simplemente agregamos "T00:00:00.000Z" para crear una fecha ISO a medianoche UTC
  // Esto evita cualquier problema de conversión de zona horaria
  return `${dateString}T00:00:00.000Z`;
}

// Función helper para convertir fecha ISO a formato YYYY-MM-DD sin problemas de zona horaria
function isoToDateString(isoString: string): string {
  // Extraemos solo la parte de la fecha (YYYY-MM-DD) del string ISO
  // Esto evita problemas de conversión de zona horaria
  if (!isoString) return "";
  const datePart = isoString.split('T')[0];
  return datePart;
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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackKind, setFeedbackKind] = useState<FeedbackKind>("ui");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [unlockedAchievement, setUnlockedAchievement] = useState<{ key: string; title: string; icon: string; barColor: string; rarity?: "epic" | "legendary" } | null>(null);
  const [achievementQueue, setAchievementQueue] = useState<Array<{ key: string; title: string; icon: string; barColor: string; rarity?: "epic" | "legendary" }>>([]);
  const previousAchievementsRef = useRef<Record<string, { unlocked?: boolean }>>({});
  const previousItemsCountRef = useRef<number>(0);
  
  // Handler para logout que funciona en Safari
  const handleLogout = async (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    // Prevenir doble clicks
    if (isLoggingOut) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    e.stopPropagation();
    e.preventDefault();
    
    setIsLoggingOut(true);
    setUserMenuOpen(false);
    
    try {
      await logout();
      router.push("/login");
    } catch (error: any) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error al cerrar sesión:", error);
      }
      setIsLoggingOut(false);
    }
  };
  
  // Stats filters
  const [statsFilter, setStatsFilter] = useState<number | "all">("all");
  const [statsSubTab, setStatsSubTab] = useState<"perfil" | "ataque" | "canchas">("perfil");
  
  // Historial filter
  const [historialFilter, setHistorialFilter] = useState<number | "all">("all");
  const [historialSearch, setHistorialSearch] = useState<string>("");
  const [historialDateMode, setHistorialDateMode] = useState<HistorialDateMode>("all");
  
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

    // Filtrar por fecha (UTC para evitar problemas de zona horaria)
    const msPerDay = 24 * 60 * 60 * 1000;
    const now = new Date();
    const todayUtcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const todayKey = isoToDateString(todayUtcMidnight.toISOString());
    const thisMonthKey = todayKey.slice(0, 7); // YYYY-MM
    const thisYearKey = todayKey.slice(0, 4); // YYYY
    const matchKeyOf = (m: Match) => isoToDateString(m.date);

    const applyLastDays = (daysBackInclusive: number) => {
      const start = new Date(todayUtcMidnight.getTime() - daysBackInclusive * msPerDay);
      const startKey = isoToDateString(start.toISOString());
      filtered = filtered.filter((m) => {
        const k = matchKeyOf(m);
        return k >= startKey && k <= todayKey;
      });
    };

    if (historialDateMode === "week") {
      applyLastDays(6); // 7 días: hoy + 6 días previos (inclusive)
    } else if (historialDateMode === "month") {
      // Mes calendario actual (ej: si estamos en enero, solo enero)
      filtered = filtered.filter((m) => matchKeyOf(m).slice(0, 7) === thisMonthKey);
    } else if (historialDateMode === "year") {
      // Año calendario actual (ej: si estamos en 2026, solo 2026)
      filtered = filtered.filter((m) => matchKeyOf(m).slice(0, 4) === thisYearKey);
    }

    // Ordenar más recientes primero
    filtered = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return filtered;
  }, [items, historialFilter, historialSearch, historialDateMode]);

  const historialTimelineGroups = useMemo(() => {
    const byDay = new Map<string, Match[]>();
    for (const m of filteredHistorialItems) {
      const key = isoToDateString(m.date) || "sin-fecha";
      const arr = byDay.get(key);
      if (arr) arr.push(m);
      else byDay.set(key, [m]);
    }

    const keys = [...byDay.keys()].sort((a, b) => (a < b ? 1 : -1));
    return keys.map((dateKey) => {
      const matches = [...(byDay.get(dateKey) ?? [])].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      return { dateKey, matches };
    });
  }, [filteredHistorialItems]);

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

  // Validar que la fecha no sea futura
  const isValidDate = (dateValue: string): boolean => {
    if (!dateValue) return false;
    const selectedDate = new Date(dateValue);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Fin del día de hoy
    return selectedDate <= today;
  };

  const clampNonNegativeInt = (n: number) => Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));

  const [date, setDate] = useState(getTodayDate());
  const [opponent, setOpponent] = useState("");
  const [format, setFormat] = useState<number>(5);
  // Marcador
  const [goalsScored, setGoalsScored] = useState<number>(0);
  const [goalsConceded, setGoalsConceded] = useState<number>(0);
  // Rendimiento personal
  const [goals, setGoals] = useState<number>(0);
  const [assists, setAssists] = useState<number>(0);
  const [isMvp, setIsMvp] = useState(false);
  const [notes, setNotes] = useState("");

  // Edit modal
  const [editId, setEditId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editOpponent, setEditOpponent] = useState("");
  const [editFormat, setEditFormat] = useState<number | "">("");
  const [editGoalsScored, setEditGoalsScored] = useState<number>(0);
  const [editGoalsConceded, setEditGoalsConceded] = useState<number>(0);
  const [editGoals, setEditGoals] = useState<number>(0);
  const [editAssists, setEditAssists] = useState<number>(0);
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
    const totalWins = items.filter((m) => m.result === 1).length;
    const totalContributions = totalGoals + totalAssists;

    const maxGoalsInMatch = items.reduce((acc, m) => Math.max(acc, m.goals ?? 0), 0);
    const maxAssistsInMatch = items.reduce((acc, m) => Math.max(acc, m.assists ?? 0), 0);
    const completeMatches = items.filter((m) => (m.goals ?? 0) > 0 && (m.assists ?? 0) > 0).length;

    const formatsPlayedCount = new Set(
      items
        .map((m) => (typeof m.format === "number" ? m.format : Number(m.format)))
        .filter((f) => [5, 7, 8, 11].includes(f)),
    ).size;

    const cleanSheets = items.reduce((acc, m) => {
      const rec = m as unknown as Record<string, unknown>;
      const conceded =
        rec.goalsConceded ??
        rec.goals_conceded ??
        null;
      return typeof conceded === "number" && conceded === 0 ? acc + 1 : acc;
    }, 0);
    
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
    const currentYear = new Date().getUTCFullYear();
    let goalsInCurrentYear = 0;
    
    for (const match of items) {
      try {
        const matchDate = new Date(match.date);
        const year = matchDate.getUTCFullYear();
        if (year === currentYear) {
          goalsInCurrentYear += (match.goals ?? 0);
        }
      } catch {
        // Si hay error al parsear la fecha, ignorar ese partido
      }
    }

    // Fecha de desbloqueo (tooltip): derivada de la fecha de partidos
    const unlockedAt: Record<string, string | undefined> = {};
    const setUnlockedAtIfMissing = (key: string, date: string | undefined) => {
      if (!date) return;
      if (!unlockedAt[key]) unlockedAt[key] = date;
    };

    const parseTime = (d: unknown) => {
      if (typeof d !== "string") return null;
      const t = Date.parse(d);
      return Number.isFinite(t) ? t : null;
    };

    const sortedByDate = [...items].sort((a, b) => {
      const ta = parseTime(a.date);
      const tb = parseTime(b.date);
      return (ta ?? Number.POSITIVE_INFINITY) - (tb ?? Number.POSITIVE_INFINITY);
    });

    let cumGoals = 0;
    let cumAssists = 0;
    let cumWins = 0;
    let cumMVPs = 0;
    let cumMatches = 0;
    let cumCleanSheets = 0;
    let yearGoalsCum = 0;

    let winStreak = 0;
    let unbeatenStreak = 0;
    const formatsSet = new Set<number>();

    for (const m of sortedByDate) {
      const date = typeof m.date === "string" ? m.date : undefined;
      const goals = m.goals ?? 0;
      const assists = m.assists ?? 0;

      cumMatches += 1;
      cumGoals += goals;
      cumAssists += assists;
      if (m.result === 1) cumWins += 1;
      if (m.isMvp) cumMVPs += 1;

      const rec = m as unknown as Record<string, unknown>;
      const conceded = rec.goalsConceded ?? rec.goals_conceded ?? null;
      if (typeof conceded === "number" && conceded === 0) cumCleanSheets += 1;

      const fmt = typeof m.format === "number" ? m.format : Number(m.format);
      if ([5, 7, 8, 11].includes(fmt)) formatsSet.add(fmt);

      winStreak = m.result === 1 ? winStreak + 1 : 0;
      unbeatenStreak = m.result !== -1 ? unbeatenStreak + 1 : 0;

      // Targets acumulativos
      if (cumMatches >= 1) setUnlockedAtIfMissing("debut", date);
      if (cumMatches >= 10) setUnlockedAtIfMissing("regular", date);
      if (cumMatches >= 30) setUnlockedAtIfMissing("incansable", date);
      if (cumMatches >= 100) setUnlockedAtIfMissing("veterano", date);

      if (cumWins >= 1) setUnlockedAtIfMissing("primeraVictoria", date);
      if (cumWins >= 10) setUnlockedAtIfMissing("ganador", date);
      if (cumWins >= 25) setUnlockedAtIfMissing("campeon", date);

      if (cumGoals >= 10) setUnlockedAtIfMissing("goleador", date);
      if (cumGoals >= 50) setUnlockedAtIfMissing("rompeRedes", date);
      if (cumGoals >= 100) setUnlockedAtIfMissing("leyendaGoles", date);

      if (cumAssists >= 10) setUnlockedAtIfMissing("asistidor", date);
      if (cumAssists >= 25) setUnlockedAtIfMissing("asistidorSerial", date);
      if (cumAssists >= 50) setUnlockedAtIfMissing("maestroAsist", date);

      if (cumMVPs >= 5) setUnlockedAtIfMissing("estrella", date);
      if (cumMVPs >= 10) setUnlockedAtIfMissing("mvp", date);

      if (cumCleanSheets >= 5) setUnlockedAtIfMissing("vallaInvicta", date);

      const cumContrib = cumGoals + cumAssists;
      if (cumContrib >= 100) setUnlockedAtIfMissing("jugadorTotal", date);

      // Targets por partido
      if (assists >= 3) setUnlockedAtIfMissing("tripleAsistencia", date);
      if (goals >= 3) setUnlockedAtIfMissing("hatTrick", date);
      if (goals >= 4) setUnlockedAtIfMissing("poker", date);

      // Targets especiales
      if (goals > 0 && assists > 0) setUnlockedAtIfMissing("completo", date);
      if (formatsSet.size >= 4) setUnlockedAtIfMissing("polivalente", date);

      // Rachas
      if (winStreak >= 5) setUnlockedAtIfMissing("invencible", date);
      if (winStreak >= 7) setUnlockedAtIfMissing("campeonDelMundoPlm", date);
      if (unbeatenStreak >= 10) setUnlockedAtIfMissing("muro", date);

      // Messi 2012 (temporada actual)
      try {
        const t = parseTime(m.date);
        if (t !== null) {
          const y = new Date(t).getUTCFullYear();
          if (y === currentYear) {
            yearGoalsCum += goals;
            if (yearGoalsCum >= 91) setUnlockedAtIfMissing("messi91", date);
          }
        }
      } catch {
        // ignore
      }
    }

    return {
      messi91: { 
        current: goalsInCurrentYear, 
        target: 91, 
        unlocked: goalsInCurrentYear >= 91,
        year: currentYear,
        unlockedAt: unlockedAt.messi91,
      },
      // Victorias
      invencible: { current: maxStreak, target: 5, unlocked: maxStreak >= 5, unlockedAt: unlockedAt.invencible },
      primeraVictoria: { current: totalWins, target: 1, unlocked: totalWins >= 1, unlockedAt: unlockedAt.primeraVictoria },
      ganador: { current: totalWins, target: 10, unlocked: totalWins >= 10, unlockedAt: unlockedAt.ganador },
      campeon: { current: totalWins, target: 25, unlocked: totalWins >= 25, unlockedAt: unlockedAt.campeon },
      campeonDelMundoPlm: { current: maxStreak, target: 7, unlocked: maxStreak >= 7, unlockedAt: unlockedAt.campeonDelMundoPlm },

      // Speciales
      mvp: { current: totalMVPs, target: 10, unlocked: totalMVPs >= 10, unlockedAt: unlockedAt.mvp },
      estrella: { current: totalMVPs, target: 5, unlocked: totalMVPs >= 5, unlockedAt: unlockedAt.estrella },
      muro: { current: maxUnbeatenStreak, target: 10, unlocked: maxUnbeatenStreak >= 10, unlockedAt: unlockedAt.muro },
      polivalente: { current: formatsPlayedCount, target: 4, unlocked: formatsPlayedCount >= 4, unlockedAt: unlockedAt.polivalente },
      completo: { current: completeMatches, target: 1, unlocked: completeMatches >= 1, unlockedAt: unlockedAt.completo },
      vallaInvicta: { current: cleanSheets, target: 5, unlocked: cleanSheets >= 5, unlockedAt: unlockedAt.vallaInvicta },
      jugadorTotal: { current: totalContributions, target: 100, unlocked: totalContributions >= 100, unlockedAt: unlockedAt.jugadorTotal },

      // Asistencias
      asistidor: { current: totalAssists, target: 10, unlocked: totalAssists >= 10, unlockedAt: unlockedAt.asistidor },
      asistidorSerial: { current: totalAssists, target: 25, unlocked: totalAssists >= 25, unlockedAt: unlockedAt.asistidorSerial },
      maestroAsist: { current: totalAssists, target: 50, unlocked: totalAssists >= 50, unlockedAt: unlockedAt.maestroAsist },
      tripleAsistencia: { current: maxAssistsInMatch, target: 3, unlocked: maxAssistsInMatch >= 3, unlockedAt: unlockedAt.tripleAsistencia },

      // Goles
      goleador: { current: totalGoals, target: 10, unlocked: totalGoals >= 10, unlockedAt: unlockedAt.goleador },
      rompeRedes: { current: totalGoals, target: 50, unlocked: totalGoals >= 50, unlockedAt: unlockedAt.rompeRedes },
      leyendaGoles: { current: totalGoals, target: 100, unlocked: totalGoals >= 100, unlockedAt: unlockedAt.leyendaGoles },
      hatTrick: { current: maxGoalsInMatch, target: 3, unlocked: maxGoalsInMatch >= 3, unlockedAt: unlockedAt.hatTrick },
      poker: { current: maxGoalsInMatch, target: 4, unlocked: maxGoalsInMatch >= 4, unlockedAt: unlockedAt.poker },

      // Partidos
      debut: { current: totalMatches, target: 1, unlocked: totalMatches >= 1, unlockedAt: unlockedAt.debut },
      regular: { current: totalMatches, target: 10, unlocked: totalMatches >= 10, unlockedAt: unlockedAt.regular },
      incansable: { current: totalMatches, target: 30, unlocked: totalMatches >= 30, unlockedAt: unlockedAt.incansable },
      veterano: { current: totalMatches, target: 100, unlocked: totalMatches >= 100, unlockedAt: unlockedAt.veterano },
    };
  }, [items]);

  // Definiciones de logros (reutilizable) con colores y rarities
  const achievementDefs: Array<{ key: string; title: string; icon: string; barColor: string; rarity?: "epic" | "legendary" }> = [
    { key: "goleador", title: "Goleador", icon: "⚽", barColor: "#eab308" },
    { key: "rompeRedes", title: "Rompe-redes", icon: "🥅", barColor: "#eab308" },
    { key: "leyendaGoles", title: "Leyenda", icon: "👑", barColor: "#eab308", rarity: "legendary" },
    { key: "hatTrick", title: "Hat-trick", icon: "🎩", barColor: "#eab308" },
    { key: "poker", title: "Póker", icon: "🃏", barColor: "#eab308", rarity: "epic" },
    { key: "messi91", title: "Messi 2012", icon: "🐐", barColor: "#a50044", rarity: "legendary" },
    { key: "asistidor", title: "Asistidor", icon: "👟", barColor: "#3b82f6" },
    { key: "asistidorSerial", title: "Asistidor serial", icon: "🤝", barColor: "#3b82f6" },
    { key: "maestroAsist", title: "Maestro del pase", icon: "🧠", barColor: "#3b82f6", rarity: "epic" },
    { key: "tripleAsistencia", title: "Triple asistencia", icon: "🧙‍♂️", barColor: "#3b82f6", rarity: "epic" },
    { key: "debut", title: "Debut", icon: "🆕", barColor: "#d1d5db" },
    { key: "regular", title: "Regular", icon: "📈", barColor: "#d1d5db" },
    { key: "incansable", title: "Incansable", icon: "🏃‍♂️", barColor: "#d1d5db" },
    { key: "veterano", title: "Veterano", icon: "🎖️", barColor: "#d1d5db", rarity: "epic" },
    { key: "primeraVictoria", title: "Primera victoria", icon: "🥇", barColor: "#22c55e" },
    { key: "ganador", title: "Ganador", icon: "✅", barColor: "#22c55e" },
    { key: "campeon", title: "Campeón", icon: "🏅", barColor: "#22c55e", rarity: "epic" },
    { key: "invencible", title: "Invencible", icon: "🛡️", barColor: "#22c55e" },
    { key: "estrella", title: "Estrella", icon: "⭐", barColor: "#fbbf24" },
    { key: "mvp", title: "El Elegido", icon: "🌟", barColor: "#fbbf24", rarity: "epic" },
    { key: "muro", title: "Fortaleza", icon: "⚔️", barColor: "#fbbf24", rarity: "epic" },
    { key: "polivalente", title: "Polivalente", icon: "🧩", barColor: "#fbbf24", rarity: "epic" },
    { key: "completo", title: "Partido completo", icon: "☯️", barColor: "#fbbf24", rarity: "epic" },
    { key: "vallaInvicta", title: "Valla invicta", icon: "🧤", barColor: "#fbbf24", rarity: "epic" },
    { key: "jugadorTotal", title: "Jugador total", icon: "👽", barColor: "#fbbf24", rarity: "legendary" },
    { key: "campeonDelMundoPlm", title: "Campeon del Mundo PLM", icon: "🖐", barColor: "#a855f7", rarity: "epic" },
  ];

  // Detectar desbloqueos y agregar a la cola
  useEffect(() => {
    if (!achievements || Object.keys(achievements).length === 0) {
      previousAchievementsRef.current = {};
      previousItemsCountRef.current = items.length;
      return;
    }

    const currentItemsCount = items.length;
    const previousItemsCount = previousItemsCountRef.current;
    const current = achievements as Record<string, { unlocked?: boolean }>;

    // Solo detectar desbloqueos si el número de items aumentó (se guardó un partido nuevo)
    // O si es la primera carga, solo inicializar sin detectar
    if (previousItemsCount === 0) {
      // Primera carga: solo guardar el estado actual
      previousAchievementsRef.current = { ...current };
      previousItemsCountRef.current = currentItemsCount;
      return;
    }

    // Si el número de items no cambió, no detectar desbloqueos (solo actualizar referencia)
    if (currentItemsCount === previousItemsCount) {
      previousAchievementsRef.current = { ...current };
      return;
    }

    // Solo si el número de items aumentó, detectar desbloqueos
    const previous = previousAchievementsRef.current;
    const newlyUnlocked: Array<{ key: string; title: string; icon: string; barColor: string; rarity?: "epic" | "legendary" }> = [];

    // Buscar TODOS los logros que se acaban de desbloquear
    for (const key in current) {
      const wasUnlocked = previous[key]?.unlocked ?? false;
      const isUnlocked = current[key]?.unlocked ?? false;

      if (!wasUnlocked && isUnlocked) {
        const def = achievementDefs.find((d) => d.key === key);
        if (def) {
          newlyUnlocked.push({ 
            key, 
            title: def.title, 
            icon: def.icon, 
            barColor: def.barColor,
            rarity: def.rarity 
          });
        }
      }
    }

    // Si hay logros nuevos, agregarlos a la cola
    if (newlyUnlocked.length > 0) {
      setAchievementQueue((prev) => [...prev, ...newlyUnlocked]);
    }

    // Actualizar referencias
    previousAchievementsRef.current = { ...current };
    previousItemsCountRef.current = currentItemsCount;
  }, [achievements, items.length]);

  // Procesar la cola de logros desbloqueados
  useEffect(() => {
    if (achievementQueue.length > 0 && !unlockedAchievement) {
      const next = achievementQueue[0];
      setUnlockedAchievement(next);
      setAchievementQueue((prev) => prev.slice(1));

      // Confetti explosion
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval: NodeJS.Timeout = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 250);

      // Auto-cerrar después de 3 segundos y procesar el siguiente
      setTimeout(() => {
        setUnlockedAchievement(null);
      }, 3000);
    }
  }, [achievementQueue, unlockedAchievement]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    
    // Validación de campos requeridos
    if (!date || !date.trim()) {
      showToast("La fecha es requerida", "error");
      return;
    }

    // Validar que la fecha no sea futura
    if (!isValidDate(date)) {
      showToast("No puedes registrar partidos con fecha futura", "error");
      setDate(getTodayDate());
      return;
    }
    
    if (!opponent || !opponent.trim()) {
      showToast("El rival es requerido", "error");
      return;
    }

    // Validar límite de caracteres para el rival
    const opponentLength = opponent.trim().length;
    if (opponentLength > 50) {
      showToast("El nombre del rival no puede exceder 50 caracteres. Tienes " + opponentLength + " caracteres.", "error");
      return;
    }

    // Validaciones numéricas básicas (por seguridad)
    const safeGoals = clampNonNegativeInt(goals);
    const safeAssists = clampNonNegativeInt(assists);
    const safeGoalsScored = clampNonNegativeInt(goalsScored);
    const safeGoalsConceded = clampNonNegativeInt(goalsConceded);
    const derivedResult =
      safeGoalsScored > safeGoalsConceded ? 1 : safeGoalsScored < safeGoalsConceded ? -1 : 0;

    if (safeGoals > 50 || safeAssists > 50) {
      showToast("Goles/Asistencias parecen demasiado altos (máx 50).", "error");
      return;
    }
    if (safeGoalsScored > 99 || safeGoalsConceded > 99) {
      showToast("El marcador parece demasiado alto (máx 99).", "error");
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
        date: dateToISOString(date),
        opponent: opponent.trim(),
        format,
        goalsScored: safeGoalsScored,
        goalsConceded: safeGoalsConceded,
        goals: safeGoals,
        assists: safeAssists,
        result: derivedResult,
        is_mvp: isMvp,
        notes: notes.trim() ? notes.trim() : null,
      });

      // reset form
      setDate(getTodayDate());
      setOpponent("");
      setFormat(5);
      setGoalsScored(0);
      setGoalsConceded(0);
      setGoals(0);
      setAssists(0);
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
      
      // Usar la función helper para convertir correctamente la fecha ISO a YYYY-MM-DD
      setEditDate(isoToDateString(m.date));

      setEditOpponent(m.opponent ?? "");
      setEditFormat(m.format ?? "");
      setEditGoalsScored(clampNonNegativeInt((m as any).goalsScored ?? (m as any).goals_scored ?? 0));
      setEditGoalsConceded(clampNonNegativeInt((m as any).goalsConceded ?? (m as any).goals_conceded ?? 0));
      setEditGoals(clampNonNegativeInt(m.goals ?? 0));
      setEditAssists(clampNonNegativeInt(m.assists ?? 0));
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
    setEditGoalsScored(0);
    setEditGoalsConceded(0);
    setEditGoals(0);
    setEditAssists(0);
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

    // Validar que la fecha no sea futura
    if (!isValidDate(editDate)) {
      showToast("No puedes registrar partidos con fecha futura", "error");
      return;
    }
    
    if (!editOpponent || !editOpponent.trim()) {
      showToast("El rival es requerido", "error");
      return;
    }

    // Validar límite de caracteres para el rival
    const editOpponentLength = editOpponent.trim().length;
    if (editOpponentLength > 50) {
      showToast("El nombre del rival no puede exceder 50 caracteres. Tienes " + editOpponentLength + " caracteres.", "error");
      return;
    }
    
    if (editFormat === "" || editFormat === null || editFormat === undefined) {
      showToast("El formato es requerido", "error");
      return;
    }

    // Validaciones numéricas básicas (por seguridad)
    const safeEditGoals = clampNonNegativeInt(editGoals);
    const safeEditAssists = clampNonNegativeInt(editAssists);
    const safeEditGoalsScored = clampNonNegativeInt(editGoalsScored);
    const safeEditGoalsConceded = clampNonNegativeInt(editGoalsConceded);
    const derivedEditResult =
      safeEditGoalsScored > safeEditGoalsConceded
        ? 1
        : safeEditGoalsScored < safeEditGoalsConceded
          ? -1
          : 0;

    if (safeEditGoals > 50 || safeEditAssists > 50) {
      showToast("Goles/Asistencias parecen demasiado altos (máx 50).", "error");
      return;
    }
    if (safeEditGoalsScored > 99 || safeEditGoalsConceded > 99) {
      showToast("El marcador parece demasiado alto (máx 99).", "error");
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
        date: dateToISOString(editDate),
        opponent: editOpponent.trim(),
        format: Number(editFormat),
        goalsScored: safeEditGoalsScored,
        goalsConceded: safeEditGoalsConceded,
        goals: safeEditGoals,
        assists: safeEditAssists,
        result: derivedEditResult,
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
    // Normalización de GOLES: (Promedio / 2) * 100, máximo 100 si >= 2
    const goalsNormalized = statsData.avgGoals >= 2
      ? 100 
      : (statsData.avgGoals / 2) * 100;

    // Normalización de ASIST: (Promedio / 2) * 100, máximo 100 si >= 2
    const assistsNormalized = statsData.avgAssists >= 2
      ? 100 
      : (statsData.avgAssists / 2) * 100;

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

  const assistsLineChartData = useMemo(() => {
    // Invertir el orden: más antiguos primero, más reciente al final
    const reversedItems = [...filteredItems].reverse();
    return {
      labels: reversedItems.map((_, i) => `P${i + 1}`),
      datasets: [
        {
          data: reversedItems.map((m) => m.assists ?? 0),
          borderColor: '#3b82f6',
          fill: true,
          backgroundColor: 'rgba(59,130,246,0.12)',
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

  const mainTabs = (
    <div className="overflow-x-auto no-scrollbar -mx-2 px-2 sm:mx-0 sm:px-0">
      {/* Asegura centrado cuando sobra ancho (especial iPhone) */}
      <div className="min-w-full sm:min-w-0 flex justify-center">
        <div
          className="w-max flex items-center gap-1 rounded-full p-1"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
        <button
          onClick={() => setTab("inicio")}
          className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest flex items-center gap-1.5 sm:gap-2 whitespace-nowrap transition-colors ${
            tab === "inicio" ? "bg-green-500 text-black" : "text-gray-300 hover:bg-white/10"
          }`}
          type="button"
        >
          <i className="fas fa-home text-[11px] sm:text-[12px]"></i>
          Inicio
        </button>

        <button
          onClick={() => setTab("stats")}
          className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest flex items-center gap-1.5 sm:gap-2 whitespace-nowrap transition-colors ${
            tab === "stats" ? "bg-green-500 text-black" : "text-gray-300 hover:bg-white/10"
          }`}
          type="button"
        >
          <i className="fas fa-chart-line text-[11px] sm:text-[12px]"></i>
          Stats
        </button>

        <button
          onClick={() => setTab("logros")}
          className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest flex items-center gap-1.5 sm:gap-2 whitespace-nowrap transition-colors ${
            tab === "logros" ? "bg-green-500 text-black" : "text-gray-300 hover:bg-white/10"
          }`}
          type="button"
        >
          <i className="fas fa-trophy text-[11px] sm:text-[12px]"></i>
          Logros
        </button>

        <button
          onClick={() => setTab("historial")}
          className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest flex items-center gap-1.5 sm:gap-2 whitespace-nowrap transition-colors ${
            tab === "historial" ? "bg-green-500 text-black" : "text-gray-300 hover:bg-white/10"
          }`}
          type="button"
        >
          <i className="fas fa-history text-[11px] sm:text-[12px]"></i>
          Historial
        </button>
        </div>
      </div>
    </div>
  );

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
        <div className="container mx-auto">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black italic uppercase tracking-tighter shrink-0">
              Fut<span style={{ color: "#22c55e" }}>Stats</span>
            </h1>

            {/* Tabs inline en desktop */}
            <div className="hidden sm:block flex-1">{mainTabs}</div>

            <div className="flex items-center gap-3 relative shrink-0 ml-auto">
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
                  className="fixed inset-0"
                  style={{ zIndex: 60 }}
                  onClick={() => {
                    if (!isLoggingOut) {
                      setUserMenuOpen(false);
                    }
                  }}
                  onTouchStart={(e) => {
                    if (!isLoggingOut) {
                      e.stopPropagation();
                    }
                  }}
                />
                {/* Menu */}
                <div
                  className="fixed right-4 top-16 min-w-[200px] rounded-2xl"
                  style={{
                    background: "rgba(10, 25, 10, 0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                    zIndex: 70,
                    pointerEvents: 'auto',
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-white/10">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-1">
                      Perfil
                    </p>
                    <p className="text-sm font-bold text-white">{me.email}</p>
                  </div>
                  <button
                    onClick={async (e) => {
                      handleLogout(e);
                    }}
                    onTouchEnd={async (e) => {
                      // Para Safari, usar onTouchEnd en lugar de onClick
                      e.preventDefault();
                      e.stopPropagation();
                      handleLogout(e);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                    }}
                    className="w-full p-4 text-left text-sm font-bold text-red-400 hover:bg-white/5 active:bg-white/10 transition-colors rounded-b-2xl cursor-pointer"
                    type="button"
                    disabled={isLoggingOut}
                    style={{ 
                      pointerEvents: 'auto',
                      WebkitTapHighlightColor: 'transparent',
                      WebkitTouchCallout: 'none',
                      touchAction: 'manipulation',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      zIndex: 100,
                      position: 'relative',
                    }}
                  >
                    {isLoggingOut ? "Cerrando..." : "Cerrar Sesión"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

          {/* Tabs abajo en mobile (ocultar con teclado abierto) */}
          {!isInputFocused && <div className="sm:hidden mt-3">{mainTabs}</div>}
        </div>
      </nav>

      <main
        className="container mx-auto p-4 max-w-xl"
        style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}
      >
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
                  onChange={(e) => {
                    const newDate = e.target.value;
                    if (isValidDate(newDate)) {
                      setDate(newDate);
                    } else {
                      showToast("No puedes seleccionar una fecha futura", "error");
                      // Resetear a la fecha de hoy si intenta poner una fecha futura
                      setDate(getTodayDate());
                    }
                  }}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
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

                <div>
                  <input
                    type="text"
                    placeholder="Rival"
                    value={opponent}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 50) {
                        setOpponent(value);
                      } else {
                        showToast("El nombre del rival no puede exceder 50 caracteres", "info");
                      }
                    }}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    maxLength={50}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-base outline-none focus:border-green-500"
                    style={{ fontSize: '16px' }}
                    required
                  />
                  <p 
                    className="text-[9px] mt-1 text-right font-bold"
                    style={{ 
                      color: opponent.length >= 50 ? "#ef4444" : opponent.length >= 45 ? "#fbbf24" : "#6b7280",
                      transition: "color 0.2s"
                    }}
                  >
                    {opponent.length} / 50
                    {opponent.length >= 50 && (
                      <span className="ml-2 text-[8px]">⚠️ Límite alcanzado</span>
                    )}
                  </p>
                </div>

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
                  <button
                    type="button"
                    onClick={(e) => {
                      setIsMvp(!isMvp);
                      e.currentTarget.blur();
                    }}
                    className={`flex items-center justify-center bg-white/5 border rounded-xl p-3 gap-2 transition-colors ${
                      isMvp ? "border-yellow-400" : "border-white/10"
                    } outline-none`}
                    title="Opcional"
                  >
                    <i
                      className={`fas fa-star ${isMvp ? "text-yellow-400" : "text-gray-500"}`}
                      style={{ fontSize: 18 }}
                    ></i>
                    <span className="text-[10px] font-black text-gray-400 uppercase">
                      ¿Fuiste el MVP?
                    </span>
                  </button>
                </div>

                {/* Marcador (Match Score) */}
                <div
                  className="p-4 rounded-2xl"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-center mb-3 text-gray-400">
                    Marcador
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-center">
                      <p className="text-[9px] text-gray-500 font-bold uppercase mb-2">Tu equipo</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            setGoalsScored((v) => Math.max(0, v - 1));
                            e.currentTarget.blur();
                          }}
                          className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl font-black text-base sm:text-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                          –
                        </button>
                        <span className="text-3xl font-black w-10 text-center" style={{ color: "#22c55e" }}>
                          {goalsScored}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            setGoalsScored((v) => Math.min(99, v + 1));
                            e.currentTarget.blur();
                          }}
                          className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl font-black text-base sm:text-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>


                    <span className=" relative top-[10px] text-2xl font-black text-gray-500 leading-none">-</span>

                    <div className="text-center">
                      <p className="text-[9px] text-gray-500 font-bold uppercase mb-2">Rival</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            setGoalsConceded((v) => Math.max(0, v - 1));
                            e.currentTarget.blur();
                          }}
                          className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl font-black text-base sm:text-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                          –
                        </button>
                        <span className="text-3xl font-black w-10 text-center">{goalsConceded}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            setGoalsConceded((v) => Math.min(99, v + 1));
                            e.currentTarget.blur();
                          }}
                          className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl font-black text-base sm:text-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rendimiento personal (Goles / Asistencias con +/-) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <p className="text-[10px] font-black uppercase text-gray-400 mb-2 text-center">
                      Goles
                    </p>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={(e) => {
                          setGoals((v) => Math.max(0, v - 1));
                          e.currentTarget.blur();
                        }}
                        className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl font-black text-base sm:text-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        –
                      </button>
                      <span className="text-2xl font-black w-10 text-center" style={{ color: "#22c55e" }}>
                        {goals}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          setGoals((v) => Math.min(50, v + 1));
                          e.currentTarget.blur();
                        }}
                        className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl font-black text-base sm:text-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <p className="text-[10px] font-black uppercase text-gray-400 mb-2 text-center">
                      Asistencias
                    </p>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={(e) => {
                          setAssists((v) => Math.max(0, v - 1));
                          e.currentTarget.blur();
                        }}
                        className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl font-black text-base sm:text-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        –
                      </button>
                      <span className="text-2xl font-black w-10 text-center" style={{ color: "#3b82f6" }}>
                        {assists}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          setAssists((v) => Math.min(50, v + 1));
                          e.currentTarget.blur();
                        }}
                        className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl font-black text-base sm:text-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <textarea
                    placeholder='Opcional: ¿Cómo jugaste? ¿Algo destacado?'
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
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
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
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-base outline-none resize-none"
                    style={{ 
                      minHeight: 90, 
                      maxHeight: 90,
                      fontSize: '16px'
                    }}
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

            {/* Enviar recomendaciones (Inicio) */}
            <div
              className="p-5 rounded-3xl mb-8"
              style={{
                background: "rgba(10, 25, 10, 0.75)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <button
                type="button"
                className="w-full flex items-center justify-between gap-3"
                onClick={() => setFeedbackOpen((v) => !v)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base" aria-hidden="true">📋</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">Sugerencias</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  {feedbackOpen ? "Ocultar" : "Mostrar"}
                </span>
              </button>

              {feedbackOpen && (
                <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                  <p className="text-[11px] text-gray-300 leading-relaxed">
                   Ayudanos a mejorar. Mandanos tu <strong className="text-gray-200">idea</strong> para nuevas funciones, estadísticas o reportá un error.  
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-[10px] font-black uppercase text-gray-400">
                      Tipo
                      <select
                        value={feedbackKind}
                        onChange={(e) => setFeedbackKind(e.target.value as FeedbackKind)}
                        className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-gray-200 outline-none"
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                      >
                        <option value="ui">Error de Interfaz</option>
                        <option value="stats">Nuevas Estadísticas</option>
                        <option value="viz">Gráficos y Visualización</option>
                        <option value="achievement">Sugerencia de Logro</option>
                      </select>
                    </label>
                    <div className="hidden sm:block" />
                  </div>

                  <div>
                    <textarea
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(limitChars(e.target.value, 500))}
                      placeholder="Ej: Falta una sección..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-base outline-none resize-none focus:border-green-500 placeholder:text-gray-500"
                      style={{ minHeight: 110, maxHeight: 140, fontSize: "16px" }}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
                    />
                    <p
                      className="text-[9px] mt-1 text-right font-bold"
                      style={{
                        color:
                          countChars(feedbackMessage) >= 500
                            ? "#ef4444"
                            : countChars(feedbackMessage) >= 450
                              ? "#fbbf24"
                              : "#6b7280",
                        transition: "color 0.2s",
                      }}
                    >
                      {countChars(feedbackMessage)} / 500
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={feedbackSending || !feedbackMessage.trim()}
                    onClick={async () => {
                      try {
                        setFeedbackSending(true);
                        await feedbackApi.create({
                          kind: feedbackKind,
                          message: feedbackMessage,
                          page: "inicio",
                        });
                        setFeedbackMessage("");
                        showToast("¡Gracias! Recomendación enviada.", "success");
                      } catch (e: any) {
                        showToast(translateError(e?.message ?? "No se pudo enviar la recomendación"), "error");
                      } finally {
                        setFeedbackSending(false);
                      }
                    }}
                    className="w-full text-black font-black py-3 rounded-xl uppercase text-xs tracking-widest disabled:opacity-50"
                    style={{ background: "#22c55e" }}
                  >
                    {feedbackSending ? "Enviando..." : "Enviar recomendación"}
                  </button>
                </div>
              )}
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
                        <strong className="text-gray-300">Goles y Asistencias:</strong> Calculamos tu promedio por partido. El 100% se alcanza al promediar 2 o más en cada categoría.
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
                    Asistencias por Partido
                  </h4>
                  <div style={{ height: 200, width: "100%" }}>
                    <Line data={assistsLineChartData} options={chartOptions} />
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
            {(() => {
              const list = Object.values(achievements);
              const total = list.length;
              const unlocked = list.filter((a) => (a as { unlocked?: boolean })?.unlocked).length;
              const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0;

              return (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="font-black italic text-xl uppercase">Achievements</h2>
                    <div className="flex items-center gap-2 text-sm font-black">
                      <span style={{ color: "#22c55e" }}>🏆</span>
                      <span className="text-white">{unlocked}</span>
                      <span style={{ color: "rgba(156, 163, 175, 0.6)" }}>/ {total}</span>
                    </div>
                  </div>

                  <div
                    className="p-5 rounded-3xl"
                    style={{
                      background: "rgba(10, 25, 10, 0.9)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span style={{ color: "rgba(156, 163, 175, 0.6)" }} className="font-bold">
                        Progreso
                      </span>
                      <span className="text-white font-black">{pct}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${(unlocked / Math.max(1, total)) * 100}%`,
                          background: "#22c55e",
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>
                  </div>
                </>
              );
            })()}
            {(() => {
              type AchievementCategoryKey =
                | "goles"
                | "asistencias"
                | "partidos"
                | "victorias"
                | "speciales";

              type AchievementState = {
                unlocked?: boolean;
                current?: number;
                target?: number;
                year?: number;
                unlockedAt?: string;
              };

              type AchievementDef = {
                key: string;
                category: AchievementCategoryKey;
                hidden?: boolean;
                rarity?: "epic" | "legendary";
                icon: string;
                title: string;
                description: string | ((a: AchievementState) => string);
                barColor?: string;
                valueText?: (a: AchievementState) => string;
              };

              const categories: Array<{ key: AchievementCategoryKey; label: string; icon: string }> = [
                { key: "goles", label: "Goles", icon: "⚽" },
                { key: "asistencias", label: "Asistencias", icon: "🤝" },
                { key: "partidos", label: "Partidos", icon: "📅" },
                { key: "victorias", label: "Victorias", icon: "🏆" },
                { key: "speciales", label: "Speciales", icon: "✨" },
              ];

              const defs: AchievementDef[] = [
                // GOLES
                {
                  key: "goleador",
                  category: "goles",
                  icon: "⚽",
                  title: "Goleador",
                  description: "10 goles totales.",
                  barColor: "#eab308",
                },
                {
                  key: "rompeRedes",
                  category: "goles",
                  icon: "🥅",
                  title: "Rompe-redes",
                  description: "50 goles totales.",
                  barColor: "#eab308",
                },
                {
                  key: "leyendaGoles",
                  category: "goles",
                  icon: "👑",
                  title: "Leyenda",
                  description: "100 goles totales.",
                  barColor: "#eab308",
                  rarity: "legendary",
                },
                {
                  key: "hatTrick",
                  category: "goles",
                  icon: "🎩",
                  title: "Hat-trick",
                  description: "3 goles en un partido.",
                  barColor: "#eab308",
                  valueText: (a) => `Mejor marca: ${a?.current ?? 0} goles`,
                },
                {
                  key: "poker",
                  category: "goles",
                  icon: "🃏",
                  title: "Póker",
                  description: "4 goles en un partido.",
                  barColor: "#eab308",
                  rarity: "epic",
                  valueText: (a) => `Mejor marca: ${a?.current ?? 0} goles`,
                },
                {
                  key: "messi91",
                  category: "goles",
                  icon: "🐐",
                  title: "Messi 2012",
                  description: (a) => `91 goles en el año ${a?.year ?? new Date().getFullYear()}.`,
                  barColor: "#a50044",
                  rarity: "legendary",
                  valueText: (a) =>
                    `Temporada ${a?.year ?? new Date().getFullYear()}: ${a?.current ?? 0} / ${a?.target ?? 91}`,
                },
                // ASISTENCIAS
                {
                  key: "asistidor",
                  category: "asistencias",
                  icon: "👟",
                  title: "Asistidor",
                  description: "10 asistencias totales.",
                  barColor: "#3b82f6",
                },
                {
                  key: "asistidorSerial",
                  category: "asistencias",
                  icon: "🤝",
                  title: "Asistidor serial",
                  description: "25 asistencias totales.",
                  barColor: "#3b82f6",
                },
                {
                  key: "maestroAsist",
                  category: "asistencias",
                  icon: "🧠",
                  title: "Maestro del pase",
                  description: "50 asistencias totales.",
                  barColor: "#3b82f6",
                  rarity: "epic",
                },
                {
                  key: "tripleAsistencia",
                  category: "asistencias",
                  icon: "🧙‍♂️",
                  title: "Triple asistencia",
                  description: "3 asistencias en un partido.",
                  barColor: "#3b82f6",
                  rarity: "epic",
                  valueText: (a) => `Mejor marca: ${a?.current ?? 0} asistencias`,
                },

                // PARTIDOS
                {
                  key: "debut",
                  category: "partidos",
                  icon: "🆕",
                  title: "Debut",
                  description: "Registra tu primer partido.",
                  barColor: "#d1d5db",
                },
                {
                  key: "regular",
                  category: "partidos",
                  icon: "📈",
                  title: "Regular",
                  description: "10 partidos jugados.",
                  barColor: "#d1d5db",
                },
                {
                  key: "incansable",
                  category: "partidos",
                  icon: "🏃‍♂️",
                  title: "Incansable",
                  description: "30 partidos jugados.",
                  barColor: "#d1d5db",
                },
                {
                  key: "veterano",
                  category: "partidos",
                  icon: "🎖️",
                  title: "Veterano",
                  description: "100 partidos jugados.",
                  barColor: "#d1d5db",
                  rarity: "epic",
                },

                // VICTORIAS
                {
                  key: "primeraVictoria",
                  category: "victorias",
                  icon: "🥇",
                  title: "Primera victoria",
                  description: "Gana tu primer partido.",
                  barColor: "#22c55e",
                },
                {
                  key: "ganador",
                  category: "victorias",
                  icon: "✅",
                  title: "Ganador",
                  description: "10 victorias totales.",
                  barColor: "#22c55e",
                },
                {
                  key: "campeon",
                  category: "victorias",
                  icon: "🏅",
                  title: "Campeón",
                  description: "25 victorias totales.",
                  barColor: "#22c55e",
                  rarity: "epic",
                },
                {
                  key: "invencible",
                  category: "victorias",
                  icon: "🛡️",
                  title: "Invencible",
                  description: "5 victorias seguidas.",
                  barColor: "#22c55e",
                  valueText: (a) => `Mejor racha: ${a?.current ?? 0}`,
                },
                

                // SPECIALES
                {
                  key: "estrella",
                  category: "speciales",
                  icon: "⭐",
                  title: "Estrella",
                  description: "Gana 5 MVPs.",
                  barColor: "#fbbf24",
                },
                {
                  key: "mvp",
                  category: "speciales",
                  icon: "🌟",
                  title: "El Elegido",
                  description: "Gana 10 MVPs.",
                  barColor: "#fbbf24",
                  rarity: "epic",
                },
                {
                  key: "muro",
                  category: "speciales",
                  hidden: true,
                  icon: "⚔️",
                  title: "Fortaleza",
                  description: "10 partidos sin perder.",
                  barColor: "#fbbf24",
                  valueText: (a) => `Mejor racha: ${a?.current ?? 0}`,
                  rarity: "epic",
                },
                {
                  key: "polivalente",
                  category: "speciales",
                  hidden: true,
                  icon: "🧩",
                  title: "Polivalente",
                  description: "Juega en F5, F7, F8 y F11.",
                  barColor: "#fbbf24",
                  valueText: (a) => `Formatos jugados: ${a?.current ?? 0} / ${a?.target ?? 4}`,
                  rarity: "epic",
                },
                {
                  key: "completo",
                  category: "speciales",
                  hidden: true,
                  icon: "☯️",
                  title: "Partido completo",
                  description: "Marca y asiste en el mismo partido.",
                  barColor: "#fbbf24",
                  valueText: (a) => `Partidos completos: ${a?.current ?? 0}`,
                  rarity: "epic",
                },
                {
                  key: "vallaInvicta",
                  category: "speciales",
                  icon: "🧤",
                  title: "Valla invicta",
                  description: "5 partidos sin recibir goles.",
                  barColor: "#fbbf24",
                },
                {
                  key: "jugadorTotal",
                  category: "speciales",
                  hidden: true,
                  icon: "👽",
                  title: "Jugador total",
                  description: "100 contribuciones (goles + asistencias).",
                  barColor: "#fbbf24",
                  rarity: "legendary",
                },
                {
                  key: "campeonDelMundoPlm",
                  category: "speciales",
                  icon: "🖐",
                  title: "Campeon del Mundo PLM",
                  description: "7 victorias seguidas.",
                  barColor: "#a855f7",
                  valueText: (a) => `Mejor racha: ${a?.current ?? 0}`,
                  rarity: "epic",
                },
              ];

              const hexToRgba = (hex: string, alpha: number) => {
                if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return `rgba(255,255,255,${alpha})`;
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
              };

              const mixHex = (a: string, b: string, t: number) => {
                const clamp = (n: number) => Math.max(0, Math.min(1, n));
                const tt = clamp(t);
                if (!/^#[0-9a-fA-F]{6}$/.test(a) || !/^#[0-9a-fA-F]{6}$/.test(b)) return a;
                const ar = parseInt(a.slice(1, 3), 16);
                const ag = parseInt(a.slice(3, 5), 16);
                const ab = parseInt(a.slice(5, 7), 16);
                const br = parseInt(b.slice(1, 3), 16);
                const bg = parseInt(b.slice(3, 5), 16);
                const bb = parseInt(b.slice(5, 7), 16);
                const rr = Math.round(ar + (br - ar) * tt);
                const rg = Math.round(ag + (bg - ag) * tt);
                const rb = Math.round(ab + (bb - ab) * tt);
                return `#${rr.toString(16).padStart(2, "0")}${rg.toString(16).padStart(2, "0")}${rb
                  .toString(16)
                  .padStart(2, "0")}`;
              };

              const categoryBarColor: Record<AchievementCategoryKey, string> = {
                goles: "#eab308",
                asistencias: "#3b82f6",
                partidos: "#d1d5db",
                victorias: "#22c55e",
                speciales: "#fbbf24",
              };

              const cardStyleFor = (opts: { isUnlocked: boolean; rarity?: AchievementDef["rarity"]; accentHex: string }) => {
                const base = "rgba(10, 25, 10, 0.9)";
                const lockedBorder = "rgba(255,255,255,0.08)";
                const unlockedBorder = "#fbbf24";
                const accent = opts.accentHex;
                const isEpic = opts.rarity === "epic" || opts.rarity === "legendary";

                return {
                  background: isEpic
                    ? `radial-gradient(circle at 50% 35%, ${hexToRgba(accent, 0.22)}, ${base} 70%)`
                    : base,
                  border: opts.isUnlocked ? `1px solid ${unlockedBorder}` : `1px solid ${lockedBorder}`,
                  boxShadow: opts.isUnlocked ? `0 0 18px ${hexToRgba(unlockedBorder, 0.18)}` : "none",
                };
              };

              const safeNum = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
              const achievementsByKey = achievements as unknown as Record<string, AchievementState>;

              return (
                <div className="space-y-6">
                  {categories.map((cat) => {
                    const catDefs = defs.filter((d) => d.category === cat.key);
                    const visibleDefs = catDefs.filter((d) => !d.hidden && !!achievementsByKey[d.key]);
                    const catUnlocked = visibleDefs.filter((d) => achievementsByKey[d.key]?.unlocked).length;

                    return (
                      <div key={cat.key} className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{cat.icon}</span>
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                              {cat.label}
                            </h3>
                          </div>
                          <span className="text-[10px] font-bold text-gray-500">
                            {catUnlocked}/{visibleDefs.length}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {visibleDefs.map((def) => {
                            const a = achievementsByKey[def.key];
                            if (!a) return null;

                            const isUnlocked = !!a.unlocked;
                            const current = safeNum(a.current);
                            const target = safeNum(a.target);
                            const pct = target > 0 ? Math.min((current / target) * 100, 100) : isUnlocked ? 100 : 0;
                            const displayCurrent = target > 0 ? Math.min(current, target) : current;
                            const isComplete = target > 0 ? current >= target : isUnlocked;
                            const desc =
                              typeof def.description === "function" ? def.description(a) : def.description;
                            const valueText =
                              def.valueText?.(a) ??
                              (target > 0 ? `${displayCurrent} / ${target}` : isUnlocked ? "Desbloqueado" : "Bloqueado");

                            const baseColor = def.barColor ?? categoryBarColor[def.category];
                            const isMessi = def.key === "messi91";
                            const isCampeonMundo = def.key === "campeonDelMundoPlm";
                            // Para Messi: gradiente azul-rojo del Barcelona
                            // Para Campeon del Mundo PLM: mantener color violeta
                            const barColor = isMessi
                              ? mixHex("#004D98", "#a50044", pct / 100)
                              : baseColor;
                            const tooltip =
                              isComplete && a.unlockedAt
                                ? `Desbloqueado el ${fmtDate(a.unlockedAt)}`
                                : isComplete
                                  ? "Desbloqueado"
                                  : undefined;

                            // Estilo especial para Messi (Barcelona: azul y rojo)
                            // Estilo especial para Campeon del Mundo PLM (violeta)
                            const baseBg = "rgba(10, 25, 10, 0.9)";
                            const messiBackground = isMessi && isUnlocked
                              ? `linear-gradient(135deg, rgba(0, 77, 152, 0.25) 0%, rgba(165, 0, 68, 0.25) 50%, rgba(0, 77, 152, 0.25) 100%), radial-gradient(circle at 50% 35%, rgba(165, 0, 68, 0.2), ${baseBg} 70%)`
                              : null;
                            
                            const campeonMundoBackground = isCampeonMundo && isUnlocked
                              ? `radial-gradient(circle at 50% 35%, ${hexToRgba("#a855f7", 0.3)}, ${baseBg} 70%)`
                              : null;
                            
                            const messiBorder = isMessi && isUnlocked ? "#004D98" : barColor;
                            const messiShadow = isMessi && isUnlocked
                              ? `0 0 30px ${hexToRgba("#004D98", 0.4)}, 0 0 60px ${hexToRgba("#a50044", 0.3)}`
                              : undefined;
                            
                            const campeonMundoBorder = isCampeonMundo && isUnlocked ? "#a855f7" : barColor;
                            const campeonMundoShadow = isCampeonMundo && isUnlocked
                              ? `0 0 30px ${hexToRgba("#a855f7", 0.5)}, 0 0 60px ${hexToRgba("#a855f7", 0.4)}`
                              : undefined;
                            
                            const cardStyle = isMessi && isUnlocked && messiBackground
                              ? {
                                  ...cardStyleFor({ isUnlocked, rarity: def.rarity, accentHex: barColor }),
                                  background: messiBackground,
                                  border: `2px solid ${messiBorder}`,
                                  boxShadow: messiShadow,
                                }
                              : isCampeonMundo && isUnlocked && campeonMundoBackground
                                ? {
                                    ...cardStyleFor({ isUnlocked, rarity: def.rarity, accentHex: barColor }),
                                    background: campeonMundoBackground,
                                    border: `2px solid ${campeonMundoBorder}`,
                                    boxShadow: campeonMundoShadow,
                                  }
                                : cardStyleFor({ isUnlocked, rarity: def.rarity, accentHex: barColor });

                            return (
                              <div
                                key={String(def.key)}
                                className={`p-4 rounded-3xl text-center relative transition-transform duration-200 ${
                                  isUnlocked ? "hover:scale-[1.02]" : "opacity-80"
                                }`}
                                style={cardStyle}
                                title={tooltip}
                              >
                                {isComplete && (
                                  <div className="absolute right-3 top-3 text-[10px] font-black" style={{ color: isMessi ? "#a50044" : isCampeonMundo ? "#a855f7" : barColor }}>
                                    ✓
                                  </div>
                                )}

                                <div
                                  className="mx-auto mb-2 rounded-2xl flex items-center justify-center"
                                  style={{
                                    width: def.rarity ? 56 : 48,
                                    height: def.rarity ? 56 : 48,
                                    fontSize: def.rarity ? 30 : 28,
                                    background: "rgba(255,255,255,0.05)",
                                    border: "1px solid rgba(255,255,255,0.10)",
                                    filter: isUnlocked 
                                      ? (isMessi 
                                          ? "drop-shadow(0 0 8px rgba(165, 0, 68, 0.6)) drop-shadow(0 0 12px rgba(0, 77, 152, 0.4))" 
                                          : isCampeonMundo
                                            ? "drop-shadow(0 0 8px rgba(168, 85, 247, 0.6)) drop-shadow(0 0 12px rgba(168, 85, 247, 0.4))"
                                            : "none") 
                                      : "grayscale(1)",
                                    opacity: isUnlocked ? 1 : 0.55,
                                  }}
                                >
                                  {def.icon}
                                </div>
                                <h4 
                                  className="font-black text-[10px] uppercase"
                                  style={isMessi && isUnlocked ? {
                                    color: "#a50044",
                                    textShadow: `0 0 8px ${hexToRgba("#a50044", 0.7)}, 0 0 16px ${hexToRgba("#004D98", 0.5)}`,
                                  } : isCampeonMundo && isUnlocked ? {
                                    color: "#a855f7",
                                    textShadow: `0 0 8px ${hexToRgba("#a855f7", 0.7)}, 0 0 16px ${hexToRgba("#a855f7", 0.5)}`,
                                  } : {}}
                                >
                                  {def.title}
                                </h4>
                                <p className="text-[8px] text-gray-500 mb-3">{desc}</p>

                                {target > 0 && (
                                  <>
                                    <div className="bg-white/5 h-2 rounded-full overflow-hidden">
                                      <div
                                        className="h-full"
                                        style={{
                                          width: `${pct}%`,
                                          background: isMessi && isComplete
                                            ? `linear-gradient(90deg, #004D98 0%, #a50044 50%, #004D98 100%)`
                                            : isCampeonMundo && isComplete
                                              ? "#a855f7"
                                              : barColor,
                                          boxShadow: isComplete ? `0 0 10px ${hexToRgba(barColor, 0.65)}` : "none",
                                          filter: isComplete ? "saturate(1.15) brightness(1.08)" : "none",
                                        }}
                                      />
                                    </div>
                                    <p className="text-[8px] mt-1 font-bold">{valueText}</p>
                                  </>
                                )}

                                {target <= 0 && (
                                  <p className="text-[8px] mt-1 font-bold" style={{ color: isUnlocked ? "#22c55e" : "#9ca3af" }}>
                                    {valueText}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {(() => {
                    const hiddenDefs = defs.filter((d) => d.hidden && !!achievementsByKey[d.key]);
                    if (hiddenDefs.length === 0) return null;

                    const remaining = hiddenDefs.filter((d) => !achievementsByKey[d.key]?.unlocked).length;

                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            LOGROS OCULTOS
                          </h3>
                        </div>

                        <div
                          className="p-5 rounded-3xl flex items-center gap-4"
                          style={{
                            background: "rgba(10, 25, 10, 0.9)",
                            border: "1px solid rgba(255,255,255,0.1)",
                          }}
                        >
                          <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black"
                            style={{
                              background: "rgba(255,255,255,0.06)",
                              border: "1px solid rgba(255,255,255,0.1)",
                            }}
                          >
                            ?
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-black">Quedan {remaining} logros ocultos</p>
                            <p className="text-[10px] text-gray-500">
                              Los detalles de cada logro se revelarán una vez desbloqueado
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {hiddenDefs.map((def) => {
                            const a = achievementsByKey[def.key];
                            if (!a) return null;

                            const isUnlocked = !!a.unlocked;

                            if (!isUnlocked) {
                              return (
                                <div
                                  key={String(def.key)}
                                  className="p-4 rounded-3xl text-center relative opacity-70"
                                  style={cardStyleFor({
                                    isUnlocked: false,
                                    rarity: def.rarity,
                                    accentHex: def.barColor ?? categoryBarColor[def.category],
                                  })}
                                >
                                  <div
                                    className="mx-auto mb-2 rounded-2xl flex items-center justify-center"
                                    style={{
                                      width: 48,
                                      height: 48,
                                      fontSize: 28,
                                      background: "rgba(255,255,255,0.05)",
                                      border: "1px solid rgba(255,255,255,0.10)",
                                      filter: "grayscale(1)",
                                      opacity: 0.55,
                                    }}
                                  >
                                    ❓
                                  </div>
                                  <h4 className="font-black text-[10px] uppercase">Logro oculto</h4>
                                  <p className="text-[8px] text-gray-500 mb-1">
                                    Se revelará al desbloquearse.
                                  </p>
                                </div>
                              );
                            }

                            // Desbloqueado: mostrar detalles normales
                            const current = safeNum(a.current);
                            const target = safeNum(a.target);
                            const pct = target > 0 ? Math.min((current / target) * 100, 100) : 100;
                            const displayCurrent = target > 0 ? Math.min(current, target) : current;
                            const isComplete = target > 0 ? current >= target : true;
                            const desc =
                              typeof def.description === "function" ? def.description(a) : def.description;
                            const valueText =
                              def.valueText?.(a) ??
                              (target > 0 ? `${displayCurrent} / ${target}` : "Desbloqueado");

                            const baseColor = def.barColor ?? categoryBarColor[def.category];
                            const isMessiHidden = def.key === "messi91";
                            const isCampeonMundoHidden = def.key === "campeonDelMundoPlm";
                            // Para Messi: gradiente azul-rojo del Barcelona
                            const barColor = isMessiHidden
                              ? mixHex("#004D98", "#a50044", pct / 100)
                              : baseColor;
                            const tooltip = a.unlockedAt ? `Desbloqueado el ${fmtDate(a.unlockedAt)}` : "Desbloqueado";

                            // Estilo especial para Messi en logros ocultos
                            // Estilo especial para Campeon del Mundo PLM en logros ocultos
                            const baseBgHidden = "rgba(10, 25, 10, 0.9)";
                            const messiBackgroundHidden = isMessiHidden
                              ? `linear-gradient(135deg, rgba(0, 77, 152, 0.25) 0%, rgba(165, 0, 68, 0.25) 50%, rgba(0, 77, 152, 0.25) 100%), radial-gradient(circle at 50% 35%, rgba(165, 0, 68, 0.2), ${baseBgHidden} 70%)`
                              : null;
                            
                            const campeonMundoBackgroundHidden = isCampeonMundoHidden
                              ? `radial-gradient(circle at 50% 35%, ${hexToRgba("#a855f7", 0.3)}, ${baseBgHidden} 70%)`
                              : null;
                            
                            const messiBorderHidden = isMessiHidden ? "#004D98" : barColor;
                            const messiShadowHidden = isMessiHidden
                              ? `0 0 30px ${hexToRgba("#004D98", 0.4)}, 0 0 60px ${hexToRgba("#a50044", 0.3)}`
                              : undefined;
                            
                            const campeonMundoBorderHidden = isCampeonMundoHidden ? "#a855f7" : barColor;
                            const campeonMundoShadowHidden = isCampeonMundoHidden
                              ? `0 0 30px ${hexToRgba("#a855f7", 0.5)}, 0 0 60px ${hexToRgba("#a855f7", 0.4)}`
                              : undefined;
                            
                            const cardStyleHidden = isMessiHidden && messiBackgroundHidden
                              ? {
                                  ...cardStyleFor({ isUnlocked: true, rarity: def.rarity, accentHex: barColor }),
                                  background: messiBackgroundHidden,
                                  border: `2px solid ${messiBorderHidden}`,
                                  boxShadow: messiShadowHidden,
                                }
                              : isCampeonMundoHidden && campeonMundoBackgroundHidden
                                ? {
                                    ...cardStyleFor({ isUnlocked: true, rarity: def.rarity, accentHex: barColor }),
                                    background: campeonMundoBackgroundHidden,
                                    border: `2px solid ${campeonMundoBorderHidden}`,
                                    boxShadow: campeonMundoShadowHidden,
                                  }
                                : cardStyleFor({ isUnlocked: true, rarity: def.rarity, accentHex: barColor });

                            return (
                              <div
                                key={String(def.key)}
                                className="p-4 rounded-3xl text-center relative transition-transform duration-200 hover:scale-[1.02]"
                                style={cardStyleHidden}
                                title={tooltip}
                              >
                                {isComplete && (
                                  <div className="absolute right-3 top-3 text-[10px] font-black" style={{ color: isMessiHidden ? "#a50044" : isCampeonMundoHidden ? "#a855f7" : barColor }}>
                                    ✓
                                  </div>
                                )}

                                <div
                                  className="mx-auto mb-2 rounded-2xl flex items-center justify-center"
                                  style={{
                                    width: def.rarity ? 56 : 48,
                                    height: def.rarity ? 56 : 48,
                                    fontSize: def.rarity ? 30 : 28,
                                    background: "rgba(255,255,255,0.05)",
                                    border: "1px solid rgba(255,255,255,0.10)",
                                    filter: isMessiHidden 
                                      ? "drop-shadow(0 0 8px rgba(165, 0, 68, 0.6)) drop-shadow(0 0 12px rgba(0, 77, 152, 0.4))"
                                      : isCampeonMundoHidden
                                        ? "drop-shadow(0 0 8px rgba(168, 85, 247, 0.6)) drop-shadow(0 0 12px rgba(168, 85, 247, 0.4))"
                                        : "none",
                                  }}
                                >
                                  {def.icon}
                                </div>
                                <h4 
                                  className="font-black text-[10px] uppercase"
                                  style={isMessiHidden ? {
                                    color: "#a50044",
                                    textShadow: `0 0 8px ${hexToRgba("#a50044", 0.7)}, 0 0 16px ${hexToRgba("#004D98", 0.5)}`,
                                  } : isCampeonMundoHidden ? {
                                    color: "#a855f7",
                                    textShadow: `0 0 8px ${hexToRgba("#a855f7", 0.7)}, 0 0 16px ${hexToRgba("#a855f7", 0.5)}`,
                                  } : {}}
                                >
                                  {def.title}
                                </h4>
                                <p className="text-[8px] text-gray-500 mb-3">{desc}</p>

                                {target > 0 && (
                                  <>
                                    <div className="bg-white/5 h-2 rounded-full overflow-hidden">
                                      <div
                                        className="h-full"
                                        style={{
                                          width: `${pct}%`,
                                          background: isMessiHidden && isComplete
                                            ? `linear-gradient(90deg, #004D98 0%, #a50044 50%, #004D98 100%)`
                                            : isCampeonMundoHidden && isComplete
                                              ? "#a855f7"
                                              : barColor,
                                          boxShadow: isComplete ? `0 0 10px ${hexToRgba(barColor, 0.65)}` : "none",
                                          filter: isComplete ? "saturate(1.15) brightness(1.08)" : "none",
                                        }}
                                      />
                                    </div>
                                    <p className="text-[8px] mt-1 font-bold">{valueText}</p>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}
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

            {/* Date filters */}
            <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar mb-4">
              <button
                onClick={() => setHistorialDateMode("all")}
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase whitespace-nowrap ${
                  historialDateMode === "all" ? "bg-green-500 text-black" : "bg-white/10 text-white"
                }`}
                type="button"
              >
                Todas
              </button>
              <button
                onClick={() => setHistorialDateMode("week")}
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase whitespace-nowrap ${
                  historialDateMode === "week" ? "bg-green-500 text-black" : "bg-white/10 text-white"
                }`}
                type="button"
              >
                Semana
              </button>
              <button
                onClick={() => setHistorialDateMode("month")}
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase whitespace-nowrap ${
                  historialDateMode === "month" ? "bg-green-500 text-black" : "bg-white/10 text-white"
                }`}
                type="button"
              >
                Mes
              </button>
              <button
                onClick={() => setHistorialDateMode("year")}
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase whitespace-nowrap ${
                  historialDateMode === "year" ? "bg-green-500 text-black" : "bg-white/10 text-white"
                }`}
                type="button"
              >
                Año
              </button>
            </div>

            {/* Search input */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="🔍 Buscar por rival..."
                value={historialSearch}
                onChange={(e) => setHistorialSearch(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-base outline-none focus:border-green-500 placeholder:text-gray-500"
                style={{ fontSize: '16px' }}
              />
            </div>

            {/* Timeline */}
            {historialTimelineGroups.length === 0 ? (
              <div
                className="p-6 rounded-2xl text-center"
                style={{
                  background: "rgba(10, 25, 10, 0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <p className="text-sm text-gray-400">
                  {historialSearch.trim()
                    ? `No se encontraron partidos que coincidan con "${historialSearch}"${
                        historialFilter !== "all" ? ` en Fútbol ${historialFilter}` : ""
                      }.`
                    : historialDateMode !== "all"
                      ? "No hay partidos en ese período."
                      : historialFilter === "all"
                        ? "Todavía no hay partidos."
                        : `No hay partidos de Fútbol ${historialFilter}.`}
                </p>
              </div>
            ) : (
              <div className="relative">
                <div
                  className="absolute left-3 top-0 bottom-0 w-px"
                  style={{ background: "rgba(255,255,255,0.12)" }}
                />
                <div className="space-y-6">
                  {historialTimelineGroups.map((g) => (
                    <div key={g.dateKey} className="relative pl-8">
                      <div
                        className="absolute left-[10px] top-[3px] w-3 h-3 rounded-full"
                        style={{
                          background: "rgba(34, 197, 94, 0.95)",
                          border: "2px solid rgba(0,0,0,0.65)",
                          boxShadow: "0 0 12px rgba(34, 197, 94, 0.25)",
                        }}
                      />
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black">
                          {g.dateKey === "sin-fecha" ? "Sin fecha" : fmtDate(dateToISOString(g.dateKey))}
                        </p>
                        <p className="text-[10px] text-gray-500 font-bold">
                          {g.matches.length} {g.matches.length === 1 ? "partido" : "partidos"}
                        </p>
                      </div>

                      <div className="space-y-3">
                        {g.matches.map((m) => {
                          const gs = (m as any).goalsScored ?? (m as any).goals_scored;
                          const gc = (m as any).goalsConceded ?? (m as any).goals_conceded;
                          const hasScore = typeof gs === "number" && typeof gc === "number";
                          const scoreText = hasScore ? `${gs}-${gc}` : "—";

                          return (
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
                                    <h3
                                      className="font-black text-base italic uppercase"
                                      style={{
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        maxWidth: "100%",
                                      }}
                                      title={m.opponent ?? "Sin rival"}
                                    >
                                      {m.opponent ?? "Sin rival"}
                                    </h3>
                                    {m.isMvp && (
                                      <span className="text-lg" style={{ color: "#fbbf24" }} title="MVP">
                                        ⭐
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div
                                  className="px-3 py-1 rounded-full text-[10px] font-black uppercase"
                                  style={{
                                    background: cardBorderByResult(m.result) + "20",
                                    color: cardBorderByResult(m.result),
                                    border: `1px solid ${cardBorderByResult(m.result)}40`,
                                  }}
                                >
                                  {hasScore ? scoreText : resultLabel(m.result)}
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
                                    “{m.notes}”
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
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

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
                    onChange={(e) => {
                      const newDate = e.target.value;
                      if (isValidDate(newDate)) {
                        setEditDate(newDate);
                      } else {
                        showToast("No puedes seleccionar una fecha futura", "error");
                        // Resetear a la fecha original si intenta poner una fecha futura
                        const originalMatch = items.find(m => m.id === editId);
                        if (originalMatch) {
                          setEditDate(isoToDateString(originalMatch.date));
                        } else {
                          setEditDate(getTodayDate());
                        }
                      }
                    }}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    max={getMaxDate()}
                    required
                    className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-green-500"
                  />
                </label>

                <div>
                  <input
                    type="text"
                    placeholder="Rival"
                    value={editOpponent}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 50) {
                        setEditOpponent(value);
                      } else {
                        showToast("El nombre del rival no puede exceder 50 caracteres", "info");
                      }
                    }}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    maxLength={50}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-base outline-none focus:border-green-500"
                    style={{ fontSize: '16px' }}
                    required
                  />
                  <p 
                    className="text-[9px] mt-1 text-right font-bold"
                    style={{ 
                      color: editOpponent.length >= 50 ? "#ef4444" : editOpponent.length >= 45 ? "#fbbf24" : "#6b7280",
                      transition: "color 0.2s"
                    }}
                  >
                    {editOpponent.length} / 50
                    {editOpponent.length >= 50 && (
                      <span className="ml-2 text-[8px]">⚠️ Límite alcanzado</span>
                    )}
                  </p>
                </div>

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
                  <button
                    type="button"
                    onClick={(e) => {
                      setEditIsMvp(!editIsMvp);
                      e.currentTarget.blur();
                    }}
                    className={`flex items-center justify-center bg-white/5 border rounded-xl p-3 gap-2 transition-colors ${
                      editIsMvp ? "border-yellow-400" : "border-white/10"
                    } outline-none`}
                    title="Opcional"
                  >
                    <i
                      className={`fas fa-star ${editIsMvp ? "text-yellow-400" : "text-gray-500"}`}
                      style={{ fontSize: 18 }}
                    ></i>
                    <span className="text-[10px] font-black text-gray-400 uppercase">
                      ¿Fuiste el MVP?
                    </span>
                  </button>
                </div>

                {/* Marcador (Match Score) */}
                <div
                  className="p-4 rounded-2xl"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-center mb-3 text-gray-400">
                    Marcador
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-center">
                      <p className="text-[9px] text-gray-500 font-bold uppercase mb-2">Tu equipo</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            setEditGoalsScored((v) => Math.max(0, v - 1));
                            e.currentTarget.blur();
                          }}
                          className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl font-black text-base sm:text-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                          –
                        </button>
                        <span className="text-3xl font-black w-10 text-center" style={{ color: "#22c55e" }}>
                          {editGoalsScored}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            setEditGoalsScored((v) => Math.min(99, v + 1));
                            e.currentTarget.blur();
                          }}
                          className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl font-black text-base sm:text-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <span className="relative top-[10px] text-2xl font-black text-gray-500 leading-none">-</span>

                    <div className="text-center">
                      <p className="text-[9px] text-gray-500 font-bold uppercase mb-2">Rival</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            setEditGoalsConceded((v) => Math.max(0, v - 1));
                            e.currentTarget.blur();
                          }}
                          className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl font-black text-base sm:text-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                          –
                        </button>
                        <span className="text-3xl font-black w-10 text-center">{editGoalsConceded}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            setEditGoalsConceded((v) => Math.min(99, v + 1));
                            e.currentTarget.blur();
                          }}
                          className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl font-black text-base sm:text-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rendimiento personal (Goles / Asistencias con +/-) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <p className="text-[10px] font-black uppercase text-gray-400 mb-2 text-center">
                      Goles
                    </p>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={(e) => {
                          setEditGoals((v) => Math.max(0, v - 1));
                          e.currentTarget.blur();
                        }}
                        className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl font-black text-base sm:text-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        –
                      </button>
                      <span className="text-2xl font-black w-10 text-center" style={{ color: "#22c55e" }}>
                        {editGoals}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          setEditGoals((v) => Math.min(50, v + 1));
                          e.currentTarget.blur();
                        }}
                        className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl font-black text-base sm:text-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <p className="text-[10px] font-black uppercase text-gray-400 mb-2 text-center">
                      Asistencias
                    </p>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={(e) => {
                          setEditAssists((v) => Math.max(0, v - 1));
                          e.currentTarget.blur();
                        }}
                        className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl font-black text-base sm:text-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        –
                      </button>
                      <span className="text-2xl font-black w-10 text-center" style={{ color: "#3b82f6" }}>
                        {editAssists}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          setEditAssists((v) => Math.min(50, v + 1));
                          e.currentTarget.blur();
                        }}
                        className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl font-black text-base sm:text-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <textarea
                    placeholder='Opcional: ¿Cómo jugaste? ¿Algo destacado?'
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
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
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
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-base outline-none resize-none"
                    style={{ 
                      minHeight: 90, 
                      maxHeight: 90,
                      fontSize: '16px'
                    }}
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

      {/* Overlay de logro desbloqueado */}
      {unlockedAchievement && (() => {
        const hexToRgba = (hex: string, alpha: number) => {
          if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return `rgba(255,255,255,${alpha})`;
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        const accentColor = unlockedAchievement.barColor;
        const isEpic = unlockedAchievement.rarity === "epic" || unlockedAchievement.rarity === "legendary";
        const isMessi = unlockedAchievement.key === "messi91";
        const isCampeonMundo = unlockedAchievement.key === "campeonDelMundoPlm";
        const baseBg = "rgba(10, 25, 10, 0.98)";
        
        // Gradiente especial para Messi (Barcelona: azul y rojo)
        // Gradiente especial para Campeon del Mundo PLM (violeta)
        const background: string = isMessi
          ? `linear-gradient(135deg, rgba(0, 77, 152, 0.4) 0%, rgba(165, 0, 68, 0.4) 50%, rgba(0, 77, 152, 0.4) 100%), radial-gradient(circle at 50% 35%, rgba(165, 0, 68, 0.3), ${baseBg} 70%)`
          : isCampeonMundo
            ? `radial-gradient(circle at 50% 35%, ${hexToRgba("#a855f7", 0.3)}, ${baseBg} 70%)`
            : isEpic
              ? `radial-gradient(circle at 50% 35%, ${hexToRgba(accentColor, 0.25)}, ${baseBg} 70%)`
              : baseBg;
        
        // Color especial para Messi: gradiente azul-rojo
        // Color especial para Campeon del Mundo PLM: violeta
        const displayColor = isMessi ? "#a50044" : isCampeonMundo ? "#a855f7" : accentColor;
        const borderColor = isMessi ? "#004D98" : isCampeonMundo ? "#a855f7" : accentColor;

        return (
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center"
            style={{
              background: "rgba(0, 0, 0, 0.85)",
              backdropFilter: "blur(8px)",
            }}
            onClick={() => setUnlockedAchievement(null)}
          >
            <div
              className="relative p-8 rounded-3xl text-center animate-in fade-in zoom-in duration-300"
              style={{
                background,
                border: isMessi ? `3px solid ${borderColor}` : isCampeonMundo ? `2px solid ${borderColor}` : `2px solid ${accentColor}`,
                boxShadow: isMessi
                  ? `0 0 50px ${hexToRgba("#004D98", 0.6)}, 0 0 100px ${hexToRgba("#a50044", 0.5)}, 0 0 150px ${hexToRgba("#004D98", 0.3)}`
                  : isCampeonMundo
                    ? `0 0 40px ${hexToRgba("#a855f7", 0.6)}, 0 0 80px ${hexToRgba("#a855f7", 0.5)}`
                    : `0 0 40px ${hexToRgba(accentColor, 0.5)}, 0 0 80px ${hexToRgba(accentColor, 0.3)}`,
                maxWidth: "90%",
                width: isMessi ? "450px" : "400px",
              }}
            >
              <div
                className="text-6xl mb-4 animate-bounce"
                style={{
                  animation: "bounce 0.6s ease-in-out infinite",
                  filter: isMessi 
                    ? "drop-shadow(0 0 10px rgba(165, 0, 68, 0.8)) drop-shadow(0 0 20px rgba(0, 77, 152, 0.6))"
                    : isCampeonMundo
                      ? "drop-shadow(0 0 10px rgba(168, 85, 247, 0.8)) drop-shadow(0 0 20px rgba(168, 85, 247, 0.6))"
                      : "none",
                }}
              >
                {unlockedAchievement.icon}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2">
                🏆 LOGRO DESBLOQUEADO
              </div>
              <h2
                className="text-2xl font-black italic uppercase mb-4"
                style={{
                  color: displayColor,
                  textShadow: isMessi
                    ? `0 0 20px ${hexToRgba("#a50044", 0.8)}, 0 0 40px ${hexToRgba("#004D98", 0.6)}`
                    : isCampeonMundo
                      ? `0 0 20px ${hexToRgba("#a855f7", 0.8)}, 0 0 40px ${hexToRgba("#a855f7", 0.6)}`
                      : `0 0 20px ${hexToRgba(accentColor, 0.6)}`,
                }}
              >
                {unlockedAchievement.title}
              </h2>
              <p className="text-sm text-gray-400 mt-4">
                Toca para cerrar
              </p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
