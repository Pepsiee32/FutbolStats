Pruebas:
cd web
npm run dev

 Plan de Pruebas - FutbolStats

## 1. Pruebas de Autenticación

### 1.1 Registro de Usuario

- [ ] **Registro exitoso**: Crear cuenta con email y contraseña válida
  - Verificar que se redirige a `/login` después del registro
  - Verificar que se crea el usuario en `auth.users` de Supabase
  - Verificar que se crea automáticamente un perfil en la tabla `profiles`
- [ ] **Validación de contraseña**: Intentar registrar con contraseña que no cumple requisitos
  - Menos de 6 caracteres
  - Sin números
  - Sin mayúsculas
  - Sin minúsculas
- [ ] **Contraseñas no coinciden**: Ingresar contraseñas diferentes en los campos
- [ ] **Email duplicado**: Intentar registrar con un email ya existente
- [ ] **Campos vacíos**: Intentar registrar sin completar todos los campos

### 1.2 Login

- [ ] **Login exitoso**: Iniciar sesión con credenciales válidas
  - Verificar redirección a página principal (`/`)
  - Verificar que el usuario aparece en el menú
- [ ] **Credenciales incorrectas**: Intentar login con email o contraseña incorrecta
- [ ] **Email no existe**: Intentar login con email no registrado
- [ ] **Campos vacíos**: Intentar login sin completar campos
- [ ] **Persistencia de sesión**: Cerrar y abrir el navegador, verificar que la sesión persiste

### 1.3 Recuperación de Contraseña

- [ ] **Solicitar recuperación**: Ingresar email válido en `/forgot-password`
  - Verificar mensaje de éxito
  - Verificar aviso sobre revisar SPAM
- [ ] **Email no existe**: Intentar recuperar contraseña con email no registrado
- [ ] **Proceso completo**: 
  - Solicitar recuperación
  - Abrir el enlace del email
  - Verificar que se carga `/reset-password` correctamente
  - Cambiar la contraseña
  - Verificar que se puede hacer login con la nueva contraseña
- [ ] **Token expirado**: Intentar usar un enlace de recuperación expirado
- [ ] **Validación de nueva contraseña**: Intentar cambiar a contraseña que no cumple requisitos

### 1.4 Logout

- [ ] **Logout exitoso**: Cerrar sesión desde el menú de usuario
  - Verificar redirección a `/login`
  - Verificar que no se puede acceder a rutas protegidas

### 1.5 Protección de Rutas

- [ ] **Acceso sin autenticación**: Intentar acceder a `/` sin estar logueado
  - Verificar redirección a `/login`

## 2. Pruebas de Gestión de Partidos

### 2.1 Crear Partido (Desde página principal)

- [ ] **Crear partido completo**: 
  - Completar todos los campos (fecha, rival, formato, resultado, goles, asistencias, MVP, notas)
  - Verificar que se guarda correctamente
  - Verificar que aparece en la lista de partidos
  - Verificar que se actualizan las estadísticas
- [ ] **Crear partido mínimo**: Solo con campos requeridos
- [ ] **Validaciones de campos**:
  - Fecha requerida
  - Rival requerido (si aplica)
  - Goles requeridos (si aplica)
  - Asistencias requeridas (si aplica)
  - Notas con límite de 100 caracteres
- [ ] **Formato de fecha**: Verificar que acepta diferentes formatos de fecha
- [ ] **Valores numéricos**: 
  - Goles y asistencias solo números positivos
  - Formato solo valores permitidos (5, 7, 8, 11)
  - Resultado solo valores permitidos (-1, 0, 1)

### 2.3 Ver Partidos

- [ ] **Lista de partidos**: Verificar que se muestran todos los partidos del usuario
- [ ] **Ordenamiento**: Verificar que los partidos se muestran ordenados por fecha (más recientes primero)
- [ ] **Formato de fecha**: Verificar que las fechas se muestran correctamente formateadas
- [ ] **Colores por resultado**: 
  - Verde para ganado
  - Gris para empatado
  - Rojo para perdido
- [ ] **MVP destacado**: Verificar que los partidos MVP se muestran correctamente

### 2.4 Editar Partido

- [ ] **Editar partido existente**: 
  - Abrir modal de edición
  - Modificar campos
  - Guardar cambios
  - Verificar que se actualiza en la lista
- [ ] **Validaciones en edición**: Aplicar mismas validaciones que en creación
- [ ] **Cancelar edición**: Cerrar modal sin guardar cambios

### 2.5 Eliminar Partido

- [ ] **Eliminar partido**: 
  - Confirmar eliminación
  - Verificar que desaparece de la lista
  - Verificar que se actualizan las estadísticas
- [ ] **Cancelar eliminación**: Cerrar modal sin eliminar

### 2.6 Filtros y Búsqueda

- [ ] **Filtrar por formato**: 
  - Fútbol 5
  - Fútbol 7
  - Fútbol 8
  - Fútbol 11
  - Todos
- [ ] **Buscar por rival**: 
  - Búsqueda exacta
  - Búsqueda parcial
  - Búsqueda con múltiples palabras
  - Búsqueda que no encuentra resultados
- [ ] **Combinar filtros**: Filtrar por formato Y buscar por rival simultáneamente

## 3. Pruebas de Estadísticas

### 3.1 Pestaña Estadísticas

- [ ] **Navegación a pestaña**: Verificar que se puede acceder a la pestaña "Stats"
- [ ] **Sub-pestañas**: 
  - Perfil
  - Ataque
  - Canchas

### 3.2 Estadísticas - Perfil

- [ ] **Gráfico Radar**: Verificar que se muestra correctamente
- [ ] **Datos correctos**: Verificar que los valores reflejan los partidos registrados
- [ ] **Filtro por formato**: Verificar que al filtrar se actualizan las estadísticas

### 3.3 Estadísticas - Ataque

- [ ] **Gráficos de ataque**: Verificar visualización correcta
- [ ] **Datos de goles y asistencias**: Verificar cálculos correctos

### 3.4 Estadísticas - Canchas

- [ ] **Gráficos de canchas**: Verificar visualización correcta
- [ ] **Datos por formato**: Verificar que se muestran correctamente por tipo de cancha

### 3.5 Filtros en Estadísticas

- [ ] **Filtrar por formato**: Verificar que los gráficos se actualizan
- [ ] **Filtro "Todos"**: Verificar que muestra estadísticas globales

## 4. Pruebas de Logros

### 4.1 Sistema de Logros

- [ ] **Visualización de logros**: Verificar que se muestran en la pestaña "Logros"
- [ ] **Progreso de logros**: Verificar que se muestra el progreso correcto
- [ ] **Desbloqueo de logros**: 
  - Verificar que se desbloquean al alcanzar objetivos
  - Verificar que se muestran como desbloqueados
- [ ] **Logros específicos**: 
  - Primer partido
  - 10 partidos
  - 50 partidos
  - 100 partidos
  - Primer gol
  - Primer MVP
  - Etc.

## 5. Pruebas de Seguridad

### 5.1 Row Level Security (RLS)

- [ ] **Aislamiento de datos**: 
  - Usuario A solo ve sus propios partidos
  - Usuario B solo ve sus propios partidos
  - Usuario A no puede ver partidos de Usuario B
- [ ] **Crear partido**: Verificar que el `user_id` se asigna automáticamente
- [ ] **Editar partido**: Verificar que solo se pueden editar propios partidos
- [ ] **Eliminar partido**: Verificar que solo se pueden eliminar propios partidos

### 5.2 Autenticación

- [ ] **Sesión expirada**: Verificar comportamiento cuando la sesión expira
- [ ] **Token inválido**: Verificar manejo de tokens inválidos

## 6. Pruebas de UI/UX

### 6.1 Navegación

- [ ] **Tabs principales**: 
  - Inicio
  - Stats
  - Logros
  - Historial
- [ ] **Menú de usuario**: 
  - Abrir/cerrar menú
  - Ver email del usuario
  - Opción de logout

### 6.2 Responsive Design

- [ ] **Desktop**: Verificar que se ve correctamente en pantallas grandes
- [ ] **Tablet**: Verificar que se adapta a tablets
- [ ] **Mobile**: Verificar que se adapta a móviles

### 6.3 Mensajes y Feedback

- [ ] **Toasts de éxito**: Verificar que aparecen al guardar/editar/eliminar
- [ ] **Mensajes de error**: Verificar que se muestran correctamente
- [ ] **Estados de carga**: Verificar que se muestran durante operaciones asíncronas

## 7. Pruebas de Integración

### 7.1 Integración con Supabase

- [ ] **Conexión a Supabase**: Verificar que se conecta correctamente
- [ ] **Variables de entorno**: Verificar que están configuradas correctamente
- [ ] **Manejo de errores de red**: Verificar comportamiento cuando hay problemas de conexión

### 7.2 Migraciones de Base de Datos

- [ ] **Tabla profiles**: Verificar que existe y funciona correctamente
- [ ] **Tabla matches**: Verificar que existe y funciona correctamente
- [ ] **Triggers**: Verificar que el trigger de `user_id` funciona correctamente

## 8. Pruebas de Casos Límite

### 8.1 Datos Extremos

- [ ] **Muchos partidos**: Crear 50+ partidos y verificar rendimiento
- [ ] **Notas muy largas**: Intentar ingresar notas de exactamente 100 caracteres
- [ ] **Fechas extremas**: 
  - Fecha muy antigua
  - Fecha futura (debe estar limitada a hoy)
- [ ] **Valores numéricos grandes**: Goles y asistencias con valores muy altos

### 8.2 Estados Vacíos

- [ ] **Sin partidos**: Verificar que la aplicación funciona sin partidos registrados
- [ ] **Sin estadísticas**: Verificar que los gráficos se muestran correctamente sin datos

## 9. Pruebas de Regresión

### 9.1 Flujos Completos

- [ ] **Flujo completo de usuario nuevo**:
  1. Registrarse
  2. Login
  3. Crear primer partido
  4. Ver estadísticas
  5. Editar partido
  6. Crear más partidos
  7. Ver logros
  8. Logout

- [ ] **Flujo de usuario existente**:
  1. Login
  2. Ver partidos existentes
  3. Crear nuevo partido
  4. Editar partido
  5. Eliminar partido
  6. Ver estadísticas actualizadas

## 10. Checklist de Configuración

### 10.1 Supabase

- [ ] Migraciones ejecutadas correctamente
- [ ] RLS habilitado y funcionando
- [ ] Triggers creados
- [ ] Políticas de seguridad configuradas

### 10.2 Variables de Entorno

- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurada
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurada
- [ ] Variables configuradas en Vercel (producción)

### 10.3 Autenticación en Supabase

- [ ] Email provider habilitado
- [ ] Confirmación de email desactivada (si aplica)
- [ ] URLs de redirección configuradas

## Notas de Pruebas

- **Ambiente de pruebas**: Usar datos de prueba, no datos de producción
- **Limpieza**: Considerar limpiar datos de prueba después de las pruebas
- **Documentación**: Documentar cualquier bug encontrado con pasos para reproducirlo
- **Priorización**: Enfocarse primero en funcionalidades críticas (autenticación, CRUD de partidos)
