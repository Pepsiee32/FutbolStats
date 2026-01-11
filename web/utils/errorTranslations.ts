/**
 * Traduce mensajes de error de Supabase al español
 */
export function translateError(errorMessage: string): string {
  if (!errorMessage) return "Error desconocido";

  const message = errorMessage.toLowerCase();

  // Errores de autenticación
  if (message.includes("invalid login credentials") || message.includes("invalid credentials")) {
    return "Credenciales incorrectas. Verifica tu email y contraseña.";
  }

  if (message.includes("email not confirmed") || message.includes("email_not_confirmed")) {
    return "Email no confirmado. Por favor verifica tu correo electrónico.";
  }

  if (message.includes("user already registered") || message.includes("already registered")) {
    return "Este email ya está registrado. Intenta iniciar sesión.";
  }

  if (message.includes("password should be at least")) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }

  if (message.includes("password is too weak") || message.includes("weak password")) {
    return "La contraseña es muy débil. Usa una contraseña más segura.";
  }

  if (message.includes("email rate limit exceeded")) {
    return "Demasiados intentos. Por favor espera unos minutos antes de intentar nuevamente.";
  }

  if (message.includes("signup_disabled")) {
    return "El registro está deshabilitado temporalmente.";
  }

  if (message.includes("email address is already associated")) {
    return "Este email ya está asociado a una cuenta.";
  }

  // Errores de sesión
  if (message.includes("session not found") || message.includes("invalid session")) {
    return "Sesión no válida. Por favor inicia sesión nuevamente.";
  }

  if (message.includes("token expired") || message.includes("expired")) {
    return "El enlace ha expirado. Por favor solicita uno nuevo.";
  }

  if (message.includes("invalid token") || message.includes("token invalid")) {
    return "Enlace inválido. Por favor solicita uno nuevo.";
  }

  // Errores de recuperación de contraseña
  if (message.includes("recovery token expired")) {
    return "El enlace de recuperación ha expirado. Por favor solicita uno nuevo.";
  }

  if (message.includes("recovery token invalid")) {
    return "Enlace de recuperación inválido. Por favor solicita uno nuevo.";
  }

  // Errores de base de datos
  if (message.includes("duplicate key") || message.includes("unique constraint")) {
    return "Este registro ya existe.";
  }

  if (message.includes("foreign key constraint")) {
    return "No se puede realizar esta operación debido a restricciones de datos.";
  }

  if (message.includes("row level security") || message.includes("rls")) {
    return "No tienes permiso para realizar esta acción.";
  }

  // Errores de red
  if (message.includes("network") || message.includes("fetch")) {
    return "Error de conexión. Verifica tu internet e intenta nuevamente.";
  }

  if (message.includes("timeout")) {
    return "La operación tardó demasiado. Por favor intenta nuevamente.";
  }

  // Errores genéricos
  if (message.includes("unauthorized") || message.includes("401")) {
    return "No autorizado. Por favor inicia sesión.";
  }

  if (message.includes("forbidden") || message.includes("403")) {
    return "No tienes permiso para realizar esta acción.";
  }

  if (message.includes("not found") || message.includes("404")) {
    return "No se encontró el recurso solicitado.";
  }

  if (message.includes("server error") || message.includes("500")) {
    return "Error del servidor. Por favor intenta más tarde.";
  }

  // Si no coincide con ningún patrón conocido, devolver el mensaje original
  // pero limpiarlo un poco
  return errorMessage;
}
