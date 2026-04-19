"use client";

import type { FceTokens } from "@/lib/modules/registry";

interface BrandingInjectorProps {
  tokens: FceTokens;
}

/**
 * Inyecta los tokens de branding de la clínica como CSS custom properties en :root.
 * Tailwind v4 usa --color-kp-* para sus utility classes (text-kp-primary, bg-kp-accent, etc.).
 * El <style> tag no layered overridea los valores @theme inline de globals.css (fallback).
 */
export function BrandingInjector({ tokens }: BrandingInjectorProps) {
  const css =
    `:root{` +
    `--color-kp-primary:${tokens.primary};` +
    `--color-kp-primary-deep:${tokens["primary-deep"]};` +
    `--color-kp-accent:${tokens.accent};` +
    `--color-kp-accent-lt:${tokens["accent-lt"]};` +
    `--color-kp-secondary:${tokens.secondary};` +
    `--color-kp-primary-hover:${tokens["primary-hover"]};` +
    `}`;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
