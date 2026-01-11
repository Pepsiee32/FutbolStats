import { supabase } from "@/lib/supabase";
import { translateError } from "@/utils/errorTranslations";

export type MeResponse = { id: string; email: string };

export const auth = {
  register: async (email: string, password: string): Promise<void> => {
    const redirectUrl =
      typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: redirectUrl
        ? {
            emailRedirectTo: redirectUrl,
          }
        : undefined,
    });

    if (error) {
      throw new Error(translateError(error.message));
    }
  },

  resetPassword: async (email: string): Promise<void> => {
    const redirectUrl =
      typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      throw new Error(translateError(error.message));
    }
  },

  login: async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(translateError(error.message));
    }
  },

  me: async (): Promise<MeResponse> => {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      throw new Error(translateError(error?.message || "Usuario no autenticado"));
    }

    return {
      id: user.id,
      email: user.email || "",
    };
  },

  logout: async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(translateError(error.message));
    }
  },
};
