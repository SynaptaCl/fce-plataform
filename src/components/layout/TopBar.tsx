import type { ReactNode } from "react";

interface TopBarProps {
  /** Breadcrumb label derived from the current route */
  breadcrumb: ReactNode;
  /** Additional actions/controls rendered on the right side */
  children?: ReactNode;
}

/**
 * Returns the current date formatted in Spanish with America/Santiago timezone.
 * Example: "vie, 1 de mayo 2026"
 */
function getSantiagoDate(): string {
  const now = new Date();
  const weekday = now.toLocaleDateString("es-CL", {
    timeZone: "America/Santiago",
    weekday: "short",
  });
  const day = now.toLocaleDateString("es-CL", {
    timeZone: "America/Santiago",
    day: "numeric",
  });
  const month = now.toLocaleDateString("es-CL", {
    timeZone: "America/Santiago",
    month: "long",
  });
  const year = now.toLocaleDateString("es-CL", {
    timeZone: "America/Santiago",
    year: "numeric",
  });
  // Trim trailing period that es-CL sometimes adds to weekday abbreviations
  const weekdayClean = weekday.replace(/\.$/, "");
  return `${weekdayClean}, ${day} de ${month} ${year}`;
}

export function TopBar({ breadcrumb, children }: TopBarProps) {
  const dateLabel = getSantiagoDate();

  return (
    <header
      style={{
        height: 48,
        minHeight: 48,
        background: "var(--color-surface-1, #FFFFFF)",
        borderBottom: "0.5px solid var(--color-kp-border, #E2E8F0)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingLeft: 20,
        paddingRight: 20,
        zIndex: 10,
        flexShrink: 0,
      }}
    >
      {/* Left: breadcrumb */}
      <nav
        aria-label="breadcrumb"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 14,
          fontWeight: 600,
          color: "var(--color-ink-1, #1E293B)",
        }}
      >
        {breadcrumb}
      </nav>

      {/* Right: date + optional children */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        {children}
        <span
          style={{
            fontSize: 13,
            color: "var(--color-ink-3, #94A3B8)",
            whiteSpace: "nowrap",
          }}
        >
          {dateLabel}
        </span>
      </div>
    </header>
  );
}
