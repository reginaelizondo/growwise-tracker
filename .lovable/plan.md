

## Rediseño de la sección "Pace of Development" en AreaSummary

### Cambios

Se va a modificar la sección de "Pace of Development" en `src/components/assessment/AreaSummary.tsx` para:

1. **Envolver todo en un contenedor shaded** - Un `div` con fondo sutil (`bg-muted/40` o similar) y bordes redondeados (`rounded-xl`) con padding interno.

2. **Centrar todo el contenido** - Tanto el subtítulo "PACE OF DEVELOPMENT" como el feedback "Alana is developing right on track" van centrados.

3. **Quitar el ícono** - Eliminar el `{feedback.icon}` (la checkmark/estrella/trending) que aparece al lado del texto.

4. **Mantener el botón de info** - El ícono de info (tooltip/dialog) se queda al lado del subtítulo.

### Resultado visual esperado

```text
┌─────────────────────────────────┐
│     PACE OF DEVELOPMENT (i)     │
│                                 │
│  Alana is developing right      │
│         on track                │
└─────────────────────────────────┘
```

### Archivo a editar
- `src/components/assessment/AreaSummary.tsx` - Líneas ~230-270 (sección del Pace of Development dentro del IIFE)

