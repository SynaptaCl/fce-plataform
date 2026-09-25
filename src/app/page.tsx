// src/app/page.tsx
import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LandingPage from "@/components/landing/LandingPage";
import "./landing.css";

export const metadata: Metadata = {
  title: { absolute: "Kliniva · Ficha Clínica Electrónica para clínicas" },
  description:
    "Plataforma de ficha clínica electrónica multi-tenant para clínicas chilenas: consentimientos con firma electrónica, recetas, órdenes de examen, presupuestos e informes. Interoperable FHIR.",
};

export default async function Home() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Sesión activa → directo al espacio de trabajo
  if (user) {
    redirect("/dashboard");
  }

  return <LandingPage />;
}
