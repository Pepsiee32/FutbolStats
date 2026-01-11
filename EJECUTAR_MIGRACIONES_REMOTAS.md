# Ejecutar Migraciones contra Base de Datos Remota (Neon/Vercel)

## ✅ Sí, puedes ejecutar las migraciones desde tu máquina local

Entity Framework Core permite ejecutar migraciones contra una base de datos remota usando la cadena de conexión configurada en `appsettings.json`.

## Pasos para ejecutar las migraciones

### 1. Verificar que .NET SDK esté instalado

```powershell
dotnet --version
```

Si no está instalado, sigue las instrucciones en `INSTALAR_DOTNET.md`

### 2. Instalar las herramientas de Entity Framework (si es necesario)

```powershell
dotnet tool install --global dotnet-ef
```

### 3. Ejecutar las migraciones contra la base de datos remota

Desde la carpeta `api/Futbol.Api`:

```powershell
cd api\Futbol.Api
dotnet ef database update
```

**Esto usará automáticamente la cadena de conexión de `appsettings.json`**, que apunta a tu base de datos Neon remota:
```
Host=ep-calm-poetry-adpqicy6-pooler.c-2.us-east-1.aws.neon.tech
Database=neondb
```

## Alternativa: Especificar la cadena de conexión directamente

Si quieres usar una cadena de conexión diferente o especificarla explícitamente:

```powershell
dotnet ef database update --connection "Host=ep-calm-poetry-adpqicy6-pooler.c-2.us-east-1.aws.neon.tech;Database=neondb;Username=neondb_owner;Password=npg_TiHxNGv3a1hX;Port=5432;SSL Mode=Require;Trust Server Certificate=true"
```

## Verificar que las migraciones se ejecutaron

Después de ejecutar `dotnet ef database update`, deberías ver un mensaje como:

```
Applying migration '20260102232604_Initial'.
Applying migration '20260105034317_AddResultAndMvpToMatch'.
Applying migration '20260105044950_RemoveLocationFromMatches'.
Done.
```

## Notas importantes

1. **La base de datos está en Neon (remota)**: Las migraciones se ejecutarán directamente contra tu base de datos de producción en Neon, no contra una base de datos local.

2. **Conexión segura**: La cadena de conexión usa SSL (`SSL Mode=Require`), así que la conexión es segura.

3. **Primera ejecución**: Si es la primera vez que ejecutas las migraciones, se crearán todas las tablas desde cero.

4. **Migraciones incrementales**: Si ya hay algunas tablas, solo se aplicarán las migraciones pendientes.

## Solución de problemas

### Error: "No se puede conectar al servidor"
- Verifica que la cadena de conexión en `appsettings.json` sea correcta
- Asegúrate de tener conexión a internet
- Verifica que la base de datos Neon esté activa

### Error: "dotnet ef no se reconoce"
- Instala las herramientas: `dotnet tool install --global dotnet-ef`
- Reinicia la terminal después de instalar

### Error: "Migration already applied"
- Esto es normal si las migraciones ya se ejecutaron antes
- Puedes verificar el estado con: `dotnet ef migrations list`

## Comandos útiles

```powershell
# Ver migraciones pendientes
dotnet ef migrations list

# Ver el estado de la base de datos
dotnet ef database update --dry-run

# Revertir última migración (CUIDADO: puede perder datos)
dotnet ef database update <nombre-migracion-anterior>
```
