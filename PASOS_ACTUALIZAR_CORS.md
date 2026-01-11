# 📋 Pasos Exactos para Actualizar CORS en Render

## ⚡ Pasos Rápidos (5 minutos)

### 1. Acceder a Render
1. Abre tu navegador
2. Ve a: https://dashboard.render.com
3. Inicia sesión con tu cuenta

### 2. Encontrar tu Servicio
1. En el dashboard, busca el servicio llamado `futbolsaas-1` o similar
2. Haz clic en el nombre del servicio

### 3. Ir a Environment Variables
1. En el menú lateral izquierdo, haz clic en **"Environment"**
2. O busca la pestaña/sección **"Environment Variables"**

### 4. Agregar/Actualizar Variables
Haz clic en **"Add Environment Variable"** o edita las existentes y agrega estas **3 variables**:

```
Nombre: Cors__AllowedOrigins__0
Valor: http://localhost:3000
```

```
Nombre: Cors__AllowedOrigins__1
Valor: https://statsfutbolpro.vercel.app
```

```
Nombre: Cors__AllowedOrigins__2
Valor: https://futbol-saas-posta.vercel.app
```

**⚠️ IMPORTANTE**: 
- Usa **doble guión bajo** (`__`) entre `Cors` y `AllowedOrigins`
- Usa **doble guión bajo** (`__`) y un **número** (`__0`, `__1`, `__2`)
- **NO** uses espacios
- **NO** uses guiones simples (`-`)

### 5. Guardar y Esperar
1. Haz clic en **"Save Changes"** o **"Update"**
2. Render mostrará un mensaje de que el servicio se reiniciará
3. Espera 1-2 minutos mientras Render reinicia el servicio
4. Puedes ver el progreso en la pestaña **"Events"** o **"Logs"**

### 6. Verificar
1. Ve a la pestaña **"Logs"** en Render
2. Busca mensajes como "Application started" o "Now listening on"
3. Una vez que veas que el servicio está corriendo, prueba el login desde Vercel

## 🔍 Capturas de Pantalla (Referencia)

### Ubicación de Environment Variables
```
Dashboard → Tu Servicio → Environment (menú lateral)
```

### Formato de las Variables
```
┌─────────────────────────┬─────────────────────────────────────┐
│ Nombre                  │ Valor                               │
├─────────────────────────┼─────────────────────────────────────┤
│ Cors__AllowedOrigins__0 │ http://localhost:3000              │
│ Cors__AllowedOrigins__1 │ https://statsfutbolpro.vercel.app  │
│ Cors__AllowedOrigins__2 │ https://futbol-saas-posta.vercel.app│
└─────────────────────────┴─────────────────────────────────────┘
```

## ✅ Verificación Final

Después de que Render reinicie:

1. Abre `https://statsfutbolpro.vercel.app` en tu navegador
2. Abre la consola del navegador (F12 → Console)
3. Intenta hacer login
4. **NO** deberías ver errores de CORS como:
   - ❌ "Access to fetch... has been blocked by CORS policy"
   - ❌ "No 'Access-Control-Allow-Origin' header"

Si ves estos errores, verifica:
- Que las variables estén escritas exactamente como se muestra arriba
- Que Render haya terminado de reiniciar (ve a "Events")
- Que no haya espacios extra en los valores

## 🆘 Si Algo Sale Mal

### Error: "Variable already exists"
- Simplemente edita la variable existente en lugar de crear una nueva

### Error: "Invalid format"
- Verifica que uses `__` (doble guión bajo) y no `_` (simple) o `-` (guión)

### El servicio no reinicia
- Ve a "Events" y busca errores
- Intenta hacer "Manual Deploy" desde el menú

## 📞 ¿Necesitas Ayuda?

Si después de seguir estos pasos aún tienes problemas:
1. Verifica los logs de Render (pestaña "Logs")
2. Verifica la consola del navegador para ver el error exacto
3. Asegúrate de que el dominio de Vercel sea exactamente: `https://statsfutbolpro.vercel.app`
