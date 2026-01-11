// web/services/matches.ts
import { supabase } from "@/lib/supabase";

export type Match = {
  id: string;
  date: string; // ISO
  opponent: string | null;
  format: number | null;
  goals: number | null;
  assists: number | null;
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
  result: number | null;
  is_mvp: boolean;
  isMvp?: boolean; // Compatibilidad con código existente
  notes?: string | null;
};

export type UpdateMatchRequest = CreateMatchRequest;

export const matchesApi = {
  list: async (): Promise<Match[]> => {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    // Mapear is_mvp a isMvp para compatibilidad
    return (data || []).map(match => ({
      ...match,
      isMvp: match.is_mvp,
    }));
  },

  get: async (id: string): Promise<Match> => {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error("Partido no encontrado");
    }

    return {
      ...data,
      isMvp: data.is_mvp,
    };
  },

  create: async (req: CreateMatchRequest): Promise<Match> => {
    // Mapear isMvp a is_mvp si viene en el request
    const payload: any = { ...req };
    if ('isMvp' in payload && !('is_mvp' in payload)) {
      payload.is_mvp = payload.isMvp;
      delete payload.isMvp;
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
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error("Error al crear partido");
    }

    return {
      ...data,
      isMvp: data.is_mvp,
    };
  },

  update: async (id: string, req: UpdateMatchRequest): Promise<Match> => {
    // Mapear isMvp a is_mvp si viene en el request
    const payload: any = { ...req };
    if ('isMvp' in payload && !('is_mvp' in payload)) {
      payload.is_mvp = payload.isMvp;
      delete payload.isMvp;
    }

    const { data, error } = await supabase
      .from("matches")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error("Error al actualizar partido");
    }

    return {
      ...data,
      isMvp: data.is_mvp,
    };
  },

  remove: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from("matches")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
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
