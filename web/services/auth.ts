import { supabase } from "@/lib/supabase";

export type MeResponse = { id: string; email: string };

export const auth = {
  register: async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }
  },

  login: async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }
  },

  me: async (): Promise<MeResponse> => {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      throw new Error(error?.message || "Usuario no autenticado");
    }

    return {
      id: user.id,
      email: user.email || "",
    };
  },

  logout: async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }
  },
};
