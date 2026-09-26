import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface BackLinkProps {
  href: string;
  label: ReactNode;
  intermediate?: { href: string; label: ReactNode };
  current?: ReactNode;
  className?: string;
}

export function BackLink({
  href,
  label,
  intermediate,
  current,
  className,
}: BackLinkProps) {
  return (
    <div
      className={cn("flex items-center gap-1.5 text-sm text-ink-3", className)}
    >
      <Link
        href={href}
        className="flex items-center gap-1 hover:text-kp-accent transition-colors"
      >
        <ChevronLeft className="w-4 h-4 shrink-0" />
        {label}
      </Link>
      {intermediate && (
        <>
          <span>/</span>
          <Link
            href={intermediate.href}
            className="hover:text-kp-accent transition-colors truncate max-w-[160px]"
          >
            {intermediate.label}
          </Link>
        </>
      )}
      {current && (
        <>
          <span>/</span>
          <span className="text-ink-2 font-medium truncate">{current}</span>
        </>
      )}
    </div>
  );
}
