# 📤 Instrucciones para Exportar Datos del Proyecto Anterior

## Proyecto Origen: `dxnzccqnpdzncrokihur`
## Proyecto Destino: `uslivvopgsrajcxxjftw`

---

## **Método 1: Exportar via SQL Editor (Recomendado)** 🎯

### Paso 1: Conectar al Proyecto Anterior
1. Ir a: https://supabase.com/dashboard/project/dxnzccqnpdzncrokihur
2. Navegar a: **SQL Editor**

### Paso 2: Exportar Milestones (96 registros)

**Query para ver los datos:**
```sql
SELECT 
  milestone_id,
  age,
  area_id,
  area_name,
  skill_id,
  skill_name,
  description,
  question,
  science_fact,
  source_data,
  locale,
  media_jpg_file_name,
  media_jpg_content_type,
  media_mp4_file_name,
  media_mp4_content_type
FROM milestones
ORDER BY milestone_id;
```

**Generar INSERT statements:**
```sql
SELECT 
  'INSERT INTO milestones (milestone_id, age, area_id, area_name, skill_id, skill_name, description, question, science_fact, source_data, locale, media_jpg_file_name, media_jpg_content_type, media_mp4_file_name, media_mp4_content_type) VALUES (' ||
  milestone_id || ', ' ||
  age || ', ' ||
  area_id || ', ' ||
  quote_literal(area_name) || ', ' ||
  skill_id || ', ' ||
  quote_literal(skill_name) || ', ' ||
  quote_literal(description) || ', ' ||
  quote_literal(question) || ', ' ||
  quote_literal(science_fact) || ', ' ||
  quote_literal(source_data) || ', ' ||
  quote_literal(locale) || ', ' ||
  COALESCE(quote_literal(media_jpg_file_name), 'NULL') || ', ' ||
  COALESCE(quote_literal(media_jpg_content_type), 'NULL') || ', ' ||
  COALESCE(quote_literal(media_mp4_file_name), 'NULL') || ', ' ||
  COALESCE(quote_literal(media_mp4_content_type), 'NULL') || ');'
FROM milestones
ORDER BY milestone_id;
```

**Copiar resultado y guardarlo como:** `milestones_insert.sql`

### Paso 3: Exportar skill_percentile_curves (22,500 registros)

**IMPORTANTE:** Debido al tamaño, debes exportar en batches

**Query para generar CSV (Más eficiente):**
```sql
COPY (
  SELECT 
    skill_id,
    skill_name,
    age_months,
    percentile,
    probability,
    locale
  FROM skill_percentile_curves
  ORDER BY skill_id, age_months, percentile
) TO STDOUT WITH CSV HEADER;
```

**O generar INSERT statements por skill:**

```sql
-- Batch 1: Secure Attachment (skill_id = 2)
SELECT 
  'INSERT INTO skill_percentile_curves (skill_id, skill_name, age_months, percentile, probability, locale) VALUES (' ||
  skill_id || ', ' ||
  quote_literal(skill_name) || ', ' ||
  age_months || ', ' ||
  percentile || ', ' ||
  probability || ', ' ||
  quote_literal(locale) || ');'
FROM skill_percentile_curves
WHERE skill_id = 2
ORDER BY age_months, percentile;

-- Repetir para cada skill_id: 3, 6, 7, 8, 12, 17, 19, 22
```

### Paso 4: Exportar skill_probability_curves (4 registros)

```sql
SELECT 
  'INSERT INTO skill_probability_curves (skill_id, skill_name, age_months, mark_key, probability, locale) VALUES (' ||
  skill_id || ', ' ||
  quote_literal(skill_name) || ', ' ||
  age_months || ', ' ||
  quote_literal(mark_key) || ', ' ||
  probability || ', ' ||
  quote_literal(locale) || ');'
FROM skill_probability_curves
ORDER BY skill_id, age_months;
```

---

## **Método 2: Exportar via psql** 💻

### Requisitos:
- PostgreSQL Client instalado (`psql`)
- Database password del proyecto anterior

### Paso 1: Conectar a la Base de Datos Anterior
```bash
psql "postgresql://postgres:[PASSWORD]@db.dxnzccqnpdzncrokihur.supabase.co:5432/postgres"
```

### Paso 2: Exportar a CSV

**Milestones:**
```sql
\COPY (SELECT milestone_id, age, area_id, area_name, skill_id, skill_name, description, question, science_fact, source_data, locale, media_jpg_file_name, media_jpg_content_type, media_mp4_file_name, media_mp4_content_type FROM milestones ORDER BY milestone_id) TO 'milestones_export.csv' CSV HEADER;
```

**Skill Percentile Curves:**
```sql
\COPY (SELECT skill_id, skill_name, age_months, percentile, probability, locale FROM skill_percentile_curves ORDER BY skill_id, age_months, percentile) TO 'skill_percentile_curves_export.csv' CSV HEADER;
```

**Skill Probability Curves:**
```sql
\COPY (SELECT skill_id, skill_name, age_months, mark_key, probability, locale FROM skill_probability_curves ORDER BY skill_id, age_months) TO 'skill_probability_curves_export.csv' CSV HEADER;
```

### Paso 3: Salir de psql
```sql
\q
```

---

## **Método 3: Usar los CSV Existentes del Proyecto** 📁

Si tienes los archivos CSV originales en el proyecto:

### Archivos disponibles:
- `temp_Babbling.csv`
- `temp_Coordination.csv`
- `temp_Foundations.csv`
- `temp_HeadControl.csv`
- `temp_Memory.csv`
- `temp_Newborn.csv`
- `temp_Object.csv`
- `temp_Secure.csv`
- `temp_Sensory.csv`

### Usar el script existente:
```bash
# Generar SQL desde CSVs
node generate_probability_sql.js

# Esto genera: load_9_probability_curves.sql
# Ejecutar ese archivo en tu nuevo Supabase
```

---

## **Método 4: Exportar via Supabase Dashboard** 🖥️

### Paso 1: Ir a Table Editor
1. Dashboard → **Table Editor**
2. Seleccionar tabla (ej: `milestones`)

### Paso 2: Exportar Datos
1. Click en **"..."** (tres puntos) arriba a la derecha
2. Seleccionar **"Download as CSV"**
3. Guardar archivo

### Paso 3: Repetir para cada tabla
- [ ] `milestones` → `milestones.csv`
- [ ] `skill_percentile_curves` → `skill_percentile_curves.csv`
- [ ] `skill_probability_curves` → `skill_probability_curves.csv`

---

## **Importar Datos al Proyecto Nuevo** 📥

### Opción A: Importar CSV via Dashboard

1. Ir a: https://supabase.com/dashboard/project/uslivvopgsrajcxxjftw
2. **Table Editor** → Seleccionar tabla
3. Click **"Insert"** → **"Import CSV"**
4. Subir archivo CSV correspondiente
5. Mapear columnas si es necesario
6. Click **"Import"**

### Opción B: Importar via SQL Editor

1. Abrir archivo `.sql` generado (ej: `milestones_insert.sql`)
2. Copiar contenido completo
3. **SQL Editor** → **New Query**
4. Pegar y ejecutar

### Opción C: Importar via psql

```bash
# Conectar al nuevo proyecto
psql "postgresql://postgres:[PASSWORD]@db.uslivvopgsrajcxxjftw.supabase.co:5432/postgres"

# Importar desde CSV
\COPY milestones(milestone_id, age, area_id, area_name, skill_id, skill_name, description, question, science_fact, source_data, locale, media_jpg_file_name, media_jpg_content_type, media_mp4_file_name, media_mp4_content_type) FROM 'milestones_export.csv' CSV HEADER;

\COPY skill_percentile_curves(skill_id, skill_name, age_months, percentile, probability, locale) FROM 'skill_percentile_curves_export.csv' CSV HEADER;

\COPY skill_probability_curves(skill_id, skill_name, age_months, mark_key, probability, locale) FROM 'skill_probability_curves_export.csv' CSV HEADER;
```

---

## **Verificar Importación** ✅

Ejecutar en el **nuevo proyecto**:

```sql
-- Verificar conteos
SELECT 'milestones' as table_name, COUNT(*) as count FROM milestones
UNION ALL
SELECT 'skill_percentile_curves', COUNT(*) FROM skill_percentile_curves
UNION ALL
SELECT 'skill_probability_curves', COUNT(*) FROM skill_probability_curves;

-- Debe mostrar:
-- milestones: 96
-- skill_percentile_curves: 22500
-- skill_probability_curves: 4
```

---

## **Troubleshooting** 🔧

### Error: "duplicate key value violates unique constraint"
- Ya existen datos con esos IDs
- Ejecutar `TRUNCATE TABLE [nombre_tabla] CASCADE;` antes de importar

### Error: "permission denied"
- Verificar que tengas service_role_key configurado
- O conectar con usuario postgres directamente

### Error: "invalid input syntax"
- Verificar que los datos CSV tengan el formato correcto
- Asegurar que las comillas estén escapadas correctamente

### CSV muy grande (timeout)
- Dividir en archivos más pequeños (ej: 5000 filas cada uno)
- Importar en batches secuenciales

---

## **Resumen de Archivos a Generar** 📋

1. ✅ `milestones_export.csv` o `milestones_insert.sql` (96 registros)
2. ✅ `skill_percentile_curves_export.csv` o múltiples archivos SQL por skill (22,500 registros)
3. ✅ `skill_probability_curves_export.csv` o `skill_probability_curves_insert.sql` (4 registros)

---

**¿Prefieres que te ayude a generar los SQL INSERT statements directamente?** 

Solo dime cuál método prefieres usar (SQL Editor, CSV, o psql) y te doy el código exacto. 🚀
