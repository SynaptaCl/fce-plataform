# Sprint RTE — Rich Text Editor Transversal

> **Estado**: Listo para ejecutar · **Fecha**: 2026-06-13
> **Pre-requisitos**: P2 completado · CLAUDE.md leído
> **DB**: sin migrations (campos `text` y `jsonb` ya aceptan HTML — schema verificado vía MCP Supabase 2026-06-13)
> **Tiempo estimado**: 1-2 días

---

## 1. Objetivo

Reemplazar todos los `<textarea>` clínicos por un editor de texto enriquecido compartido (`RichTextEditor`) que permita al profesional aplicar negrita, cursiva, subrayado, listas, encabezados y citas en sus notas. Output: HTML sanitizado server-side, guardado tal cual en columnas `text` / `jsonb` existentes. Sin cambios de schema.

---

## 2. Alcance

### Incluye
1. **Componente compartido** `src/components/shared/RichTextEditor.tsx` (Tiptap + toolbar fija)
2. **Sanitización server-side** con `isomorphic-dompurify` en server actions de escritura
3. **Helper** `stripHtml()` en `src/lib/utils.ts` para IA y previews
4. **Campos rich text** (6 campos en 2 tablas + secciones P2):

   | Tabla / contexto | Campos rich text |
   |---|---|
   | `fce_notas_soap` | `subjetivo`, `objetivo`, `plan`, `tareas_domiciliarias` |
   | `fce_notas_clinicas` | `contenido`, `plan` |
   | `fce_notas_clinicas.secciones_estructuradas` (jsonb) | campos tipo `texto_largo` |

5. **Componentes que consumen `RichTextEditor`**:
   - `SoapForm` — 4 campos
   - `NotaClinicaForm` — `contenido` + `plan`
   - `QuickNoteModal` — `contenido` (escribe en `fce_notas_clinicas`, misma tabla — sanitización en `nota-rapida.ts` la cubre automáticamente)
   - `SeccionEstructuradaRenderer` — solo el caso `texto_largo`
6. **Render de HTML en consumidores**:
   - Timeline cards (`SoapExpandedCard`, `NotaClinicaExpandedCard`)
   - PDF Ficha Completa (`lib/ficha-clinica/pdf-renderer.ts`) — recibe HTML pre-sanitizado, NO re-escapa
7. **`readOnly={true}`** cuando documento firmado
8. **Tests** smoke + sanitización XSS

### Fuera de alcance
- Migrations DB (no se requieren)
- Campos `text` cortos que NO son narrativos: `motivo_consulta`, `diagnostico`, `proxima_sesion` — siguen como `<input>` o `<textarea>` simple
- Campos `jsonb` estructurados de SOAP: `analisis_cif`, `intervenciones` — manejados por `CifMapper`, no son rich text
- Campos `texto_corto`, `select`, `multi_select`, `escala`, `fecha`, `booleano` de secciones estructuradas — siguen como input plano
- Otros PDFs (`RecetaPdfView`, `OrdenExamenPdfView`, `PlanIntervencionPdfView`) — no consumen estos campos
- M9 epicrisis, M11 presupuestos, M12 informes — sprints separados si se requiere

---

## 3. Decisiones técnicas

| Decisión | Valor |
|---|---|
| Editor | **Tiptap v2** (`@tiptap/react` + `@tiptap/starter-kit` + `@tiptap/extension-underline`) |
| Sanitización | **isomorphic-dompurify** (server-side, en server actions) |
| Formato en DB | **HTML string** — guardado en columnas `text` y `jsonb` existentes |
| Whitelist tags | `p, br, strong, em, u, ul, ol, li, h2, h3, blockquote` |
| Whitelist attrs | **ninguno** (cero `style`, cero `class`, cero `id`, cero `data-*`) |
| Backward compat | Texto plano se carga como párrafo único — Tiptap maneja nativamente |
| PDF ficha completa | Inserta HTML pre-sanitizado directo (sin `escapeHtml` sobre el contenido) |
| IA (Resumen + Copiloto) | Aplica `stripHtml()` antes de pasar al modelo |

---

## 4. Dependencias a instalar

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-underline isomorphic-dompurify
npm install -D @types/dompurify
```

Verificar que `npm run build` siga en 0 errores tras instalar.

---

## 5. Implementación

### 5.1 Helper de sanitización — `src/lib/sanitize.ts` (nuevo)

```typescript
import DOMPurify from "isomorphic-dompurify";

const CONFIG = {
  ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "ul", "ol", "li", "h2", "h3", "blockquote"],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
} as const;

/**
 * Sanitiza HTML rich-text de notas clínicas.
 * Whitelist estricta. Sin atributos. Sin scripts. Sin estilos inline.
 * Llamar SIEMPRE en server actions antes de INSERT/UPDATE.
 */
export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, CONFIG);
}

/**
 * Verifica si un string parece HTML (tiene tags balanceados de la whitelist).
 * Útil para detectar legacy text plain vs HTML nuevo en consumidores.
 */
export function isRichTextHtml(value: string | null | undefined): boolean {
  if (!value) return false;
  return /<(p|strong|em|u|ul|ol|li|h2|h3|blockquote|br)\b/i.test(value);
}
```

### 5.2 Helper de extracción — agregar a `src/lib/utils.ts`

```typescript
/**
 * Extrae texto plano de HTML rich-text. Usado para:
 * - Input a modelos IA (Resumen, Copiloto)
 * - Previews en cards del Timeline
 * - Búsquedas y exports planos
 *
 * Maneja texto plano legacy sin tocar.
 */
export function stripHtml(value: string | null | undefined): string {
  if (!value) return "";
  // Si no tiene tags, devolver tal cual (texto legacy)
  if (!/<[^>]+>/.test(value)) return value;
  return value
    .replace(/<\/(p|h2|h3|li|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
```

### 5.3 Componente compartido — `src/components/shared/RichTextEditor.tsx` (nuevo)

```typescript
"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import {
  Bold, Italic, Underline as UIcon, List, ListOrdered,
  Heading2, Heading3, Quote, Eraser,
} from "lucide-react";
import { useEffect } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: number;
  ariaLabel?: string;
}

export function RichTextEditor({
  value, onChange, placeholder, readOnly = false, minHeight = 160, ariaLabel,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        // bullet/ordered list ya incluidos
      }),
      Underline,
    ],
    content: value || "",
    editable: !readOnly,
    immediatelyRender: false, // Next.js SSR-safe
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "rte-content",
        "aria-label": ariaLabel ?? "Editor de texto",
        style: `min-height:${minHeight}px;outline:none;padding:0.75rem;`,
      },
    },
  });

  // Sincronizar si value cambia externamente (ej: copiloto IA "Reemplazar")
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() === value) return;
    editor.commands.setContent(value || "", { emitUpdate: false });
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div
      className="rte-wrapper"
      style={{
        border: "1px solid var(--color-kp-border)",
        borderRadius: 8,
        background: "var(--color-surface-1)",
      }}
    >
      {!readOnly && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
      {!editor.getText() && placeholder && (
        <div
          aria-hidden
          style={{
            position: "absolute", padding: "0.75rem",
            color: "var(--color-ink-3)", pointerEvents: "none",
            fontSize: 14,
          }}
        >
          {placeholder}
        </div>
      )}
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const btn = (active: boolean, onClick: () => void, Icon: typeof Bold, label: string) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      style={{
        padding: 6, borderRadius: 4, border: "none",
        background: active ? "var(--color-kp-accent-xs)" : "transparent",
        color: active ? "var(--color-kp-primary)" : "var(--color-ink-2)",
        cursor: "pointer",
      }}
    >
      <Icon size={16} />
    </button>
  );

  return (
    <div
      role="toolbar"
      aria-label="Formato de texto"
      style={{
        display: "flex", gap: 4, padding: 6,
        borderBottom: "1px solid var(--color-kp-border)",
        flexWrap: "wrap",
      }}
    >
      {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), Bold, "Negrita")}
      {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), Italic, "Cursiva")}
      {btn(editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), UIcon, "Subrayado")}
      <Divider />
      {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), Heading2, "Encabezado 2")}
      {btn(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), Heading3, "Encabezado 3")}
      <Divider />
      {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), List, "Lista")}
      {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), ListOrdered, "Lista numerada")}
      {btn(editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), Quote, "Cita")}
      <Divider />
      {btn(false, () => editor.chain().focus().clearNodes().unsetAllMarks().run(), Eraser, "Limpiar formato")}
    </div>
  );
}

function Divider() {
  return <div style={{ width: 1, background: "var(--color-kp-border)", margin: "2px 4px" }} />;
}
```

### 5.4 Estilos globales — agregar a `src/app/globals.css`

```css
/* RichTextEditor — render de contenido */
.rte-content { font-size: 14px; line-height: 1.6; color: var(--color-ink-1); }
.rte-content p { margin: 0 0 0.5rem 0; }
.rte-content h2 { font-size: 1.15rem; font-weight: 600; margin: 0.75rem 0 0.5rem; }
.rte-content h3 { font-size: 1.05rem; font-weight: 600; margin: 0.6rem 0 0.4rem; }
.rte-content ul, .rte-content ol { padding-left: 1.5rem; margin: 0.4rem 0; }
.rte-content li { margin: 0.15rem 0; }
.rte-content blockquote {
  border-left: 3px solid var(--color-kp-accent);
  padding-left: 0.75rem;
  color: var(--color-ink-2);
  margin: 0.5rem 0;
}
.rte-content strong { font-weight: 600; }
.rte-content u { text-decoration: underline; }

/* Render readOnly (Timeline cards, PDF preview en pantalla) */
.rte-display { font-size: 14px; line-height: 1.6; }
.rte-display p { margin: 0 0 0.5rem 0; }
.rte-display h2, .rte-display h3 { font-weight: 600; margin: 0.5rem 0 0.3rem; }
.rte-display ul, .rte-display ol { padding-left: 1.5rem; }
.rte-display blockquote {
  border-left: 3px solid var(--color-kp-accent);
  padding-left: 0.75rem;
  color: var(--color-ink-2);
}
```

### 5.5 Integración en server actions — sanitización

Aplicar `sanitizeRichText()` ANTES de INSERT/UPDATE en:

**`src/app/actions/rehab/soap.ts`** — 4 campos text narrativos. `analisis_cif` e `intervenciones` son jsonb estructurado, NO se tocan.
```typescript
import { sanitizeRichText } from "@/lib/sanitize";
// ...
const payload = {
  subjetivo: sanitizeRichText(input.subjetivo),
  objetivo: sanitizeRichText(input.objetivo),
  plan: sanitizeRichText(input.plan),
  tareas_domiciliarias: sanitizeRichText(input.tareas_domiciliarias),
  // analisis_cif, intervenciones: jsonb estructurado — pasar tal cual
  // proxima_sesion: date — pasar tal cual
  // ... resto sin cambios
};
```

**`src/app/actions/clinico/nota-clinica.ts`** — `contenido` y `plan`. Los campos `motivo_consulta`, `diagnostico` y `proxima_sesion` siguen como texto plano (no sanitizar — son inputs cortos).
```typescript
const payload = {
  contenido: sanitizeRichText(input.contenido),
  plan: input.plan ? sanitizeRichText(input.plan) : null,
  motivo_consulta: input.motivo_consulta, // texto plano
  diagnostico: input.diagnostico,         // texto plano
  proxima_sesion: input.proxima_sesion,   // texto plano
  secciones_estructuradas: sanitizeSeccionesEstructuradas(input.secciones_estructuradas),
  // ... resto sin cambios
};
```

**`src/app/actions/clinico/nota-rapida.ts`** — `contenido` (escribe en `fce_notas_clinicas`, mismo tratamiento que nota clínica).
```typescript
const payload = {
  contenido: sanitizeRichText(input.contenido),
  // ... resto sin cambios
};
```

### 5.6 Integración en `SeccionEstructuradaRenderer`

Solo el caso `texto_largo` cambia a `RichTextEditor`. El resto (`texto_corto`, `select`, etc.) sigue igual.

```typescript
// En SeccionEstructuradaRenderer.tsx, dentro del switch por tipo:
case "texto_largo":
  return (
    <RichTextEditor
      value={valor ?? ""}
      onChange={(html) => onChange(campo.id, html)}
      placeholder={campo.placeholder}
      readOnly={readOnly}
      ariaLabel={campo.label}
    />
  );
```

**Sanitización**: agregar en `nota-clinica.ts` antes del UPDATE de `secciones_estructuradas`:

```typescript
function sanitizeSeccionesEstructuradas(
  secciones: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [seccionId, contenidoSeccion] of Object.entries(secciones)) {
    if (typeof contenidoSeccion === "string") {
      // Caso M10: strings planos en raíz (conductas_observadas, etc.)
      out[seccionId] = sanitizeRichText(contenidoSeccion);
    } else if (contenidoSeccion && typeof contenidoSeccion === "object") {
      // Caso P2: { [campoId]: valor }
      const sub: Record<string, unknown> = {};
      for (const [campoId, valor] of Object.entries(contenidoSeccion as Record<string, unknown>)) {
        sub[campoId] = typeof valor === "string" ? sanitizeRichText(valor) : valor;
      }
      out[seccionId] = sub;
    } else {
      out[seccionId] = contenidoSeccion;
    }
  }
  return out;
}
```

Llamar antes del UPDATE/INSERT: `secciones_estructuradas: sanitizeSeccionesEstructuradas(payload.secciones_estructuradas)`.

> Nota: sanitizar strings no-HTML es no-op (DOMPurify devuelve el texto sin tocar). Es seguro aplicar a todos los strings sin saber si son rich text o no.

### 5.7 Integración en componentes form

**`SoapForm`** — reemplazar `<textarea>` por `<RichTextEditor>` en los 4 campos narrativos: `subjetivo`, `objetivo`, `plan`, `tareas_domiciliarias`. Los componentes de `analisis_cif` (CifMapper) e `intervenciones` se mantienen sin cambios — son jsonb estructurado. Pasar `readOnly={firmado}` a todos los editores.

**`NotaClinicaForm`** — reemplazar `<textarea>` por `<RichTextEditor>` en `contenido` y `plan`. Mantener `motivo_consulta`, `diagnostico` y `proxima_sesion` como inputs/textareas simples. Pasar `readOnly={firmado}` a los editores.

**Copiloto IA — `CopilotoNotaPanel`**: el modelo devuelve texto plano. Convertir a HTML simple al insertar/reemplazar:

```typescript
function textoPlanoAHtml(texto: string): string {
  return texto
    .split(/\n\n+/)
    .map((parrafo) => `<p>${escapeHtml(parrafo.replace(/\n/g, "<br>"))}</p>`)
    .join("");
}

// "Reemplazar"
onReplace(textoPlanoAHtml(borrador.contenido));

// "Insertar al final"
onAppend(html + "<p><br></p>" + textoPlanoAHtml(borrador.contenido));
```

(`escapeHtml` ya existe en pdf-renderer; mover a `lib/utils.ts` si no está ahí para reutilizar.)

**`QuickNoteModal`** — reemplazar `<textarea>` por `<RichTextEditor>`.

### 5.8 Integración en Timeline cards

Para `SoapExpandedCard` y `NotaClinicaExpandedCard`:

```tsx
import { isRichTextHtml } from "@/lib/sanitize";

function ContenidoNota({ value }: { value: string | null }) {
  if (!value) return <span style={{ color: "var(--color-ink-3)" }}>—</span>;
  if (isRichTextHtml(value)) {
    return (
      <div
        className="rte-display"
        dangerouslySetInnerHTML={{ __html: value }} // ya sanitizado en server action
      />
    );
  }
  // Legacy: texto plano con saltos de línea
  return <div style={{ whiteSpace: "pre-wrap" }}>{value}</div>;
}
```

**`dangerouslySetInnerHTML` es seguro acá** porque el HTML pasó por `sanitizeRichText()` server-side antes de guardarse. Documentar con comentario inline.

### 5.9 PDF Ficha Completa — `lib/ficha-clinica/pdf-renderer.ts`

**Regla actual** (§9): `escapeHtml()` obligatorio sobre todo contenido.
**Cambio**: para campos rich-text identificados, NO escapar — insertar HTML directo confiando en sanitización server-side previa.

Agregar helper local:

```typescript
import { isRichTextHtml } from "@/lib/sanitize";
import { stripHtml } from "@/lib/utils";

/**
 * Renderiza un campo de texto en el PDF.
 * - Si es HTML rich-text: inserta directo (ya sanitizado al guardar)
 * - Si es texto plano legacy: escapa y preserva saltos de línea
 */
function renderTextoClinico(value: string | null | undefined): string {
  if (!value) return "<em>—</em>";
  if (isRichTextHtml(value)) {
    return `<div class="rte-pdf">${value}</div>`;
  }
  return `<div style="white-space:pre-wrap;">${escapeHtml(value)}</div>`;
}
```

Y en el CSS embebido del PDF (hex hardcoded, no var):

```css
.rte-pdf p { margin: 0 0 4px 0; }
.rte-pdf h2 { font-size: 13pt; font-weight: 600; margin: 6px 0 3px; }
.rte-pdf h3 { font-size: 12pt; font-weight: 600; margin: 5px 0 3px; }
.rte-pdf ul, .rte-pdf ol { padding-left: 20px; margin: 4px 0; }
.rte-pdf li { margin: 2px 0; }
.rte-pdf blockquote { border-left: 2px solid #006B6B; padding-left: 8px; color: #475569; margin: 4px 0; }
.rte-pdf strong { font-weight: 600; }
.rte-pdf u { text-decoration: underline; }
```

Aplicar `renderTextoClinico()` en las secciones que muestran:
- SOAP: `subjetivo`, `objetivo`, `plan`, `tareas_domiciliarias`
- Nota clínica: `contenido`, `plan`
- Campos `texto_largo` de secciones estructuradas

El resto (datos demográficos, signos vitales numéricos, `motivo_consulta`, `diagnostico`, `proxima_sesion`, fechas, etc.) sigue con `escapeHtml()`.

### 5.10 IA — actualizar consumidores para usar `stripHtml`

En `src/lib/ia/extraccion/evolucion.ts` y cualquier otro que arme contexto a partir de SOAP/nota clínica, envolver el campo con `stripHtml()`:

```typescript
import { stripHtml } from "@/lib/utils";
// ...
contenido: stripHtml(nota.contenido),
subjetivo: stripHtml(soap.subjetivo),
// ...
```

En Copiloto IA (`actions/copiloto-nota.ts`), si lee la nota actual como contexto, también `stripHtml()`.

---

## 6. Tests

### 6.1 Script de test — `scripts/test-sprint-rte.ts`

Checks mínimos (≥ 20):

1. `sanitizeRichText` elimina `<script>`, `<iframe>`, `<style>`, `onerror`
2. `sanitizeRichText` preserva `<strong>`, `<em>`, `<u>`, `<ul>`, `<ol>`, `<li>`, `<h2>`, `<h3>`, `<blockquote>`, `<p>`, `<br>`
3. `sanitizeRichText` elimina atributos `style`, `class`, `id`, `onclick`
4. `sanitizeRichText("")` retorna `""`
5. `sanitizeRichText(null)` retorna `""`
6. `stripHtml("<p>hola</p><p>mundo</p>")` retorna `"hola\nmundo"`
7. `stripHtml("texto plano")` retorna `"texto plano"` (legacy passthrough)
8. `stripHtml(null)` retorna `""`
9. `isRichTextHtml("<p>hola</p>")` retorna `true`
10. `isRichTextHtml("hola")` retorna `false`
11. INSERT SOAP con HTML en `subjetivo`/`objetivo`/`plan`/`tareas_domiciliarias` → rows guardados con HTML sanitizado
12. INSERT SOAP confirma que `analisis_cif` (jsonb) NO se ve afectado por el cambio
13. UPDATE SOAP firmado → trigger DB rechaza (regresión)
14. INSERT nota clínica con `<script>alert(1)</script>` en `contenido` → guardado sin el script
15. INSERT nota clínica con HTML en `plan` → sanitizado correctamente
16. INSERT nota clínica con texto plano en `motivo_consulta`/`diagnostico` → guardado tal cual (no se sanitiza)
17. INSERT nota rápida (via `nota-rapida.ts`) con HTML → guardado sanitizado
18. UPDATE nota clínica con `secciones_estructuradas` mixto (M10 string + P2 objeto) → ambos sanitizados
19. Notas legacy texto plano siguen visibles en Timeline (no se corrompen)
20. `isRichTextHtml` no genera falsos positivos en texto con `<` literal (ej: "PA <120/80")

### 6.2 Smoke manual

- Login → abrir encuentro clínico → escribir nota con negrita + lista → guardar → cerrar → reabrir → verificar formato
- Firmar nota → verificar editor en `readOnly` (sin toolbar, sin edición)
- Aplicar Copiloto IA → "Reemplazar" → verificar contenido formateado como párrafos
- Exportar Ficha Clínica Completa → abrir PDF → verificar formato preservado
- Timeline → expandir card SOAP con HTML → ver formato; expandir card legacy texto plano → ver pre-wrap

---

## 7. Criterios de aceptación

- [ ] `npm install` agrega las 4 dependencias sin warnings
- [ ] `npm run build` con 0 errores y 0 warnings
- [ ] `npm run lint` limpio
- [ ] `npx tsx scripts/test-sprint-rte.ts` pasa todos los checks
- [ ] Smoke manual aprobado (sección 6.2)
- [ ] Notas existentes (texto plano) siguen visibles en Timeline sin corromperse
- [ ] PDF Ficha Completa preserva formato HTML
- [ ] Resumen IA sigue funcionando (recibe texto limpio vía `stripHtml`)
- [ ] Copiloto IA sigue funcionando (insert/replace produce HTML válido)
- [ ] Trigger de inmutabilidad post-firma sigue activo (regresión SOAP firmado)
- [ ] Documento clínico firmado renderiza editor en modo `readOnly`
- [ ] Sin uso nuevo de `if (especialidad === '...')` (regla §18)
- [ ] CLAUDE.md actualizado: sección 9 (patrón sanitize/stripHtml), sección 10 (RichTextEditor en shared, sanitize.ts en lib), sección 14 (sprint RTE en completados)

---

## 8. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Cumplimiento Decreto 41 / Ley 20.584 — el PDF de ficha completa debe ser auténtico y legible | HTML sanitizado server-side con whitelist mínima; sin `style`, sin `class`, sin `script`. Auditoría visual obligatoria del PDF antes de cerrar sprint |
| XSS si sanitización falla | DOMPurify es estándar OWASP; whitelist sin atributos elimina vector. Tests específicos (6.1.1, 6.1.3, 6.1.13) |
| Notas legacy en texto plano se ven raras al lado de las nuevas con formato | Helper `isRichTextHtml` detecta y aplica render apropiado. `whiteSpace: pre-wrap` para legacy preserva saltos |
| `dangerouslySetInnerHTML` en Timeline cards y PDF | Solo aplica a contenido ya sanitizado server-side al guardar. Documentado con comentario inline. Doble defensa: el sanitize está en el INSERT/UPDATE path, no en el render |
| Copiloto IA genera Markdown en vez de texto plano | Parser actual (`parseBorradorNota`) produce texto plano. `textoPlanoAHtml` lo envuelve en `<p>`. Si el modelo retorna `**bold**` en el futuro, este parser deberá actualizarse — fuera de scope ahora |
| Inmutabilidad post-firma comprometida | Triggers DB no cambian. Editor pasa a `readOnly` cuando `firmado=true`. Aunque alguien fuerce un UPDATE desde devtools, el trigger lo rechaza |
| Bundle size por Tiptap (~70 KB gzip) | Aceptable. Carga solo en páginas con formularios. Server Components siguen sin JS |
| Mobile UX de toolbar | Toolbar con `flex-wrap`; en pantallas < 380px los íconos pasan a 2 filas. Aceptable para MVP |
| Datos antes/después del sprint | Sin migraciones — no hay corte. Notas guardadas tras deploy son HTML; previas siguen siendo texto plano. Coexisten sin problema |

---

## 9. Archivos tocados (resumen)

**Nuevos:**
- `src/lib/sanitize.ts`
- `src/components/shared/RichTextEditor.tsx`
- `scripts/test-sprint-rte.ts`

**Modificados:**
- `src/lib/utils.ts` — agregar `stripHtml`
- `src/app/globals.css` — clases `.rte-content` y `.rte-display`
- `src/app/actions/rehab/soap.ts` — `sanitizeRichText` en S/O/A/P
- `src/app/actions/clinico/nota-clinica.ts` — `sanitizeRichText` + `sanitizeSeccionesEstructuradas`
- `src/app/actions/clinico/nota-rapida.ts` — `sanitizeRichText` en contenido
- `src/components/rehab/SoapForm.tsx` — usar `RichTextEditor`
- `src/components/clinico/NotaClinicaForm.tsx` — usar `RichTextEditor` en `contenido`
- `src/components/clinico/QuickNoteModal.tsx` — usar `RichTextEditor`
- `src/components/clinico/SeccionEstructuradaRenderer.tsx` — `texto_largo` → `RichTextEditor`
- `src/components/modules/timeline/SoapExpandedCard.tsx` — `ContenidoNota` con detección HTML
- `src/components/modules/timeline/NotaClinicaExpandedCard.tsx` — idem
- `src/components/modules/CopilotoNota/CopilotoNotaPanel.tsx` — `textoPlanoAHtml` en insert/replace
- `src/lib/ficha-clinica/pdf-renderer.ts` — `renderTextoClinico` + CSS embebido `.rte-pdf`
- `src/lib/ia/extraccion/evolucion.ts` — `stripHtml` en SOAP/nota
- `src/app/actions/copiloto-nota.ts` — `stripHtml` en contexto si lee notas previas
- `package.json` — 4 dependencias nuevas
- `CLAUDE.md` — sección 9 (patrones), sección 10 (estructura), sección 14 (sprint completado)

**Sin cambios:** DB schema, triggers, RLS, otros PDFs, M10/M11/M12, dental workspace.

---

## 10. Notas de implementación

(Llenar al cerrar el sprint con aprendizajes que impacten sprints futuros.)
