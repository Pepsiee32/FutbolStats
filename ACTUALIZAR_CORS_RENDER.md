# 🔧 Actualizar CORS en Render

El backend en Render necesita tener la configuración de CORS actualizada para permitir el dominio de Vercel.

## Pasos para Actualizar CORS en Render

### Opción 1: Usar Variables de Entorno (Recomendado)

1. Ve a tu dashboard de Render: https://dashboard.render.com
2. Selecciona tu servicio del backend (`futbolsaas-1`)
3. Ve a la sección **"Environment"**
4. Agrega o actualiza las siguientes variables de entorno:

```
Cors__AllowedOrigins__0=http://localhost:3000
Cors__AllowedOrigins__1=https://statsfutbolpro.vercel.app
Cors__AllowedOrigins__2=https://futbol-saas-posta.vercel.app
```

**Nota**: En .NET, los arrays en variables de entorno usan doble guión bajo (`__`) y números (`__0`, `__1`, etc.)

5. Guarda los cambios
6. Render reiniciará automáticamente el servicio

### Opción 2: Actualizar el Código y Redesplegar

Si prefieres mantener la configuración en el código:

1. Asegúrate de que `appsettings.json` tenga los dominios correctos:
```json
{
  "Cors": {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://statsfutbolpro.vercel.app",
      "https://futbol-saas-posta.vercel.app"
    ]
  }
}
```

2. Haz commit y push de los cambios
3. Render detectará automáticamente el cambio y redesplegará

## Verificación

Después de actualizar, verifica que CORS funcione:

1. Abre la consola del navegador en `https://statsfutbolpro.vercel.app`
2. Intenta hacer login
3. No deberías ver errores de CORS

## Solución de Problemas

### Si aún ves errores de CORS:

1. **Verifica que el dominio sea exacto**: 
   - Debe ser `https://statsfutbolpro.vercel.app` (con `https://`)
   - Sin espacios al inicio o final
   - Sin barras al final (`/`)

2. **Verifica que Render haya reiniciado**:
   - Ve a "Events" en Render para ver si el servicio se reinició

3. **Verifica los logs de Render**:
   - Ve a "Logs" para ver si hay errores de configuración

4. **Limpia la caché del navegador**:
   - A veces el navegador cachea las respuestas CORS

## Dominios de Vercel

Vercel puede generar múltiples URLs:
- **Producción**: `https://statsfutbolpro.vercel.app`
- **Preview**: URLs como `https://statsfutbolpro-git-main-tu-usuario.vercel.app`

Si necesitas permitir URLs de preview, agrega:
```
Cors__AllowedOrigins__3=https://*.vercel.app
```

**Nota**: Los wildcards (`*`) no funcionan con `AllowCredentials()`. Necesitas agregar cada dominio específico.
