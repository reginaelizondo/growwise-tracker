

## Skip Area: Comportamiento condicional

### Logica

Modificar `handleSkipArea` en `src/pages/AssessmentNew.tsx` para que:

1. **Si el area tiene al menos 1 respuesta** → marcar las restantes como "no" (source: 'skipped'), calcular scores, ir al **Area Summary**
2. **Si el area NO tiene ninguna respuesta** → marcar todo como "no" (source: 'skipped'), NO mostrar summary, saltar directamente al **primer skill del siguiente area**. Si es la ultima area, completar el assessment.

### Cambios

**`src/pages/AssessmentNew.tsx`** - Modificar `handleSkipArea`:

```text
handleSkipArea:
  1. Recopilar todos los milestone_ids del area actual
  2. Contar cuantos tienen respuesta en el state `responses`
  3. Marcar los no contestados como "no" con source: 'skipped'
  4. Si hasAnswers > 0:
       → calculateSkillScores(areaIndex)
       → setViewState({ type: 'areaSummary', areaIndex })
  5. Si hasAnswers === 0:
       → Si NO es la ultima area:
           setViewState({ type: 'skill', areaIndex: areaIndex + 1, skillIndex: 0 })
       → Si ES la ultima area:
           completar assessment (misma logica de handleContinueFromSummary)
```

No se necesitan cambios en `SkillMilestoneList.tsx` ya que el boton ya existe y la logica es solo en el handler.

