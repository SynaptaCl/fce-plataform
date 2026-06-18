"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
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
      // StarterKit v3 ya incluye underline, listas, heading, blockquote, etc.
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
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

  // Reflejar cambios de readOnly tras montar (ej: firma de la nota)
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [readOnly, editor]);

  if (!editor) return null;

  return (
    <div
      className="rte-wrapper"
      style={{
        position: "relative",
        border: "1px solid var(--color-kp-border)",
        borderRadius: 8,
        background: "var(--color-surface-1)",
      }}
    >
      {!readOnly && <Toolbar editor={editor} />}
      <div style={{ position: "relative" }}>
        <EditorContent editor={editor} />
        {!editor.getText() && placeholder && (
          <div
            aria-hidden
            style={{
              position: "absolute", top: 0, left: 0,
              padding: "0.75rem", width: "100%",
              color: "var(--color-ink-3)", pointerEvents: "none",
              fontSize: 14, whiteSpace: "nowrap",
              overflow: "hidden", textOverflow: "ellipsis",
            }}
          >
            {placeholder}
          </div>
        )}
      </div>
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
