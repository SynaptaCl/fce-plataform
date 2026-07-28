import type { Metadata } from "next";
import { headers } from "next/headers";
import { DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "FCE — Plataforma Clínica",
    template: "%s | FCE",
  },
  description:
    "Ficha Clínica Electrónica multi-tenant — fce-plataform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Leer headers() fuerza dynamic rendering: requisito de Next.js para que el
  // nonce de CSP (generado por-request en src/proxy.ts) se inyecte en los
  // <script> del framework. Sin esto, rutas sin otra fuente de dynamism
  // (ej. /login, que no lee cookies) se prerenderizan estáticas sin nonce,
  // el CSP bloquea el JS y React nunca hidrata.
  await headers();

  return (
    <html
      lang="es-CL"
      className={`h-full antialiased ${dmSans.variable} ${dmMono.variable}`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
