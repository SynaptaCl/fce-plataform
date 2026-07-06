"use client";

import type { FceTokens } from "@/lib/modules/registry";
import { DEFAULT_FCE_TOKENS } from "@/lib/modules/registry";
import { log } from "@/lib/logger";

interface BrandingInjectorProps {
  tokens: FceTokens;
}

/**
 * Formato válido de color CSS: hex (#rgb..#rrggbbaa), rgb/rgba(), hsl/hsla().
 * Cualquier otro valor se rechaza para evitar un breakout de <style> — p.ej.
 * `#000;}</style><img onerror=...>` inyectaría markup ejecutable en el DOM.
 */
const COLOR_RE = /^(#[0-9a-fA-F]{3,8}|rgba?\(\s*[\d.,\s%]+\)|hsla?\(\s*[\d.,\s%deg]+\))$/;

function safeToken(key: keyof FceTokens, value: string): string {
  if (typeof value === "string" && COLOR_RE.test(value.trim())) return value.trim();
  log("warn", { action: "branding_token_invalido", detail: key, valorLen: String(value ?? "").length });
  return DEFAULT_FCE_TOKENS[key];
}

/**
 * Inyecta los tokens de branding de la clínica como CSS custom properties en :root.
 * Tailwind v4 usa --color-kp-* para sus utility classes (text-kp-primary, bg-kp-accent, etc.).
 * El <style> tag no layered overridea los valores @theme inline de globals.css (fallback).
 *
 * Cada valor se valida contra COLOR_RE antes de interpolar — este repo se defiende solo,
 * sin confiar en la validación del panel synapta que escribe clinicas.config.branding.
 */
export function BrandingInjector({ tokens }: BrandingInjectorProps) {
  const css =
    `:root{` +
    `--color-kp-primary:${safeToken("primary", tokens.primary)};` +
    `--color-kp-primary-deep:${safeToken("primary-deep", tokens["primary-deep"])};` +
    `--color-kp-accent:${safeToken("accent", tokens.accent)};` +
    `--color-kp-accent-lt:${safeToken("accent-lt", tokens["accent-lt"])};` +
    `--color-kp-secondary:${safeToken("secondary", tokens.secondary)};` +
    `--color-kp-primary-hover:${safeToken("primary-hover", tokens["primary-hover"])};` +
    `}`;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
