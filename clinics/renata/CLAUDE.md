# CLAUDE.md — Clínica Renata

> Contexto específico de Clínica Renata para Claude Code.
> Leer siempre junto con el CLAUDE.md raíz del proyecto.

---

## Quién es Renata

**Clínica Renata** es la clínica piloto del modelo `clinico_general` en fce-plataform.
Es la primera clínica que usará las especialidades y módulos nuevos del rediseño multi-modelo.

- **Tipo de clínica**: medicina general y cuidados de enfermería
- **Estado**: en construcción — MVP objetivo Sprint R6
- **Slug**: `renata` (pendiente de confirmar)
- **DB project**: Synapta Product (`vigyhfpwyxihrjiygfsa`) — misma DB compartida

---

## Modelo clínico

**Modelo**: `clinico_general`

Las especialidades de Renata usan el nuevo flujo:
`EncuentroLauncher → fce_encuentros → clinico/page.tsx → NotaClinicaForm`

No usan SOAP ni evaluación estructurada M3/M4. Usan:
- `M4b_nota_clinica` — nota clínica libre (fce_notas_clinicas)
- `M3b_instrumentos` — instrumentos de valoración (Sprint R5)

---

## Especialidades activas

| Código (exacto en DB) | Modelo | Estado |
|---|---|---|
| `Medicina General` | clinico_general | activa |
| `Enfermería` | clinico_general | activa |

**No usar** Kinesiología, Fonoaudiología, Masoterapia ni otras especialidades rehab para Renata.

---

## Módulos activos

| Módulo | Estado |
|---|---|
| M1_identificacion | ✅ activo |
| M2_anamnesis | ✅ activo |
| M3b_instrumentos | ✅ activo (Sprint R5) |
| M4b_nota_clinica | ✅ activo (Sprint R4) |
| M5_consentimiento | ✅ activo |
| M6_auditoria | ✅ activo |
| M7_prescripciones | ✅ activo (Sprint R9/R10) · modo_firma_default: canvas |

**No activos**: M3_evaluacion, M4_soap (esos son del modelo rehab — Korporis).

### M7 — Prescripciones

- Habilitado en Renata vía migration `20260422_04_seed_modulo_m7.sql` (pendiente aplicar)
- `modo_firma_default: "canvas"` — firma digital en pantalla
- `requiere_diagnostico: false` — diagnóstico es opcional
- Para que un profesional pueda prescribir: `profesionales.puede_prescribir = true` (activar desde synapta-admin, pendiente sprint R10b)
- Los médicos y enfermeras de Renata son el caso de uso principal

---

## Instrumentos relevantes para Renata

Del seed de Sprint R2, los instrumentos que aplican a Medicina General y Enfermería:

| Código | Nombre | Especialidades |
|---|---|---|
| `braden` | Escala de Braden (UPP) | Enfermería |
| `downton` | Escala de Downton (caídas) | Enfermería, Medicina General |
| `barthel` | Índice de Barthel (AVD) | Medicina General, Enfermería |
| `lawton` | Escala de Lawton (AVDi) | Medicina General, Enfermería |
| `eva` | Escala Visual Análoga | Todas |
| `phq9` | PHQ-9 (depresión) | Medicina General |
| `gad7` | GAD-7 (ansiedad) | Medicina General |
| `mmse` | MMSE | Medicina General |
| `glasgow` | Glasgow Coma Scale | Medicina General, Enfermería |
| `apgar` | Apgar Score | Medicina General, Enfermería |

---

## Configuración en DB (clinicas_fce_config)

Cuando se registre Renata en la plataforma, su `clinicas_fce_config` debe tener:

```json
{
  "modulos_activos": ["M1_identificacion", "M2_anamnesis", "M5_consentimiento", "M6_auditoria"],
  "especialidades_activas": ["Medicina General", "Enfermería"]
}
```

`M3b_instrumentos` y `M4b_nota_clinica` no son IDs de módulo en la tabla aún — se agregan en Sprint R5 cuando se formalice el catálogo.

---

## Notas de implementación

- Renata **no tiene hard-stop de contraindicaciones** (eso es solo para Masoterapia, Odontología, Podología).
- CIE-10 por ahora es texto libre. Lookup contra catálogo oficial es mejora futura.
- El campo `motivo_consulta` de la nota clínica es diferente al de anamnesis:
  - `fce_anamnesis.motivo_consulta` → motivo histórico del paciente
  - `fce_notas_clinicas.motivo_consulta` → motivo de esta sesión específica
- Firmar nota finaliza el encuentro (`status → finalizado`). No hay reversión.

---

## Clínicas hermanas

| Clínica | Modelo | Estado |
|---|---|---|
| Korporis | rehabilitacion | Producción (korporis-fce legacy) |
| Nuvident | clinico_general (Odontología) | Beta |
| **Renata** | **clinico_general** | **En construcción** |
