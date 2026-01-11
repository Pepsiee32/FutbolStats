# 🚀 Inicio Rápido - Ejecutar Migraciones

## Problema
No tienes .NET SDK instalado y necesitas ejecutar las migraciones contra tu base de datos remota en Neon.

## Solución Automática (Recomendada)

Ejecuta este comando desde la raíz del proyecto:

```powershell
.\instalar-y-ejecutar-migraciones.ps1
```

Este script:
1. ✅ Verifica si .NET SDK está instalado
2. ✅ Si no está, lo instala automáticamente usando winget
3. ✅ Instala las herramientas de Entity Framework
4. ✅ Ejecuta las migraciones contra tu base de datos Neon (remota)

**Nota**: Si es la primera vez que instalas .NET SDK, después de la instalación necesitarás **cerrar y volver a abrir la terminal** para que los cambios surtan efecto. Luego ejecuta este script nuevamente:

```powershell
.\instalar-y-ejecutar-migraciones.ps1
```

## Solución Manual

### Paso 1: Instalar .NET SDK

```powershell
winget install Microsoft.DotNet.SDK.9 --accept-package-agreements --accept-source-agreements
```

O descarga desde: https://dotnet.microsoft.com/download

### Paso 2: Cerrar y reabrir la terminal

Esto es necesario para que el PATH se actualice.

### Paso 3: Instalar herramientas de EF Core

```powershell
dotnet tool install --global dotnet-ef
```

### Paso 4: Ejecutar migraciones

```powershell
cd api\Futbol.Api
dotnet ef database update
```

## Verificación

Después de ejecutar las migraciones, deberías ver:

```
Applying migration '20260102232604_Initial'.
Applying migration '20260105034317_AddResultAndMvpToMatch'.
Applying migration '20260105044950_RemoveLocationFromMatches'.
Done.
```

## ¿Dónde se ejecutan las migraciones?

✅ **Base de datos remota en Neon** (no local)
- Host: `ep-calm-poetry-adpqicy6-pooler.c-2.us-east-1.aws.neon.tech`
- Database: `neondb`
- La cadena de conexión está en `appsettings.json`

## Más información

- `EJECUTAR_MIGRACIONES_REMOTAS.md` - Guía detallada
- `INSTALAR_DOTNET.md` - Instrucciones de instalación
- `SETUP_ENV.md` - Configuración completa del entorno
