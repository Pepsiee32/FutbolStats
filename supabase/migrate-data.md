# Guía de Migración de Datos a Supabase

## Paso 1: Crear el Esquema

Ejecuta el archivo SQL de migración en Supabase:

1. Ve a tu proyecto en Supabase
2. Ve a SQL Editor
3. Copia y pega el contenido de `supabase/migrations/001_create_matches.sql`
4. Ejecuta el script

## Paso 2: Migrar Usuarios

**IMPORTANTE**: No se pueden migrar passwords hasheados directamente. Tienes dos opciones:

### Opción A: Forzar Reset de Password (Recomendado)

1. Exporta los usuarios de tu base de datos actual:
```sql
SELECT id, email FROM "AspNetUsers";
```

2. Para cada usuario, crea una cuenta en Supabase Auth usando el Admin API o la interfaz web
3. Envía un email de reset de password a cada usuario

### Opción B: Script de Migración con Password Temporal

Usa el script `migrate-users.js` (ver abajo) para crear usuarios con password temporal.

## Paso 3: Migrar Partidos

1. Exporta los partidos de tu base de datos actual:
```sql
SELECT 
  id,
  "UserId",
  date,
  opponent,
  format,
  goals,
  assists,
  result,
  "IsMvp",
  notes,
  "CreatedAt",
  "UpdatedAt"
FROM "Matches";
```

2. Mapea los `UserId` de ASP.NET Identity a los `id` de Supabase Auth
3. Importa los datos usando el script `migrate-matches.js` o directamente en SQL

## Scripts de Migración

### migrate-users.js

```javascript
// Ejecutar con: node migrate-users.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Lista de usuarios a migrar (desde tu BD actual)
const users = [
  { id: 'old-user-id-1', email: 'user1@example.com' },
  { id: 'old-user-id-2', email: 'user2@example.com' },
  // ...
];

async function migrateUsers() {
  for (const user of users) {
    try {
      // Crear usuario con password temporal
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: 'TempPassword123!', // Cambiar después del primer login
        email_confirm: true,
      });

      if (error) {
        console.error(`Error creando usuario ${user.email}:`, error);
      } else {
        console.log(`Usuario creado: ${user.email} -> ${data.user.id}`);
        // Guardar el mapeo: user.id (old) -> data.user.id (new)
      }
    } catch (err) {
      console.error(`Error procesando ${user.email}:`, err);
    }
  }
}

migrateUsers();
```

### migrate-matches.js

```javascript
// Ejecutar con: node migrate-matches.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Mapeo de UserId antiguo a nuevo (desde migrate-users.js)
const userIdMap = {
  'old-user-id-1': 'new-user-id-1',
  'old-user-id-2': 'new-user-id-2',
  // ...
};

// Partidos a migrar (desde tu BD actual)
const matches = [
  {
    id: 'match-id-1',
    UserId: 'old-user-id-1',
    date: '2024-01-01T00:00:00Z',
    opponent: 'Equipo Rival',
    format: 8,
    goals: 2,
    assists: 1,
    result: 1,
    IsMvp: false,
    notes: 'Buen partido',
    CreatedAt: '2024-01-01T00:00:00Z',
    UpdatedAt: '2024-01-01T00:00:00Z',
  },
  // ...
];

async function migrateMatches() {
  for (const match of matches) {
    try {
      const newUserId = userIdMap[match.UserId];
      if (!newUserId) {
        console.warn(`No se encontró mapeo para UserId: ${match.UserId}`);
        continue;
      }

      const { data, error } = await supabase
        .from('matches')
        .insert({
          id: match.id, // Mantener el mismo ID si es posible
          user_id: newUserId,
          date: match.date,
          opponent: match.opponent,
          format: match.format,
          goals: match.goals,
          assists: match.assists,
          result: match.result,
          is_mvp: match.IsMvp,
          notes: match.notes,
          created_at: match.CreatedAt,
          updated_at: match.UpdatedAt,
        })
        .select();

      if (error) {
        console.error(`Error insertando partido ${match.id}:`, error);
      } else {
        console.log(`Partido migrado: ${match.id}`);
      }
    } catch (err) {
      console.error(`Error procesando partido ${match.id}:`, err);
    }
  }
}

migrateMatches();
```

## Notas Importantes

1. **Backup**: Siempre haz backup de tus datos antes de migrar
2. **Testing**: Prueba la migración en un entorno de desarrollo primero
3. **Passwords**: Los usuarios necesitarán resetear sus passwords
4. **IDs**: Si quieres mantener los mismos IDs de partidos, asegúrate de que sean UUIDs válidos
