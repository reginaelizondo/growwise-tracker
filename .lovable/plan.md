

## Mejoras al Email del Reporte

### Cambios en `supabase/functions/send-report-email/index.ts`

**1. Logo oficial de Kinedu**
- Copiar el logo subido (`logo_kinedu.png`) a `public/images/logo_kinedu.png`
- Usar la URL publica `https://growwise-tracker.lovable.app/images/logo_kinedu.png` en el header del email (fondo azul con logo blanco, similar al actual pero con el logo correcto)

**2. CTA: "Start 7-Day Free Trial"**
- Cambiar el texto del boton de "Get Started Free" a "Start 7-Day Free Trial"

**3. Agregar Overall Pace of Development**
- Calcular el overall pace promediando los porcentajes de todas las areas, luego aplicando la misma formula `calculatePace()` que usa el reporte web
- Agregar una nueva seccion en el email entre los "Assessment Results" y el CTA que muestre:
  - Titulo "Development Progress"
  - El valor del pace (ej. "1.2x") en grande con color azul
  - Un mensaje contextual basado en el pace (igual que en el reporte):
    - pace < 0.7: "Developing steadily -- targeted activities can accelerate growth"
    - pace 0.7-0.9: "Progressing well -- daily play maintains momentum"  
    - pace 0.9-1.2: "On track -- keep up the great work!"
    - pace > 1.2: "Ahead of pace -- excellent progress!"

### Seccion tecnica

Se portara la funcion `calculatePace()` directamente dentro del edge function (es pura matematica, sin dependencias de React). El layout sera una seccion HTML centrada con el valor grande del pace y el mensaje debajo, similar a como se ve en `/report`.

Archivo a modificar:
- `supabase/functions/send-report-email/index.ts` - actualizar logo, CTA, agregar seccion de pace

Archivo a copiar:
- `user-uploads://logo_kinedu.png` -> `public/images/logo_kinedu.png`

