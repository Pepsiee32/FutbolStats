# 🚀 Cómo Iniciar el Proyecto

## Inicio Rápido

### Opción 1: Scripts Automatizados (Recomendado)

#### Iniciar Backend:
```powershell
.\iniciar-backend.ps1
```

#### Iniciar Frontend:
Abre una **nueva terminal** y ejecuta:
```powershell
.\iniciar-frontend.ps1
```

### Opción 2: Manual

#### 1. Iniciar Backend (Terminal 1)

```powershell
cd api\Futbol.Api
dotnet run --launch-profile http
```

El backend se iniciará en: `http://localhost:5247`

**Verificación**: Abre `http://localhost:5247/ping` en el navegador, debería responder `"ok"`

#### 2. Iniciar Frontend (Terminal 2 - Nueva)

Abre una **nueva terminal** (deja el backend corriendo) y ejecuta:

```powershell
cd web
npm run dev
```

El frontend se iniciará en: `http://localhost:3000`

## Orden de Inicio

1. ✅ **Primero**: Inicia el backend (puerto 5247)
2. ✅ **Segundo**: Inicia el frontend (puerto 3000)

## Verificación

Una vez que ambos estén corriendo:

- **Backend**: `http://localhost:5247/ping` → Debe responder `"ok"`
- **Frontend**: `http://localhost:3000` → Debe cargar la aplicación

## Detener los Servidores

- **Backend**: Presiona `Ctrl+C` en la terminal del backend
- **Frontend**: Presiona `Ctrl+C` en la terminal del frontend

## Solución de Problemas

### Error: "dotnet no se reconoce"
- Instala .NET SDK: `.\instalar-y-ejecutar-migraciones.ps1` (solo la instalación)
- O sigue: `INSTALAR_DOTNET.md`

### Error: "npm no se reconoce"
- Instala Node.js desde: https://nodejs.org/
- Reinicia la terminal después de instalar

### Error: "ERR_CONNECTION_REFUSED"
- Verifica que el backend esté corriendo en el puerto 5247
- Verifica que no haya otro proceso usando ese puerto

### Error: "Puerto 3000 ya en uso"
- Cierra otras aplicaciones que usen el puerto 3000
- O cambia el puerto en `web/package.json` agregando: `"dev": "next dev -p 3001"`

## Notas

- El backend debe estar corriendo **antes** de usar el frontend
- Ambos servidores deben estar corriendo **simultáneamente** en terminales separadas
- El frontend se conecta automáticamente al backend usando `NEXT_PUBLIC_API_URL` (por defecto: `http://localhost:5247`)
