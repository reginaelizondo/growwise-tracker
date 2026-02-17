

# Fix: Hacer el envío de emails robusto y debuggable

## Problema encontrado
El email para `ppadillasan@gmail.com` nunca se envio automaticamente. La edge function `send-report-email` fue invocada (boot registrado a las 18:02:28) pero retorno sin enviar el email. No hay logs porque los puntos de retorno temprano (no email, no assessment, no responses) no tienen `console.log`.

**Causa raiz probable**: Race condition. El `Report.tsx` llama a la funcion inmediatamente al cargar, pero las respuestas del assessment podrian no estar completamente guardadas en ese momento. La funcion encuentra 0 respuestas y retorna con error 400 sin loggear nada.

## Solucion (3 partes)

### 1. Agregar logging a TODOS los puntos de retorno en la edge function
Cada `return` en `send-report-email` debe tener un `console.log` para que siempre quede registro de que paso. Puntos sin logging actualmente:
- Linea 426: Missing assessment_id or baby_id
- Linea 453: Baby not found
- Linea 460: No email on file
- Linea 467: Assessment not found
- Linea 482: No responses found (probable culpable)

### 2. Agregar retry con delay en Report.tsx
En lugar de llamar a la edge function inmediatamente al cargar el reporte (Path A), agregar un `setTimeout` de 3 segundos para dar tiempo a que todas las respuestas se guarden en la base de datos.

```typescript
// Path A: delay email to avoid race condition with response writes
if (assessmentData.babies?.email) {
  setTimeout(() => {
    fetch(`${supabaseUrl}/functions/v1/send-report-email`, { ... })
  }, 3000);
}
```

### 3. Agregar retry automatico si la primera llamada falla
Si la edge function retorna un error (status != 200 o `skipped: false` con error), reintentar una vez despues de 5 segundos.

## Detalles tecnicos

### Edge function: agregar `console.log` en cada retorno
Antes de cada `return` en la funcion, agregar un log descriptivo:
```typescript
console.log('SKIP: No responses found for assessment', assessment_id)
return new Response(JSON.stringify({ error: 'No responses found' }), { ... })
```

### Report.tsx: retry con backoff
```typescript
const sendEmail = async (retryCount = 0) => {
  try {
    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok && retryCount < 1) {
      setTimeout(() => sendEmail(retryCount + 1), 5000);
    }
  } catch (err) {
    if (retryCount < 1) {
      setTimeout(() => sendEmail(retryCount + 1), 5000);
    }
  }
};
setTimeout(() => sendEmail(), 3000);
```

### Archivos a modificar
- `supabase/functions/send-report-email/index.ts` - agregar logs
- `src/pages/Report.tsx` - delay + retry en Path A (linea ~124) y Path B (linea ~263)

## Resultado esperado
- Siempre habra logs de que paso con cada llamada a la edge function
- El delay de 3s evita la race condition con las escrituras de respuestas
- El retry automatico garantiza que si la primera llamada falla, se intenta de nuevo
- El usuario `ppadillasan@gmail.com` ya recibio su email (enviado manualmente durante esta investigacion)

