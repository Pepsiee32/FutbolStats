# 🚀 Guía de Despliegue a Producción

Esta guía te ayudará a desplegar tu aplicación Futbol SaaS usando:
- **Frontend**: Vercel (gratis)
- **Backend**: Render (gratis)
- **Base de Datos**: Azure SQL Database (trial)

---

## 📋 Prerequisitos

1. Cuenta en GitHub con tu código subido
2. Cuenta en Vercel (gratis)
3. Cuenta en Render (gratis)
4. Cuenta en Azure (trial de 30 días)

---

## 🗄️ Parte 1: Configurar Base de Datos en Azure

### Paso 1: Crear SQL Database en Azure

1. Ve a https://portal.azure.com
2. Busca "SQL databases" y crea una nueva
3. Configuración básica:
   - **Subscription**: Selecciona tu suscripción (trial)
   - **Resource group**: Crea uno nuevo o usa existente
   - **Database name**: `futbol-saas-db`
   - **Server**: Crea un nuevo servidor
     - **Server name**: `futbol-saas-server` (debe ser único)
     - **Location**: Elige la más cercana
     - **Authentication**: SQL authentication
     - **Admin username**: `futboladmin` (o el que prefieras)
     - **Password**: Crea una contraseña segura (guárdala)
   - **Compute + storage**: 
     - **Service tier**: Basic (más económico para trial)
     - **Compute tier**: Serverless (se pausa cuando no se usa)

### Paso 2: Configurar Firewall

1. En tu SQL Database, ve a "Networking"
2. En "Firewall rules", agrega:
   - **Rule name**: `AllowAzureServices`
   - **Start IP**: `0.0.0.0`
   - **End IP**: `0.0.0.0`
   - ✅ Marca "Allow Azure services and resources to access this server"
3. Agrega también tu IP actual para poder conectarte desde tu máquina
4. Guarda los cambios

### Paso 3: Obtener Connection String

1. En tu SQL Database, ve a "Connection strings"
2. Copia la connection string de **ADO.NET**
3. Reemplaza `{your_password}` con tu contraseña
4. **Ejemplo**:
   ```
   Server=tcp:futbol-saas-server.database.windows.net,1433;Initial Catalog=futbol-saas-db;Persist Security Info=False;User ID=futboladmin;Password=TuPassword123!;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
   ```
5. **Guarda esta connection string**, la necesitarás para Render

---

## ⚙️ Parte 2: Desplegar Backend en Render

### Paso 1: Crear cuenta en Render

1. Ve a https://render.com
2. Regístrate con GitHub (recomendado)
3. Conecta tu cuenta de GitHub

### Paso 2: Crear Web Service

1. En el dashboard de Render, click en **"New +"** → **"Web Service"**
2. Conecta tu repositorio de GitHub
3. Selecciona el repositorio de tu proyecto

### Paso 3: Configurar el servicio

Configuración básica:
- **Name**: `futbol-api` (o el nombre que prefieras)
- **Region**: Elige la más cercana a tus usuarios
- **Branch**: `main` (o la rama que uses)
- **Root Directory**: `api/Futbol.Api`
- **Runtime**: `dotnet`
- **Build Command**: `dotnet publish -c Release -o ./publish`
- **Start Command**: `dotnet ./publish/Futbol.Api.dll`

### Paso 4: Variables de Entorno

En la sección **"Environment Variables"**, agrega:

```env
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://0.0.0.0:10000

# Base de datos (usa la connection string de Azure)
ConnectionStrings__Default=Server=tcp:futbol-saas-server.database.windows.net,1433;Initial Catalog=futbol-saas-db;Persist Security Info=False;User ID=futboladmin;Password=TuPassword123!;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;

# JWT (genera una clave segura)
Jwt__Key=TuClaveSecretaMuyLargaYSegura123456789012345678901234567890
Jwt__Issuer=Futbol.Api
Jwt__Audience=Futbol.Web
Jwt__ExpiresMinutes=4320

# CORS (actualizarás esto después con la URL de Vercel)
Cors__AllowedOrigins__0=https://tu-app.vercel.app
```

**⚠️ IMPORTANTE**:
- Reemplaza la connection string con la real de Azure
- Genera una clave JWT segura (mínimo 32 caracteres)
- La URL de CORS la actualizarás después de desplegar el frontend

### Paso 5: Desplegar

1. Click en **"Create Web Service"**
2. Render comenzará a construir y desplegar tu backend
3. Espera 5-10 minutos para que termine
4. Una vez listo, Render te dará una URL como: `https://futbol-api.onrender.com`
5. **Guarda esta URL**, la necesitarás para Vercel

### Paso 6: Ejecutar Migraciones

1. En Render, ve a la pestaña **"Shell"**
2. Ejecuta:
   ```bash
   cd api/Futbol.Api
   dotnet ef database update
   ```
   O si tienes acceso SSH, puedes conectarte y ejecutar las migraciones manualmente.

**Alternativa**: Puedes ejecutar las migraciones desde tu máquina local apuntando a Azure:
```bash
cd api/Futbol.Api
dotnet ef database update --connection "tu-connection-string-de-azure"
```

---

## 🎨 Parte 3: Desplegar Frontend en Vercel

### Paso 1: Crear cuenta en Vercel

1. Ve a https://vercel.com
2. Regístrate con GitHub (recomendado)
3. Autoriza a Vercel a acceder a tus repositorios

### Paso 2: Importar proyecto

1. En el dashboard de Vercel, click en **"Add New"** → **"Project"**
2. Selecciona tu repositorio de GitHub
3. Vercel detectará automáticamente que es Next.js

### Paso 3: Configurar el proyecto

Configuración:
- **Framework Preset**: Next.js (debería detectarse automáticamente)
- **Root Directory**: `web` (cambia esto, ya que tu Next.js está en la carpeta `web/`)
- **Build Command**: `npm run build` (o `cd web && npm run build`)
- **Output Directory**: `.next` (dejar por defecto)
- **Install Command**: `npm install` (o `cd web && npm install`)

### Paso 4: Variables de Entorno

En la sección **"Environment Variables"**, agrega:

```env
NEXT_PUBLIC_API_URL=https://futbol-api.onrender.com
```

**⚠️ IMPORTANTE**: Reemplaza `https://futbol-api.onrender.com` con la URL real de tu backend en Render.

### Paso 5: Desplegar

1. Click en **"Deploy"**
2. Espera 2-5 minutos para que termine el build
3. Una vez listo, Vercel te dará una URL como: `https://futbol-saas.vercel.app`
4. **Guarda esta URL**

---

## 🔧 Parte 4: Configurar CORS en Render

Ahora que tienes la URL de Vercel, actualiza el backend:

1. Ve a Render donde está tu backend
2. Ve a **"Environment"** → Edita las variables
3. Actualiza `Cors__AllowedOrigins__0` con tu URL de Vercel:
   ```
   Cors__AllowedOrigins__0=https://futbol-saas.vercel.app
   ```
4. Guarda los cambios
5. Render reiniciará automáticamente el servicio

---

## ✅ Verificación Final

### 1. Probar el Backend

Abre en tu navegador:
```
https://tu-backend.onrender.com/ping
```

Deberías ver: `"ok"`

### 2. Probar el Frontend

Abre tu URL de Vercel:
```
https://tu-app.vercel.app
```

Deberías ver la página de login.

### 3. Probar el Login

1. Intenta registrarte con un nuevo usuario
2. Si funciona, el backend está conectado correctamente
3. Si hay errores, revisa los logs en Render

---

## 🔍 Solución de Problemas

### Error: "Cannot connect to API"

**Solución**:
- Verifica que `NEXT_PUBLIC_API_URL` esté configurado en Vercel
- Verifica que el backend esté corriendo en Render (ve a "Events" para ver el estado)
- Revisa los logs en Render para ver errores

### Error CORS

**Solución**:
- Asegúrate de que la URL de Vercel esté en `Cors__AllowedOrigins__0` en Render
- Verifica que no haya espacios extra en la URL
- Reinicia el servicio en Render después de cambiar las variables

### Error de Base de Datos

**Solución**:
- Verifica la connection string de Azure (debe tener la contraseña correcta)
- Asegúrate de que el firewall de Azure permita conexiones desde Render
- Verifica que las migraciones se hayan ejecutado correctamente
- Revisa los logs en Render para ver el error específico

### Build falla en Vercel

**Solución**:
- Verifica que `Root Directory` esté en `web`
- Revisa los logs de build en Vercel
- Asegúrate de que `package.json` esté en la carpeta `web/`

### Backend no inicia en Render

**Solución**:
- Verifica que `Root Directory` esté en `api/Futbol.Api`
- Verifica que el `Start Command` sea correcto
- Revisa los logs en Render para ver el error específico
- Asegúrate de que todas las variables de entorno estén configuradas

### Base de datos Azure se pausa

**Solución**:
- Azure SQL Serverless se pausa después de inactividad
- La primera conexión después de pausarse puede tardar unos segundos
- Considera cambiar a un tier que no se pause si necesitas disponibilidad constante

---

## 📝 Notas Importantes

1. **Azure Trial**: 
   - El trial de Azure dura 30 días
   - Después necesitarás una suscripción de pago
   - Considera migrar a otra base de datos gratuita después (como PostgreSQL en Render)

2. **Render Free Tier**:
   - El servicio se suspende después de 15 minutos de inactividad
   - La primera petición después de suspender puede tardar 30-60 segundos
   - Para evitar esto, considera el plan de pago o usa un servicio de "ping" para mantenerlo activo

3. **Vercel Free Tier**:
   - Perfecto para proyectos personales
   - Despliegues automáticos en cada push a `main`
   - Sin limitaciones de tiempo de ejecución

4. **Seguridad**:
   - Nunca subas `.env` o connection strings al repositorio
   - Usa variables de entorno en ambas plataformas
   - Genera claves JWT seguras y únicas

5. **Actualizaciones**:
   - Cada push a `main` desplegará automáticamente en Vercel
   - Render también puede tener auto-deploy activado (verifica en Settings)

---

## 🔄 Flujo de Actualización

1. Haz tus cambios en el código
2. `git add .`
3. `git commit -m "Descripción de cambios"`
4. `git push origin main`
5. Vercel desplegará automáticamente (2-5 minutos)
6. Render también desplegará si tienes auto-deploy activado

---

## 💰 Costos Estimados

- **Vercel**: Gratis (hasta cierto límite de uso)
- **Render**: Gratis (con limitaciones de suspensión)
- **Azure SQL**: Gratis durante el trial (30 días), luego ~$5-15/mes según uso

**Alternativa gratuita después del trial de Azure**:
- Usa PostgreSQL en Render (gratis)
- Necesitarás cambiar el código para usar PostgreSQL en lugar de SQL Server

---

## 🎉 ¡Listo!

Tu aplicación debería estar funcionando en producción. Si encuentras algún problema, revisa los logs en cada plataforma para identificar el error específico.

