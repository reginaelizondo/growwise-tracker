
# Mejorar el Area Summary - Diseño mas limpio

## Problemas actuales
- El valor del pace (ej. "1.0x") aparece duplicado: una vez en el header del skill y otra vez dentro del PaceGauge compact
- Demasiado espacio vertical por skill
- Se siente repetitivo y poco claro

## Nuevo diseno por skill

Cada skill tendra este layout simplificado:

```text
Object Exploration                    1.0x
||||||||||||||||||||||||||||||||||||||||||||
0x            1x            2x
On track with 50% of babies their age
─────────────────────────────────────────
```

## Cambios tecnicos

### Archivo: `src/components/assessment/AreaSummary.tsx`

1. **Eliminar el pace duplicado del header**: Quitar el `<span>` con `pace.toFixed(1)x` del lado derecho del nombre del skill, ya que el PaceGauge compact ya lo muestra.

2. **Pasar `areaName` al PaceGauge compact**: Para que muestre "Object Exploration - 1.0x" en una sola linea dentro del gauge (el PaceGauge compact ya soporta esto con la prop `areaName`).

3. **Alternativa mas limpia**: En vez de usar la prop `areaName` del PaceGauge (que pone todo en una linea), mantener el nombre del skill arriba en su propio rengleon y usar el PaceGauge compact SIN el nombre. Pero eliminar el pace value del header row para que solo aparezca una vez dentro del gauge.

**Cambio concreto en AreaSummary.tsx (lineas 193-214):**

- Linea 194-201: Cambiar el header para mostrar SOLO el nombre del skill (sin el pace value a la derecha)
- Linea 204-209: El PaceGauge compact ya muestra el pace value centrado, eso se queda
- Resultado: el pace aparece una sola vez

### Archivo: `src/components/PaceGauge.tsx`

No se necesitan cambios - el modo compact ya funciona bien mostrando el valor y el gauge.
