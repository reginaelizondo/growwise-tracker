# 📋 Checklist de Migración a Supabase Personal

## ✅ Proyecto: `uslivvopgsrajcxxjftw`

---

## **Fase 1: Configuración Inicial** ⚙️

### 1.1 Archivos Actualizados Automáticamente ✓
- [x] `.env` - Actualizado con nuevas credenciales
- [x] `supabase/config.toml` - Actualizado con project_id

### 1.2 Verificar Credenciales
- [ ] Confirmar que `.env` contiene:
  - `VITE_SUPABASE_URL="https://uslivvopgsrajcxxjftw.supabase.co"`
  - `VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGc..."`
  - `VITE_SUPABASE_PROJECT_ID="uslivvopgsrajcxxjftw"`

---

## **Fase 2: Ejecutar Schema de Base de Datos** 🗄️

### 2.1 Conectar a tu Supabase Dashboard
1. [ ] Ir a: https://supabase.com/dashboard/project/uslivvopgsrajcxxjftw
2. [ ] Navegar a: **SQL Editor** → **New Query**

### 2.2 Ejecutar Schema Completo
1. [ ] Abrir archivo: `FULL_SCHEMA.sql`
2. [ ] Copiar TODO el contenido
3. [ ] Pegar en SQL Editor de Supabase
4. [ ] Hacer click en **"Run"** (Ejecutar)
5. [ ] Verificar que no haya errores (debería tomar ~5-10 segundos)

### 2.3 Verificar Tablas Creadas
Ejecutar este query para verificar:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Deberías ver:
- [ ] `profiles`
- [ ] `babies`
- [ ] `assessments`
- [ ] `assessment_responses`
- [ ] `milestones`
- [ ] `milestone_updates`
- [ ] `skill_percentile_curves`
- [ ] `skill_probability_curves`

---

## **Fase 3: Cargar Datos** 📊

### 3.1 Opción A: Cargar Milestones (96 registros)

**Método 1: SQL Editor (Recomendado)**
1. [ ] Obtener datos de milestones desde el proyecto actual:
   - Conectar a `dxnzccqnpdzncrokihur.supabase.co`
   - Ejecutar: `SELECT * FROM milestones;`
   - Exportar como SQL INSERT statements
2. [ ] Ejecutar los INSERT en tu nuevo proyecto

**Método 2: Table Editor**
1. [ ] Dashboard → **Table Editor** → `milestones`
2. [ ] Click **"Insert"** → **"Import CSV"**
3. [ ] Subir archivo CSV con los 96 milestones

### 3.2 Opción B: Cargar skill_percentile_curves (22,500 registros)

**Método 1: psql (Más Rápido)**
```bash
# Conectar a tu base de datos
psql "postgresql://postgres:[TU_PASSWORD]@db.uslivvopgsrajcxxjftw.supabase.co:5432/postgres"

# Cargar desde CSV
\COPY skill_percentile_curves(skill_id, skill_name, age_months, percentile, probability, locale) 
FROM 'skill_percentile_curves.csv' 
CSV HEADER;
```

**Método 2: SQL Editor (En Batches)**
1. [ ] Dividir los 22,500 registros en batches de 1000
2. [ ] Ejecutar múltiples queries:
```sql
INSERT INTO skill_percentile_curves (skill_id, skill_name, age_months, percentile, probability, locale) VALUES
(2, 'Secure Attachment', 0, 0.01, 0.0800, 'en'),
(2, 'Secure Attachment', 0, 0.02, 0.0800, 'en'),
-- ... continuar hasta 1000 filas
-- Repetir 22 veces
```

**Método 3: Script Node.js**
Usar el script existente `generate_probability_sql.js`:
```bash
node generate_probability_sql.js
# Genera load_9_probability_curves.sql
# Ejecutar ese archivo en SQL Editor
```

### 3.3 Verificar Datos Cargados
```sql
-- Verificar milestones
SELECT COUNT(*) FROM milestones; -- Debe ser 96

-- Verificar skill_percentile_curves
SELECT COUNT(*) FROM skill_percentile_curves; -- Debe ser ~22,500

-- Verificar distribución por skill
SELECT skill_name, COUNT(*) 
FROM skill_percentile_curves 
GROUP BY skill_name;
```

---

## **Fase 4: Configurar Secrets de Supabase** 🔐

### 4.1 Acceder a Edge Functions Settings
1. [ ] Dashboard → **Project Settings** → **Edge Functions**
2. [ ] Scroll hasta **"Secrets"**

### 4.2 Agregar Secrets Requeridos
Agregar los siguientes secrets (uno por uno):

1. [ ] **LOVABLE_API_KEY**
   - Valor: `[Tu LOVABLE_API_KEY del proyecto anterior]`
   - Usado por: `interpret-skill-results`, `interpret-area-results`, `generate-completion-insight`

2. [ ] **SUPABASE_URL**
   - Valor: `https://uslivvopgsrajcxxjftw.supabase.co`

3. [ ] **SUPABASE_ANON_KEY**
   - Valor: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzbGl2dm9wZ3NyYWpjeHhqZnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDcyMjksImV4cCI6MjA3NjgyMzIyOX0.d2E9PPtC0j5V3qDxHHw_y9Z9cQXOi2t5LWwIe9RqJhE`

4. [ ] **SUPABASE_SERVICE_ROLE_KEY**
   - Valor: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzbGl2dm9wZ3NyYWpjeHhqZnR3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTI0NzIyOSwiZXhwIjoyMDc2ODIzMjI5fQ.6G9yzyL_YW6_dEYx5Gvi0uEuKYEt2bWNHn-Xfivrqvo`

5. [ ] **SUPABASE_DB_URL** (Opcional - Solo si usas funciones con DB directo)
   - Valor: `postgresql://postgres:[PASSWORD]@db.uslivvopgsrajcxxjftw.supabase.co:5432/postgres`

6. [ ] **SUPABASE_PUBLISHABLE_KEY**
   - Valor: (mismo que SUPABASE_ANON_KEY)

---

## **Fase 5: Desplegar Edge Functions** 🚀

### 5.1 Verificar Configuración de Functions
1. [ ] Verificar que `supabase/config.toml` contiene:
```toml
[functions.interpret-skill-results]
verify_jwt = false

[functions.interpret-area-results]
verify_jwt = false

[functions.generate-completion-insight]
verify_jwt = false
```

### 5.2 Desplegar Functions
Las funciones se desplegarán automáticamente cuando hagas push al proyecto o puedes desplegarlas manualmente:

```bash
# Si tienes Supabase CLI instalado:
supabase functions deploy interpret-skill-results
supabase functions deploy interpret-area-results
supabase functions deploy generate-completion-insight
```

**O desde Lovable:**
- [ ] Las funciones se redesplegarán automáticamente al hacer cambios en el código

### 5.3 Verificar Funciones Desplegadas
1. [ ] Dashboard → **Edge Functions**
2. [ ] Verificar que aparezcan:
   - `interpret-skill-results`
   - `interpret-area-results`
   - `generate-completion-insight`
3. [ ] Estado: **"Active"** (verde)

---

## **Fase 6: Configurar Autenticación** 🔒

### 6.1 Habilitar Proveedores de Auth
1. [ ] Dashboard → **Authentication** → **Providers**
2. [ ] Habilitar **Email** (ya debería estar habilitado)
3. [ ] **Configurar Email Templates** (opcional):
   - Ir a **Email Templates**
   - Personalizar "Confirm Signup", "Reset Password", etc.

### 6.2 Configurar Auto-Confirm (IMPORTANTE)
1. [ ] Dashboard → **Authentication** → **Settings**
2. [ ] Desactivar **"Enable email confirmations"** (para desarrollo)
   - O configurar tu servidor SMTP para producción

### 6.3 Verificar Trigger de Perfiles
Ejecutar este query para confirmar que el trigger existe:
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

---

## **Fase 7: Pruebas Finales** 🧪

### 7.1 Probar Registro de Usuario
1. [ ] Ir a tu app (en desarrollo)
2. [ ] Crear una cuenta nueva
3. [ ] Verificar que se crea registro en:
   - `auth.users` (visible en Dashboard → Authentication → Users)
   - `public.profiles` (verificar con SQL Editor)

### 7.2 Probar Flujo de Assessment
1. [ ] Crear un bebé
2. [ ] Iniciar assessment
3. [ ] Verificar que se crean registros en:
   - `babies`
   - `assessments`
   - `assessment_responses`

### 7.3 Probar Edge Functions
Ejecutar test de función:
```bash
curl -X POST "https://uslivvopgsrajcxxjftw.supabase.co/functions/v1/generate-completion-insight" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{"babyName":"Test","babyAgeMonths":12,"areasData":[]}'
```

### 7.4 Verificar RLS Policies
Probar queries como usuario autenticado:
```sql
-- Conectar como user específico y probar:
SELECT * FROM babies; -- Solo debe ver sus propios bebés
SELECT * FROM milestones; -- Debe ver todos (público)
SELECT * FROM skill_percentile_curves; -- Debe ver todos (público)
```

---

## **Fase 8: Exportar Datos desde Proyecto Anterior** 📤

### 8.1 Obtener Datos de Milestones
Conectar al proyecto anterior y ejecutar:
```sql
COPY (
  SELECT milestone_id, age, area_id, area_name, skill_id, skill_name, 
         description, question, science_fact, source_data, locale
  FROM milestones
) TO '/tmp/milestones.csv' CSV HEADER;
```

### 8.2 Obtener Datos de Skill Percentile Curves
```sql
COPY (
  SELECT skill_id, skill_name, age_months, percentile, probability, locale
  FROM skill_percentile_curves
) TO '/tmp/skill_percentile_curves.csv' CSV HEADER;
```

### 8.3 Obtener Datos de Skill Probability Curves
```sql
COPY (
  SELECT skill_id, skill_name, age_months, mark_key, probability, locale
  FROM skill_probability_curves
) TO '/tmp/skill_probability_curves.csv' CSV HEADER;
```

---

## **Fase 9: Limpieza y Optimización** 🧹

### 9.1 Analizar Performance
```sql
-- Ver tamaño de tablas
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 9.2 Verificar Índices
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

---

## **✅ CHECKLIST FINAL**

- [ ] Schema completo ejecutado sin errores
- [ ] Todas las tablas creadas correctamente (8 tablas)
- [ ] Funciones de base de datos creadas (3 funciones)
- [ ] Triggers configurados (2 triggers)
- [ ] RLS policies aplicadas (todas las tablas)
- [ ] Datos cargados:
  - [ ] milestones (96 registros)
  - [ ] skill_percentile_curves (22,500 registros)
  - [ ] skill_probability_curves (opcional)
- [ ] Secrets configurados (6 secrets)
- [ ] Edge Functions desplegadas (3 funciones)
- [ ] Autenticación configurada
- [ ] Pruebas de registro de usuario exitosas
- [ ] Pruebas de assessment exitosas
- [ ] Edge Functions respondiendo correctamente
- [ ] RLS policies verificadas

---

## **🆘 Troubleshooting**

### Error: "relation already exists"
- Ejecutar `DROP TABLE IF EXISTS [nombre_tabla] CASCADE;` antes de crear

### Error: "permission denied for schema auth"
- No intentar modificar esquema `auth` directamente
- Usar funciones `SECURITY DEFINER` para acceder a `auth.users`

### Error: "infinite recursion detected in policy"
- Verificar que RLS policies no referencien la misma tabla recursivamente
- Usar funciones `SECURITY DEFINER` para queries complejos

### Edge Functions no responden
- Verificar que secrets estén configurados correctamente
- Revisar logs en Dashboard → Edge Functions → Logs

### No se crean perfiles al registrarse
- Verificar que trigger `on_auth_user_created` esté activo
- Verificar que función `handle_new_user()` exista

---

## **📚 Recursos**

- [Supabase Dashboard](https://supabase.com/dashboard/project/uslivvopgsrajcxxjftw)
- [Supabase Docs - Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Docs - Edge Functions](https://supabase.com/docs/guides/functions)
- [PostgreSQL COPY Documentation](https://www.postgresql.org/docs/current/sql-copy.html)

---

**¡Buena suerte con la migración! 🚀**
