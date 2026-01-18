// web/services/matches.ts
import { supabase } from "@/lib/supabase";
import { translateError } from "@/utils/errorTranslations";

export type Match = {
  id: string;
  date: string; // ISO
  opponent: string | null;
  format: number | null;
  goals: number | null;
  assists: number | null;
  // Marcador (opcional). Puede no existir en la tabla según tu schema.
  goals_scored?: number | null; // goles de tu equipo
  goals_conceded?: number | null; // goles del rival
  goalsScored?: number | null; // compat (camelCase)
  goalsConceded?: number | null; // compat (camelCase)
  result: number | null;     // 1 win, 0 draw, -1 loss
  is_mvp: boolean;
  isMvp?: boolean; // Compatibilidad con código existente
  notes: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CreateMatchRequest = {
  date: string; // ISO
  opponent?: string | null;
  format?: number | null;
  goals?: number | null;
  assists?: number | null;
  // Marcador (opcional). Se enviará solo si la tabla soporta estas columnas.
  goals_scored?: number | null;
  goals_conceded?: number | null;
  goalsScored?: number | null; // compat (camelCase)
  goalsConceded?: number | null; // compat (camelCase)
  result: number | null;
  is_mvp: boolean;
  isMvp?: boolean; // Compatibilidad con código existente
  notes?: string | null;
};

export type UpdateMatchRequest = CreateMatchRequest;

let cachedScoreColumnsSupported: boolean | null = null;

async function scoreColumnsSupported(): Promise<boolean> {
  if (cachedScoreColumnsSupported !== null) return cachedScoreColumnsSupported;

  // Si las columnas no existen, PostgREST devuelve un error de "column ... does not exist".
  // Si hay cualquier otro error (RLS, etc.), también fallback a "false" para no romper.
  const { error } = await supabase
    .from("matches")
    .select("goals_scored, goals_conceded")
    .limit(1);

  cachedScoreColumnsSupported = !error;
  return cachedScoreColumnsSupported;
}

export const matchesApi = {
  list: async (): Promise<Match[]> => {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      throw new Error(translateError(error.message));
    }

    // Mapear is_mvp a isMvp para compatibilidad
    return (data || []).map(match => ({
      ...match,
      isMvp: match.is_mvp,
      goalsScored: (match as any).goals_scored ?? (match as any).goalsScored ?? null,
      goalsConceded: (match as any).goals_conceded ?? (match as any).goalsConceded ?? null,
    }));
  },

  get: async (id: string): Promise<Match> => {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(translateError(error.message));
    }

    if (!data) {
      throw new Error("Partido no encontrado");
    }

    return {
      ...data,
      isMvp: data.is_mvp,
      goalsScored: (data as any).goals_scored ?? (data as any).goalsScored ?? null,
      goalsConceded: (data as any).goals_conceded ?? (data as any).goalsConceded ?? null,
    };
  },

  create: async (req: CreateMatchRequest): Promise<Match> => {
    // Mapear isMvp a is_mvp si viene en el request
    const payload: any = { ...req };
    if ('isMvp' in payload && !('is_mvp' in payload)) {
      payload.is_mvp = payload.isMvp;
      delete payload.isMvp;
    }

    // Marcador: mapear camelCase y/o eliminar si la tabla no tiene las columnas
    const supportsScore = await scoreColumnsSupported();
    if (!supportsScore) {
      delete payload.goals_scored;
      delete payload.goals_conceded;
      delete payload.goalsScored;
      delete payload.goalsConceded;
    } else {
      if ("goalsScored" in payload && !("goals_scored" in payload)) {
        payload.goals_scored = payload.goalsScored;
        delete payload.goalsScored;
      }
      if ("goalsConceded" in payload && !("goals_conceded" in payload)) {
        payload.goals_conceded = payload.goalsConceded;
        delete payload.goalsConceded;
      }
    }

    // Obtener el usuario actual para asegurar que tenemos una sesión válida
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Debes estar autenticado para crear un partido");
    }

    // El user_id se asignará automáticamente por el trigger en la base de datos
    // No es necesario (y no es seguro) pasarlo desde el cliente
    // El trigger usará auth.uid() automáticamente

    const { data, error } = await supabase
      .from("matches")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new Error(translateError(error.message));
    }

    if (!data) {
      throw new Error("Error al crear partido");
    }

    return {
      ...data,
      isMvp: data.is_mvp,
      goalsScored: (data as any).goals_scored ?? (data as any).goalsScored ?? null,
      goalsConceded: (data as any).goals_conceded ?? (data as any).goalsConceded ?? null,
    };
  },

  update: async (id: string, req: UpdateMatchRequest): Promise<Match> => {
    // Mapear isMvp a is_mvp si viene en el request
    const payload: any = { ...req };
    if ('isMvp' in payload && !('is_mvp' in payload)) {
      payload.is_mvp = payload.isMvp;
      delete payload.isMvp;
    }

    // Marcador: mapear camelCase y/o eliminar si la tabla no tiene las columnas
    const supportsScore = await scoreColumnsSupported();
    if (!supportsScore) {
      delete payload.goals_scored;
      delete payload.goals_conceded;
      delete payload.goalsScored;
      delete payload.goalsConceded;
    } else {
      if ("goalsScored" in payload && !("goals_scored" in payload)) {
        payload.goals_scored = payload.goalsScored;
        delete payload.goalsScored;
      }
      if ("goalsConceded" in payload && !("goals_conceded" in payload)) {
        payload.goals_conceded = payload.goalsConceded;
        delete payload.goalsConceded;
      }
    }

    const { data, error } = await supabase
      .from("matches")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(translateError(error.message));
    }

    if (!data) {
      throw new Error("Error al actualizar partido");
    }

    return {
      ...data,
      isMvp: data.is_mvp,
      goalsScored: (data as any).goals_scored ?? (data as any).goalsScored ?? null,
      goalsConceded: (data as any).goals_conceded ?? (data as any).goalsConceded ?? null,
    };
  },

  remove: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from("matches")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(translateError(error.message));
    }
  },
};


// Helpers UI (texto)
export function resultLabel(result: number | null | undefined) {
  if (result === 1) return "Ganado";
  if (result === 0) return "Empatado";
  if (result === -1) return "Perdido";
  return "Sin resultado";
}
