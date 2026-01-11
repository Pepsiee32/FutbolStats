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
3. Configura las URLs de redirección:
   - Development: `http://localhost:3000`
   - Production: `https://tu-dominio.vercel.app`

## Paso 4: Crear Esquema de Base de Datos

1. Ve a SQL Editor en Supabase
2. Ejecuta el script `supabase/migrations/001_create_matches.sql`
3. Verifica que la tabla `matches` se haya creado correctamente

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
3. Verifica que puedas crear partidos
4. Verifica que solo veas tus propios partidos (RLS)
