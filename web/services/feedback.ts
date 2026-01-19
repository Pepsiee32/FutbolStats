// web/services/feedback.ts
import { supabase } from "@/lib/supabase";
import { translateError } from "@/utils/errorTranslations";

export type FeedbackKind = "ui" | "stats" | "viz" | "achievement";

export type CreateFeedbackRequest = {
  kind: FeedbackKind;
  message: string;
  page?: string | null;
};

export const feedbackApi = {
  create: async (req: CreateFeedbackRequest): Promise<void> => {
    const message = req.message?.trim() ?? "";
    if (!message) throw new Error("Escribí tu recomendación antes de enviarla.");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Debes estar autenticado para enviar recomendaciones");
    }

    const payload = {
      kind: req.kind,
      message,
      page: req.page ?? null,
      // user_id / user_email se asignan por trigger en la DB (más seguro)
    };

    // Insert sin select: evita requerir permisos de lectura en feedback
    const { error } = await supabase.from("feedback").insert(payload);
    if (error) {
      throw new Error(translateError(error.message));
    }
  },
};

