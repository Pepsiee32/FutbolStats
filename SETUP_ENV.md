# Configuración de Entorno - FutbolSaaS

## Archivos de configuración creados/actualizados

### ✅ Backend (API)
- `api/Futbol.Api/appsettings.json` - Configurado con PostgreSQL
- `api/Futbol.Api/appsettings.Development.json` - Configurado con PostgreSQL
- `api/Futbol.Api/Program.cs` - Usa `UseNpgsql` y `DefaultConnection`

### ⚠️ Frontend (Next.js)
Necesitas crear manualmente el archivo `.env.local` en la carpeta `web/` con el siguiente contenido:

```env
NEXT_PUBLIC_API_URL=http://localhost:5247

# Recommended for most uses
DATABASE_URL=postgresql://neondb_owner:npg_TiHxNGv3a1hX@ep-calm-poetry-adpqicy6-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require

# For uses requiring a connection without pgbouncer
DATABASE_URL_UNPOOLED=postgresql://neondb_owner:npg_TiHxNGv3a1hX@ep-calm-poetry-adpqicy6.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require

# Parameters for constructing your own connection string
PGHOST=ep-calm-poetry-adpqicy6-pooler.c-2.us-east-1.aws.neon.tech
PGHOST_UNPOOLED=ep-calm-poetry-adpqicy6.c-2.us-east-1.aws.neon.tech
PGUSER=neondb_owner
PGDATABASE=neondb
PGPASSWORD=npg_TiHxNGv3a1hX

# Parameters for Vercel Postgres Templates
POSTGRES_URL=postgresql://neondb_owner:npg_TiHxNGv3a1hX@ep-calm-poetry-adpqicy6-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
POSTGRES_URL_NON_POOLING=postgresql://neondb_owner:npg_TiHxNGv3a1hX@ep-calm-poetry-adpqicy6.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
POSTGRES_USER=neondb_owner
POSTGRES_HOST=ep-calm-poetry-adpqicy6-pooler.c-2.us-east-1.aws.neon.tech
POSTGRES_PASSWORD=npg_TiHxNGv3a1hX
POSTGRES_DATABASE=neondb
POSTGRES_URL_NO_SSL=postgresql://neondb_owner:npg_TiHxNGv3a1hX@ep-calm-poetry-adpqicy6-pooler.c-2.us-east-1.aws.neon.tech/neondb
POSTGRES_PRISMA_URL=postgresql://neondb_owner:npg_TiHxNGv3a1hX@ep-calm-poetry-adpqicy6-pooler.c-2.us-east-1.aws.neon.tech/neondb?connect_timeout=15&sslmode=require

# Neon Auth environment variables for Next.js
NEXT_PUBLIC_STACK_PROJECT_ID=**********
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=**************
STACK_SECRET_SERVER_KEY=*********
```

## Pasos para probar el sistema

### 1. Crear el archivo .env.local
```bash
# Desde la raíz del proyecto
cd web
# Crea el archivo .env.local con el contenido de arriba
```

### 2. Ejecutar las migraciones de la base de datos
```bash
# Desde la raíz del proyecto
cd api/Futbol.Api
dotnet ef database update
```

**⚠️ IMPORTANTE**: Las migraciones se ejecutarán contra tu base de datos **remota en Neon**, no contra una base de datos local. La cadena de conexión en `appsettings.json` apunta directamente a Neon.

**Alternativa**: Puedes usar el script automatizado:
```powershell
.\instalar-y-ejecutar-migraciones.ps1
```

Ver más detalles en: `EJECUTAR_MIGRACIONES_REMOTAS.md`

### 3. Iniciar el backend
```bash
# Desde api/Futbol.Api
dotnet run
# O si tienes el perfil configurado:
dotnet run --launch-profile http
```

El backend debería iniciar en `http://localhost:5247`

### 4. Iniciar el frontend
```bash
# Desde web/
npm run dev
```

El frontend debería iniciar en `http://localhost:3000`

## Verificación

1. **Backend**: Abre `http://localhost:5247/ping` - Debería responder con `"ok"`
2. **Frontend**: Abre `http://localhost:3000` - Debería cargar la aplicación
3. **Base de datos**: Las migraciones deberían haberse ejecutado correctamente en PostgreSQL

## Notas

- Las migraciones ya están convertidas a PostgreSQL ✅
- El `Program.cs` ya está configurado para usar PostgreSQL ✅
- Los `appsettings.json` ya tienen la cadena de conexión correcta ✅
- Solo falta crear el `.env.local` en la carpeta `web/` y ejecutar las migraciones
