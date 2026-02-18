

# Rediseno del Area Summary: Lista limpia con gauge mejorado

## Objetivo
Convertir la lista de skills en filas limpias tipo lista (sin aspecto de tarjeta), con un mini gauge de barras mas legible donde las barras verdes resalten claramente, y labels de escala mas grandes.

## Cambios

### 1. Quitar aspecto de tarjeta del skills list
- Eliminar `bg-card`, `rounded-2xl`, `shadow-sm`, `border`, `overflow-hidden` del contenedor
- Usar solo separadores sutiles entre filas (border-bottom ligero)
- Resultado: filas planas que se sienten como una lista, no como cards

### 2. Redisenar el mini gauge en PaceGauge (modo compact)
- Aumentar el numero de barras de 40 a 30 (menos barras = cada una mas ancha y visible)
- Incrementar la altura: barras grises de 12px, barras activas hasta 28px
- Barras grises con color `#E8E9ED` y opacidad baja
- Barras activas (verdes / area color) notablemente mas altas Y anchas, con `box-shadow` tipo glow sutil
- Aumentar el gap entre barras de 1px a 1.5px
- Hacer labels de escala (0x, 1x, 2x) mas grandes: de `text-[9px]` a `text-[11px]`
- Agregar mas padding horizontal al gauge para que respire

### 3. Mejorar el espaciado de cada fila
- Reducir el ancho del nombre del skill de 38% a 32% para dar mas espacio al gauge
- Aumentar el padding vertical de cada fila ligeramente
- El gauge ocupa mas espacio central (`flex-1`)

### 4. Mejorar el link de "Recommended Activities"
- Cambiar de texto collapsible a un boton con borde sutil y flecha, mas visible

## Detalles Tecnicos

### Archivos a modificar

**`src/components/PaceGauge.tsx`** (modo compact solamente):
- Cambiar barras compact: 30 barras, gap `1.5px`, altura base 12px, max 28px
- Color gris: `#E8E9ED`
- Barras activas: mas anchas (flex-1 + min-width), glow con box-shadow
- Rango de gradiente mas amplio (0.07 en vez de 0.05) para que el "pico" verde sea mas ancho
- Labels: `text-[11px]` con `font-medium`

**`src/components/assessment/AreaSummary.tsx`**:
- Quitar clases de tarjeta del contenedor de skills
- Ajustar proporciones de columnas (32% nombre, flex-1 gauge, auto pace badge)
- Padding: `px-2 py-3.5` en cada fila

