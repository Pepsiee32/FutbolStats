# Configuración de Supabase

## Paso 1: Crear Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto
3. Anota la URL del proyecto y las API keys

## Paso 2: Configurar Variables de Entorno

Crea un archivo `.env.local` en el directorio `web/`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

Para obtener las keys:
1. Ve a tu proyecto en Supabase
2. Ve a Settings > API
3. Copia la "Project URL" y "anon public" key

## Paso 3: Configurar Autenticación

1. Ve a Authentication > Providers en Supabase
2. Asegúrate de que "Email" esté habilitado
3. **Desactivar confirmación de email** (opcional pero recomendado):
   - Ve a Authentication > Settings
   - Desactiva "Enable email confirmations"
   - Esto permite que los usuarios se registren sin confirmar el email
4. **Configurar URLs de redirección (MUY IMPORTANTE)**:
   - Ve a Authentication > URL Configuration
   - **Site URL**: Configura la URL base de tu aplicación
     - Development: `http://localhost:3000`
     - Production: `https://tu-dominio.vercel.app`
   - **Redirect URLs**: Agrega TODAS las URLs permitidas (una por línea):
     ```
     http://localhost:3000/reset-password
     http://localhost:3000/login
     https://tu-dominio.vercel.app/reset-password
     https://tu-dominio.vercel.app/login
     ```
   - **⚠️ IMPORTANTE**: La URL `/reset-password` DEBE estar en la lista de Redirect URLs, de lo contrario Supabase redirigirá a la Site URL por defecto (que suele ser `/login`)

## Paso 4: Crear Esquema de Base de Datos

1. Ve a SQL Editor en Supabase
2. Ejecuta los scripts de migración en orden:
   - `supabase/migrations/004_create_feedback.sql` (tabla de sugerencias/recomendaciones)
   - `supabase/migrations/005_update_feedback_kinds.sql` (solo si ya habías ejecutado la 004 anterior con otros tipos)
3. Verifica que ambas tablas se hayan creado correctamente

## Paso 5: Migrar Datos

Sigue las instrucciones en `supabase/migrate-data.md` para migrar usuarios y partidos existentes.

## Paso 6: Configurar Vercel (Producción)

1. Ve a tu proyecto en Vercel
2. Ve a Settings > Environment Variables
3. Agrega:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Haz redeploy

## Verificación

1. Inicia el servidor de desarrollo: `npm run dev` en `web/`
2. Intenta registrarte con un nuevo usuario
3. Verifica que se haya creado automáticamente un perfil en la tabla `profiles`
4. Verifica que puedas crear partidos
5. Verifica que solo veas tus propios partidos (RLS)

## Estructura de Tablas

- **auth.users**: Usuarios de autenticación (manejado automáticamente por Supabase)
- **profiles**: Información adicional del usuario (email, nombre, avatar, etc.)
- **matches**: Partidos registrados por cada usuario
