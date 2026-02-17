

# Rediseno del Area Summary inspirado en la imagen

## Cambios Visuales

### 1. Card de "Pace of Development" (nuevo)
Agregar una card con fondo tintado que muestre:
- Titulo "PACE OF DEVELOPMENT" (uppercase, small)
- Texto descriptivo general del area (ej. "Developing at their own pace")
- **Badges de highlight** a la derecha: el skill con mejor percentil (con icono estrella y color verde/dorado) y el skill con peor percentil (con icono warning y color naranja), cada uno mostrando nombre abreviado + percentil ordinal

### 2. Seccion "SKILLS" con divider
- Agregar un divider horizontal con label "SKILLS" en uppercase, con linea del color del area
- Reemplazar el layout vertical actual por uno horizontal tipo tabla:
  - **Izquierda**: Nombre del skill (bold, negro) + indicador de dots (circulos llenos/vacios mostrando X/Y milestones mastered)
  - **Centro-derecha**: Barra horizontal de progreso (filled con color del area, fondo gris claro) + pace value (ej. "0.8x")
  - **Derecha**: Percentil en texto grande bold (ej. "40%") con color contextual

### 3. Indicador de Dots (milestone progress)
Para cada skill, mostrar una fila de circulos pequenos:
- Circulos llenos (color del area) = milestones mastered
- Circulos vacios (gris claro) = milestones restantes
- Texto "X/Y" al lado

### 4. Barra de progreso horizontal
Reemplazar el PaceGauge vertical de barras por una barra horizontal simple:
- Ancho proporcional al pace (pace/2.0 * 100%)
- Color del area
- Marcador sutil en el punto 1.0x (50%)

### 5. Eliminar el percentile text descriptivo debajo de cada skill
Se reemplaza por el porcentaje numerico a la derecha

### 6. Mantener sin cambios
- Header con icono y nombre del area
- Baby info (nombre + edad)
- Recommended Activities (collapsible)
- Boton fijo inferior

## Detalles Tecnicos

### Archivo a modificar
- `src/components/assessment/AreaSummary.tsx`

### Logica de badges de highlight
```text
bestSkill = skill con mayor percentil
worstSkill = skill con menor percentil (solo si percentil < 30)
```

### Logica de dots
```text
filledDots = skill.masteredCount
totalDots = skill.totalCount
```

### Logica de barra horizontal
```text
barWidth = (pace / 2.0) * 100  // donde pace viene de calculatePace(percentile)
```

### Color del percentil
```text
>= 75: color del area (bold)
>= 40: color del area (normal)
< 40: naranja/warning
```

Se mantiene el import de `calculatePace` de PaceGauge pero se elimina el uso del componente PaceGauge completo, reemplazandolo por la barra horizontal inline.
