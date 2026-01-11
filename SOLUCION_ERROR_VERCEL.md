# Solución de Error en Vercel Build

## Problema Común: Variables de Entorno Faltantes

El error más común al hacer deploy en Vercel es que faltan las variables de entorno de Supabase.

## Solución Paso a Paso

### 1. Configurar Variables de Entorno en Vercel

1. Ve a tu proyecto en Vercel: https://vercel.com/dashboard
2. Selecciona tu proyecto `FutbolStats`
3. Ve a **Settings** → **Environment Variables**
4. Agrega las siguientes variables:

```
NEXT_PUBLIC_SUPABASE_URL = https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = tu-anon-key-aqui
```

**Importante**: 
- Reemplaza `https://tu-proyecto.supabase.co` con tu URL real de Supabase
- Reemplaza `tu-anon-key-aqui` con tu anon key real de Supabase
- Asegúrate de seleccionar los ambientes: **Production**, **Preview**, y **Development**

### 2. Obtener las Credenciales de Supabase

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Settings** → **API**
4. Copia:
   - **Project URL** → Usa esto para `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → Usa esto para `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Hacer Redeploy

Después de agregar las variables de entorno:

1. Ve a la pestaña **Deployments** en Vercel
2. Haz clic en los tres puntos (...) del último deployment
3. Selecciona **Redeploy**
4. O simplemente haz un nuevo commit y push a GitHub

## Verificar el Error Completo

Si el error persiste, necesitamos ver el error completo. En Vercel:

1. Ve a **Deployments**
2. Haz clic en el deployment que falló
3. Revisa los **Build Logs** completos
4. Busca el error específico (generalmente aparece después de "Compiled successfully")

## Errores Comunes y Soluciones

### Error: "Missing Supabase environment variables"
**Solución**: Agregar las variables de entorno como se describe arriba

### Error: "Module not found"
**Solución**: Verificar que todas las dependencias estén en `package.json` y ejecutar `npm install` localmente

### Error: "Type error" o "TypeScript error"
**Solución**: Ejecutar `npm run build` localmente para ver el error específico y corregirlo

### Error durante "Generating static pages"
**Solución**: Verificar que no haya código que intente acceder a APIs durante el build. Todas las llamadas a Supabase deben estar dentro de componentes "use client" o en funciones que solo se ejecutan en el cliente.

## Verificación Local

Antes de hacer deploy, verifica que el build funciona localmente:

```bash
cd web
npm run build
```

Si el build local funciona pero falla en Vercel, generalmente es un problema de variables de entorno.

## Checklist de Configuración en Vercel

- [ ] Root Directory configurado como `web`
- [ ] Framework Preset: Next.js (debería detectarse automáticamente)
- [ ] Build Command: `npm run build` (por defecto)
- [ ] Output Directory: `.next` (por defecto)
- [ ] Variables de entorno configuradas:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Variables disponibles para Production, Preview y Development

## Si el Error Persiste

Comparte el error completo del build log de Vercel. El error generalmente aparece después de:
- "Compiled successfully"
- "Generating static pages"
- "Collecting page data"

El mensaje de error específico nos ayudará a identificar el problema exacto.
