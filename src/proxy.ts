import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Proxy (middleware Next 16). Tres responsabilidades:
 *
 * 1. Refresh de sesión Supabase (patrón @supabase/ssr).
 * 2. Gate optimista de auth: si se accede a /dashboard sin cookie de sesión,
 *    redirige a /login antes de renderizar. Es una verificación OPTIMISTA
 *    (presencia de cookie) — la autorización real vive en el layout y RLS.
 * 3. CSP con nonce por-request: elimina 'unsafe-inline' (vector principal de XSS)
 *    reemplazándolo por un nonce que Next.js aplica automáticamente a sus scripts.
 */

const PUBLIC_PATHS = ['/login']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => c.name.startsWith('sb-'))
}

function buildNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString('base64')
}

export async function proxy(request: NextRequest) {
  // ── 1. Gate optimista de auth (defense-in-depth) ──────────────────────────
  const { pathname } = request.nextUrl
  if (pathname.startsWith('/dashboard') && !isPublicPath(pathname) && !hasSessionCookie(request)) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // ── 2. CSP con nonce por-request ──────────────────────────────────────────
  // El nonce y el CSP deben viajar en los REQUEST headers para que Next.js
  // extraiga el nonce durante el SSR y lo aplique automáticamente a sus scripts
  // de hidratación. Si solo se setean en el response, los scripts quedan sin
  // nonce, el CSP los bloquea y React no se hidrata (los <form> se envían como
  // GET nativo). Ver: node_modules/next/dist/docs/.../content-security-policy.md
  const nonce = buildNonce()
  const isDev = process.env.NODE_ENV === 'development'

  // 'unsafe-eval' se mantiene en producción porque html2pdf.js (generación de
  // PDFs clínicos en el navegador) usa el constructor Function(). La migración
  // de PDF a server-side eliminaría esta excepción. 'unsafe-inline' fue
  // eliminado y reemplazado por el nonce — este es el mitigante principal de XSS.
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : " 'unsafe-eval'"} https://va.vercel-scripts.com`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data: https://*.supabase.co`,
    `font-src 'self'`,
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://id.who.int https://icd.who.int https://*.ingest.sentry.io https://va.vercel-scripts.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ')

  // Clonar los headers del request e inyectar nonce + CSP. Estos headers
  // llegan al renderizador de Next.js, que extrae el nonce del CSP y lo aplica
  // a framework scripts, bundles de página y scripts/estilos inline.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Al reconstruir el response hay que conservar los request headers
          // modificados, de lo contrario el nonce se pierde para esta petición.
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresca el token sin leer data del usuario — patrón correcto para proxy
  await supabase.auth.getUser()

  // El CSP también debe estar en el response para que el navegador lo reciba.
  supabaseResponse.headers.set('x-nonce', nonce)
  supabaseResponse.headers.set('Content-Security-Policy', csp)

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
