

## Subir imagenes a storage publico para el email

### Problema actual
El email usa emojis y texto en lugar de los logos reales porque las imagenes del proyecto (`src/assets/`) no son accesibles por URL publica. Los emails necesitan URLs publicas para mostrar imagenes.

### Solucion
Crear un bucket publico en storage llamado `email-assets`, subir las imagenes necesarias, y actualizar el HTML del email para usar esas URLs.

### Imagenes a subir

| Imagen | Archivo fuente | Destino en bucket |
|--------|---------------|-------------------|
| Logo Kinedu | `src/assets/logo-kinedu-blue.png` | `email-assets/logo-kinedu-blue.png` |
| Physical | `src/assets/Logo_Physical_HD.png` | `email-assets/Logo_Physical_HD.png` |
| Cognitive | `src/assets/Logo_Cognitive_HD.png` | `email-assets/Logo_Cognitive_HD.png` |
| Linguistic | `src/assets/Logo_Linguistic_HD.png` | `email-assets/Logo_Linguistic_HD.png` |
| Emotional | `src/assets/Logo_Emotional_HD.png` | `email-assets/Logo_Emotional_HD.png` |
| App Store badge | URL externa de Apple | Se usa directo de Apple CDN |
| Google Play badge | URL externa de Wikipedia/Google | Se usa directo de Google CDN |

### Pasos

1. **Crear bucket publico** `email-assets` via migracion SQL

2. **Politica RLS** para lectura publica (SELECT para anon)

3. **Subir las 5 imagenes** al bucket (logo + 4 areas) -- esto requiere que el usuario las suba manualmente desde Cloud View, o podemos referenciar las imagenes desde el dominio del proyecto publicado (`https://growwise-tracker.lovable.app/assets/...`)

**Alternativa mas rapida**: Como el proyecto ya esta publicado en `https://growwise-tracker.lovable.app`, podemos usar las URLs publicas del build de Vite directamente. Las imagenes en `src/assets/` se incluyen en el build y son accesibles via el dominio publicado. Solo necesitamos encontrar los hashes correctos del build.

**Alternativa recomendada**: Usar las imagenes desde `public/images/` que ya son accesibles sin hash. Actualmente solo hay `logo-kinedu-blue.png` ahi. Podemos copiar las demas a `public/images/`.

4. **Actualizar el edge function** `send-report-email/index.ts`:
   - Reemplazar emojis de areas por tags `<img>` con las URLs publicas
   - Reemplazar el logo del header por `<img>` con URL publica
   - Usar las badges oficiales de App Store y Google Play (SVG de Apple y Google CDN)

### Seccion tecnica

**Archivos a modificar:**
- `supabase/functions/send-report-email/index.ts` -- actualizar URLs de imagenes en el HTML

**Archivos a crear:**
- Copiar imagenes a `public/images/`:
  - `public/images/Logo_Physical_HD.png`
  - `public/images/Logo_Cognitive_HD.png`
  - `public/images/Logo_Linguistic_HD.png`
  - `public/images/Logo_Emotional_HD.png`

**URLs que se usaran en el email:**
- Logo: `https://growwise-tracker.lovable.app/images/logo-kinedu-blue.png`
- Physical: `https://growwise-tracker.lovable.app/images/Logo_Physical_HD.png`
- Cognitive: `https://growwise-tracker.lovable.app/images/Logo_Cognitive_HD.png`
- Linguistic: `https://growwise-tracker.lovable.app/images/Logo_Linguistic_HD.png`
- Emotional: `https://growwise-tracker.lovable.app/images/Logo_Emotional_HD.png`
- App Store: `https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg`
- Google Play: `https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg`

