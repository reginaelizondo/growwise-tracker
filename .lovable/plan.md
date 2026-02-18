

## Mejoras a la sección "Your Progress" del email

Basandome en el screenshot de referencia, estos son los cambios necesarios en `supabase/functions/send-recovery-email/index.ts`:

### Cambios en la tarjeta de progreso (lineas 182-201)

1. **Titulo "YOUR PROGRESS" a la izquierda + "XX% complete" a la derecha en verde** - Actualmente solo muestra "22% complete" en gris pequeño. Cambiar a un layout de dos columnas:
   - Izquierda: "YOUR PROGRESS" en mayusculas, bold, gris oscuro, font-size 13px
   - Derecha: "22% complete" en verde (#34A853), bold, italica, font-size 13px

2. **Progress bar mas gruesa y verde solido** - Actualmente es de 4px. Cambiar a 6px de alto con bordes redondeados completos y color verde mas visible.

3. **Iconos del step tracker mas grandes** - Aumentar de 28px a 40px para que coincidan con el screenshot donde los iconos son circulares y mas prominentes.

4. **Ring verde para el area activa (Cognitive)** - En el screenshot, Cognitive tiene un ring verde grueso (no azul). Cambiar el borde de `#2563eb` (azul) a `#6DC185` (verde Cognitive) con 3px de grosor. Remover el blue dot de arriba.

5. **Areas inactivas con ring gris claro** - Las areas pendientes (Physical, Linguistic, Social) muestran un circulo gris claro alrededor del icono, no solo opacidad reducida. Agregar un borde gris (#e5e7eb) de 2px.

6. **Label "Social" en vez de "Socio-Emotional"** - Acortar el nombre del area 4 para que quepa mejor.

7. **Lineas conectoras mas largas** - Aumentar el ancho de las lineas de 16px a 24px para que se vean como en el screenshot.

### Detalle tecnico

Archivo: `supabase/functions/send-recovery-email/index.ts`

**Seccion del header de progreso** (reemplazar lineas 184-186):
- Cambiar de un solo `<p>` a una tabla de 2 columnas con "YOUR PROGRESS" (izq) y "XX% complete" (der, verde)

**Progress bar** (lineas 187-191):
- Aumentar height de 4px a 6px
- Border-radius completo en ambos lados

**Step tracker icons** (lineas 30-57):
- Iconos de 28px a 40px
- Current area: ring verde (#6DC185) de 3px, sin blue dot
- Areas inactivas: ring gris (#e5e7eb) de 2px, opacity 0.5
- Renombrar "Socio-Emotional" a "Social"

**Lineas conectoras** (linea 65):
- Width de 16px a 24px

Despues de los cambios, se resetea el flag de email y se envia un test.
