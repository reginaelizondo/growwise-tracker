
# Reemplazar progress bar por gauge de Pace en el email

## Cambio visual

**Antes (actual):**
```text
Physical           1.0x
[========------]        <- progress bar de milestones
30 of 64 milestones (47%)
```

**Despues:**
```text
Physical           1.0x
|||||||||||||||||||||    <- gauge de barras verticales (como PaceGauge)
0x      1x        2x
Right on schedule
```

## Logica de labels

Se agrega una funcion `getPaceLabel(percentile)` que retorna:
- percentile >= 90 → "Early Bloomer" (emoji: estrella)
- percentile >= 10 → "Right on schedule" (emoji: check)
- percentile < 10 → "Taking their time" (emoji: semilla)

## Detalles tecnicos

### Archivo: `supabase/functions/send-report-email/index.ts`

**1. Agregar funcion `getPaceLabel()`** (~linea 72):
```typescript
function getPaceLabel(percentile: number): { label: string; emoji: string } {
  if (percentile >= 90) return { label: 'Early Bloomer', emoji: '🌟' }
  if (percentile >= 10) return { label: 'Right on schedule', emoji: '✅' }
  return { label: 'Taking their time', emoji: '🌱' }
}
```

**2. Modificar `areaCard()` (lineas 130-144):**

Reemplazar la progress bar (lineas 138-139) y el texto de milestones (linea 141) por:

- Un gauge HTML de ~30 barras verticales usando `<td>` dentro de una tabla
- Cada barra es gris por defecto, y las barras cercanas a la posicion del pace se colorean con el color del area (con gradiente de opacidad)
- Debajo del gauge: labels "0x", "1x", "2x"
- Debajo: el label contextual ("Right on schedule", etc.)
- Se elimina la linea de "X of Y milestones (Z%)"

La posicion del indicador se calcula igual que en el componente web:
```
gaugePosition = (pace / 2.0) * 100  // pace 0-2 mapeado a 0-100%
```

El gauge se construye con una tabla de celdas de 3px de ancho y alto variable (mas alto cerca del pace actual), replicando el efecto visual del componente `PaceGauge`.

**3. Acceso al percentile del area:**
Se necesita que `a.percentile` este disponible en el objeto del area. Verificare si ya viene calculado o si hay que derivarlo del pace.
