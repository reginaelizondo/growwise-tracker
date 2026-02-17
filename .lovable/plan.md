
## Feedback personalizado en el Area Summary

### Que se va a hacer
Agregar un mensaje de feedback debajo del subtitulo "Pace of Development" que diga algo como **"Alana is developing right on track"** o **"Alana is ahead of pace!"** dependiendo del promedio de percentiles/paces de las skills del area.

### Logica del feedback
Se calcula el **percentil promedio** de todas las skills del area y se genera un mensaje personalizado con el nombre del bebe:

| Percentil promedio | Mensaje | Color |
|---|---|---|
| >= 80 | **[Name] is ahead of pace!** | Verde |
| >= 40 | **[Name] is developing right on track** | Color del area |
| < 40 | **[Name] is building up — keep going!** | Naranja |

### Ubicacion
Justo debajo del subtitulo "Pace of Development" y su icono de info, antes de la tabla de skills.

### Cambios tecnicos

**Archivo: `src/components/assessment/AreaSummary.tsx`**

1. Crear una funcion helper `getAreaFeedback(avgPercentile, babyName, areaColor)` que retorne el texto y color segun los rangos definidos arriba.

2. Calcular el percentil promedio del area:
   ```text
   const avgPercentile = skills.reduce(...) / skills.length
   ```

3. Insertar el feedback entre la seccion "Pace of Development" (linea 247) y la tabla de Skills (linea 249):
   - Texto centrado, font semibold, tamano `text-base`
   - Color dinamico segun el rango
   - Con un emoji/icono sutil (estrella para ahead, check para on track, etc.)
