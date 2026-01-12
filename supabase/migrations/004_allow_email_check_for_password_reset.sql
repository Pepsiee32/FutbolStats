-- Función para verificar si un email existe en la tabla profiles
-- Esta función permite verificar si un email está registrado sin exponer otros datos
-- y sin necesidad de autenticación (necesario para recuperación de contraseña)

CREATE OR REPLACE FUNCTION public.check_email_exists(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE email = check_email
  );
END;
$$;

-- Política RLS para permitir que usuarios no autenticados ejecuten la función
-- La función usa SECURITY DEFINER, por lo que se ejecuta con los permisos del creador
-- y puede acceder a la tabla profiles incluso si RLS está activo

-- Nota: Esta función devuelve solo un booleano (true/false) indicando si el email existe,
-- sin exponer ningún otro dato del usuario. Esto es más seguro que permitir SELECT directo.
