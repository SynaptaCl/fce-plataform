export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_user_profesionales: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          id_admin_user: string
          id_profesional: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          id_admin_user: string
          id_profesional: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          id_admin_user?: string
          id_profesional?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_user_profesionales_id_admin_user_fkey"
            columns: ["id_admin_user"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_user_profesionales_id_profesional_fkey"
            columns: ["id_profesional"]
            isOneToOne: true
            referencedRelation: "profesionales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_user_profesionales_id_profesional_fkey"
            columns: ["id_profesional"]
            isOneToOne: true
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_profesional"]
          },
        ]
      }
      admin_users: {
        Row: {
          activo: boolean
          auth_id: string
          created_at: string | null
          email: string
          id: string
          id_clinica: string
          nombre: string
          rol: string
          telefono: string | null
          whatsapp_optin: boolean
          whatsapp_optin_at: string | null
          whatsapp_optin_canal: string | null
        }
        Insert: {
          activo?: boolean
          auth_id: string
          created_at?: string | null
          email: string
          id?: string
          id_clinica: string
          nombre: string
          rol?: string
          telefono?: string | null
          whatsapp_optin?: boolean
          whatsapp_optin_at?: string | null
          whatsapp_optin_canal?: string | null
        }
        Update: {
          activo?: boolean
          auth_id?: string
          created_at?: string | null
          email?: string
          id?: string
          id_clinica?: string
          nombre?: string
          rol?: string
          telefono?: string | null
          whatsapp_optin?: boolean
          whatsapp_optin_at?: string | null
          whatsapp_optin_canal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      citas: {
        Row: {
          anulada_at: string | null
          anulada_motivo: string | null
          anulada_por: string | null
          canal_origen: Database["public"]["Enums"]["canal_contacto"]
          confirmada_at: string | null
          confirmada_por: Database["public"]["Enums"]["canal_contacto"] | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_cita"]
          expira_pago_at: string | null
          id: string
          id_clinica: string
          id_disponibilidad: string
          id_paciente: string
          id_pago: string | null
          id_profesional: string
          id_profesional_servicio: string | null
          metadata: Json | null
          notas: string | null
          recordatorio_24h: boolean | null
          recordatorio_2h: boolean | null
          requiere_pago: boolean | null
          updated_at: string
        }
        Insert: {
          anulada_at?: string | null
          anulada_motivo?: string | null
          anulada_por?: string | null
          canal_origen?: Database["public"]["Enums"]["canal_contacto"]
          confirmada_at?: string | null
          confirmada_por?: Database["public"]["Enums"]["canal_contacto"] | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_cita"]
          expira_pago_at?: string | null
          id?: string
          id_clinica: string
          id_disponibilidad: string
          id_paciente: string
          id_pago?: string | null
          id_profesional: string
          id_profesional_servicio?: string | null
          metadata?: Json | null
          notas?: string | null
          recordatorio_24h?: boolean | null
          recordatorio_2h?: boolean | null
          requiere_pago?: boolean | null
          updated_at?: string
        }
        Update: {
          anulada_at?: string | null
          anulada_motivo?: string | null
          anulada_por?: string | null
          canal_origen?: Database["public"]["Enums"]["canal_contacto"]
          confirmada_at?: string | null
          confirmada_por?: Database["public"]["Enums"]["canal_contacto"] | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_cita"]
          expira_pago_at?: string | null
          id?: string
          id_clinica?: string
          id_disponibilidad?: string
          id_paciente?: string
          id_pago?: string | null
          id_profesional?: string
          id_profesional_servicio?: string | null
          metadata?: Json | null
          notas?: string | null
          recordatorio_24h?: boolean | null
          recordatorio_2h?: boolean | null
          requiere_pago?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "citas_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citas_id_disponibilidad_fkey"
            columns: ["id_disponibilidad"]
            isOneToOne: false
            referencedRelation: "disponibilidad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citas_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citas_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "citas_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citas_id_profesional_fkey"
            columns: ["id_profesional"]
            isOneToOne: false
            referencedRelation: "profesionales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citas_id_profesional_fkey"
            columns: ["id_profesional"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_profesional"]
          },
          {
            foreignKeyName: "citas_id_profesional_servicio_fkey"
            columns: ["id_profesional_servicio"]
            isOneToOne: false
            referencedRelation: "profesional_servicios"
            referencedColumns: ["id"]
          },
        ]
      }
      clinicas: {
        Row: {
          activa: boolean | null
          booking_config: Json
          canal_preferido: Database["public"]["Enums"]["canal_contacto"]
          canales_activos: Database["public"]["Enums"]["canal_contacto"][]
          ciudad: string | null
          comuna: string | null
          config: Json
          contrato_inicio: string | null
          contrato_meses: number | null
          convenios: string[]
          created_at: string
          direccion: string | null
          email: string | null
          id: string
          instagram_handle: string | null
          nombre: string
          owner_id: string
          permisos_cliente: Json
          plan: string
          precio_uf: number | null
          rut_empresa: string | null
          sitio_web: string | null
          slug: string | null
          status: string
          telefono: string | null
          tipo_clinica: string | null
          updated_at: string
          whatsapp_number: string | null
          whatsapp_waba_id: string | null
        }
        Insert: {
          activa?: boolean | null
          booking_config?: Json
          canal_preferido?: Database["public"]["Enums"]["canal_contacto"]
          canales_activos?: Database["public"]["Enums"]["canal_contacto"][]
          ciudad?: string | null
          comuna?: string | null
          config?: Json
          contrato_inicio?: string | null
          contrato_meses?: number | null
          convenios?: string[]
          created_at?: string
          direccion?: string | null
          email?: string | null
          id?: string
          instagram_handle?: string | null
          nombre: string
          owner_id: string
          permisos_cliente?: Json
          plan?: string
          precio_uf?: number | null
          rut_empresa?: string | null
          sitio_web?: string | null
          slug?: string | null
          status?: string
          telefono?: string | null
          tipo_clinica?: string | null
          updated_at?: string
          whatsapp_number?: string | null
          whatsapp_waba_id?: string | null
        }
        Update: {
          activa?: boolean | null
          booking_config?: Json
          canal_preferido?: Database["public"]["Enums"]["canal_contacto"]
          canales_activos?: Database["public"]["Enums"]["canal_contacto"][]
          ciudad?: string | null
          comuna?: string | null
          config?: Json
          contrato_inicio?: string | null
          contrato_meses?: number | null
          convenios?: string[]
          created_at?: string
          direccion?: string | null
          email?: string | null
          id?: string
          instagram_handle?: string | null
          nombre?: string
          owner_id?: string
          permisos_cliente?: Json
          plan?: string
          precio_uf?: number | null
          rut_empresa?: string | null
          sitio_web?: string | null
          slug?: string | null
          status?: string
          telefono?: string | null
          tipo_clinica?: string | null
          updated_at?: string
          whatsapp_number?: string | null
          whatsapp_waba_id?: string | null
        }
        Relationships: []
      }
      clinicas_branding: {
        Row: {
          accent_color: string
          clinic_initials: string | null
          clinic_short_name: string | null
          created_at: string
          id_clinica: string
          light_bg_color: string
          logo_url: string | null
          navy_color: string
          navy_deep_color: string
          primary_color: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          clinic_initials?: string | null
          clinic_short_name?: string | null
          created_at?: string
          id_clinica: string
          light_bg_color?: string
          logo_url?: string | null
          navy_color?: string
          navy_deep_color?: string
          primary_color?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          clinic_initials?: string | null
          clinic_short_name?: string | null
          created_at?: string
          id_clinica?: string
          light_bg_color?: string
          logo_url?: string | null
          navy_color?: string
          navy_deep_color?: string
          primary_color?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinicas_branding_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: true
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      clinicas_chatbot_config: {
        Row: {
          bot_activo: boolean
          bot_nombre: string
          bot_saludo: string
          contexto: string | null
          created_at: string
          faq_bot: Json
          id_clinica: string
          intent_keywords: string[]
          normas_texto: string | null
          restricciones: string[]
          tono: string | null
          updated_at: string
        }
        Insert: {
          bot_activo?: boolean
          bot_nombre?: string
          bot_saludo?: string
          contexto?: string | null
          created_at?: string
          faq_bot?: Json
          id_clinica: string
          intent_keywords?: string[]
          normas_texto?: string | null
          restricciones?: string[]
          tono?: string | null
          updated_at?: string
        }
        Update: {
          bot_activo?: boolean
          bot_nombre?: string
          bot_saludo?: string
          contexto?: string | null
          created_at?: string
          faq_bot?: Json
          id_clinica?: string
          intent_keywords?: string[]
          normas_texto?: string | null
          restricciones?: string[]
          tono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinicas_chatbot_config_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: true
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      clinicas_fce_config: {
        Row: {
          config_modulos: Json
          created_at: string
          especialidades_activas: string[]
          id_clinica: string
          modulos_activos: string[]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config_modulos?: Json
          created_at?: string
          especialidades_activas?: string[]
          id_clinica: string
          modulos_activos?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config_modulos?: Json
          created_at?: string
          especialidades_activas?: string[]
          id_clinica?: string
          modulos_activos?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinicas_fce_config_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: true
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      clinicas_pagos_config: {
        Row: {
          abono_note: string | null
          abono_requerido: boolean
          cancel_note: string | null
          created_at: string
          descuento_max_pct: number
          flow_merchant_approved_at: string | null
          flow_merchant_id: string | null
          flow_merchant_requested_at: string | null
          flow_merchant_status: number | null
          horas_alerta_prepago: number | null
          id_clinica: string
          metodos_aceptados: string[]
          minutos_expiracion_link: number
          modalidades_atencion: string[]
          modelo_precio: string
          monto_abono_default: number
          permite_descuento_item: boolean
          proveedor_electronico: string | null
          sin_permanencia: boolean
          trial_dias: number | null
          updated_at: string
        }
        Insert: {
          abono_note?: string | null
          abono_requerido?: boolean
          cancel_note?: string | null
          created_at?: string
          descuento_max_pct?: number
          flow_merchant_approved_at?: string | null
          flow_merchant_id?: string | null
          flow_merchant_requested_at?: string | null
          flow_merchant_status?: number | null
          horas_alerta_prepago?: number | null
          id_clinica: string
          metodos_aceptados?: string[]
          minutos_expiracion_link?: number
          modalidades_atencion?: string[]
          modelo_precio?: string
          monto_abono_default?: number
          permite_descuento_item?: boolean
          proveedor_electronico?: string | null
          sin_permanencia?: boolean
          trial_dias?: number | null
          updated_at?: string
        }
        Update: {
          abono_note?: string | null
          abono_requerido?: boolean
          cancel_note?: string | null
          created_at?: string
          descuento_max_pct?: number
          flow_merchant_approved_at?: string | null
          flow_merchant_id?: string | null
          flow_merchant_requested_at?: string | null
          flow_merchant_status?: number | null
          horas_alerta_prepago?: number | null
          id_clinica?: string
          metodos_aceptados?: string[]
          minutos_expiracion_link?: number
          modalidades_atencion?: string[]
          modelo_precio?: string
          monto_abono_default?: number
          permite_descuento_item?: boolean
          proveedor_electronico?: string | null
          sin_permanencia?: boolean
          trial_dias?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinicas_pagos_config_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: true
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      clinicas_whatsapp: {
        Row: {
          access_token_encrypted: string
          activo: boolean
          created_at: string
          display_phone_number: string
          environment: string
          id: string
          id_clinica: string
          messaging_limit_tier: string | null
          phone_number_id: string
          quality_rating: string | null
          quality_rating_updated: string | null
          sms_fallback_enabled: boolean | null
          sms_provider: string | null
          sms_provider_config: Json | null
          updated_at: string
          verify_token: string
          waba_id: string
        }
        Insert: {
          access_token_encrypted: string
          activo?: boolean
          created_at?: string
          display_phone_number: string
          environment?: string
          id?: string
          id_clinica: string
          messaging_limit_tier?: string | null
          phone_number_id: string
          quality_rating?: string | null
          quality_rating_updated?: string | null
          sms_fallback_enabled?: boolean | null
          sms_provider?: string | null
          sms_provider_config?: Json | null
          updated_at?: string
          verify_token: string
          waba_id: string
        }
        Update: {
          access_token_encrypted?: string
          activo?: boolean
          created_at?: string
          display_phone_number?: string
          environment?: string
          id?: string
          id_clinica?: string
          messaging_limit_tier?: string | null
          phone_number_id?: string
          quality_rating?: string | null
          quality_rating_updated?: string | null
          sms_fallback_enabled?: boolean | null
          sms_provider?: string | null
          sms_provider_config?: Json | null
          updated_at?: string
          verify_token?: string
          waba_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinicas_whatsapp_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      consentimiento_tokens: {
        Row: {
          created_at: string
          expira_at: string
          id: string
          id_cita: string | null
          id_clinica: string
          id_paciente: string
          token_hash: string
          usado_at: string | null
        }
        Insert: {
          created_at?: string
          expira_at: string
          id?: string
          id_cita?: string | null
          id_clinica: string
          id_paciente: string
          token_hash: string
          usado_at?: string | null
        }
        Update: {
          created_at?: string
          expira_at?: string
          id?: string
          id_cita?: string | null
          id_clinica?: string
          id_paciente?: string
          token_hash?: string
          usado_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consentimiento_tokens_id_cita_fkey"
            columns: ["id_cita"]
            isOneToOne: false
            referencedRelation: "citas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consentimiento_tokens_id_cita_fkey"
            columns: ["id_cita"]
            isOneToOne: false
            referencedRelation: "citas_hoy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consentimiento_tokens_id_cita_fkey"
            columns: ["id_cita"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_cita"]
          },
          {
            foreignKeyName: "consentimiento_tokens_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consentimiento_tokens_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consentimiento_tokens_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "consentimiento_tokens_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
        ]
      }
      conversaciones: {
        Row: {
          canal: Database["public"]["Enums"]["canal_contacto"]
          contenido: string
          costo_estimado: number | null
          created_at: string
          id: string
          id_clinica: string
          id_paciente: string | null
          metadata: Json | null
          rol: Database["public"]["Enums"]["rol_mensaje"]
          session_id: string
          tokens_input: number | null
          tokens_output: number | null
        }
        Insert: {
          canal?: Database["public"]["Enums"]["canal_contacto"]
          contenido: string
          costo_estimado?: number | null
          created_at?: string
          id?: string
          id_clinica: string
          id_paciente?: string | null
          metadata?: Json | null
          rol: Database["public"]["Enums"]["rol_mensaje"]
          session_id: string
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Update: {
          canal?: Database["public"]["Enums"]["canal_contacto"]
          contenido?: string
          costo_estimado?: number | null
          created_at?: string
          id?: string
          id_clinica?: string
          id_paciente?: string | null
          metadata?: Json | null
          rol?: Database["public"]["Enums"]["rol_mensaje"]
          session_id?: string
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conversaciones_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversaciones_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversaciones_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "conversaciones_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_requests: {
        Row: {
          created_at: string
          email: string | null
          id: number
          ip_address: string | null
          nombre: string | null
          origen_seccion: string
          telefono: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: never
          ip_address?: string | null
          nombre?: string | null
          origen_seccion: string
          telefono?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: never
          ip_address?: string | null
          nombre?: string | null
          origen_seccion?: string
          telefono?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      disponibilidad: {
        Row: {
          created_at: string
          estado: string
          fecha: string
          hora_fin: string
          hora_inicio: string
          id: string
          id_clinica: string
          id_profesional: string
        }
        Insert: {
          created_at?: string
          estado?: string
          fecha: string
          hora_fin: string
          hora_inicio: string
          id?: string
          id_clinica: string
          id_profesional: string
        }
        Update: {
          created_at?: string
          estado?: string
          fecha?: string
          hora_fin?: string
          hora_inicio?: string
          id?: string
          id_clinica?: string
          id_profesional?: string
        }
        Relationships: [
          {
            foreignKeyName: "disponibilidad_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disponibilidad_id_profesional_fkey"
            columns: ["id_profesional"]
            isOneToOne: false
            referencedRelation: "profesionales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disponibilidad_id_profesional_fkey"
            columns: ["id_profesional"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_profesional"]
          },
        ]
      }
      email_logs: {
        Row: {
          asunto: string
          created_at: string | null
          destinatario: string
          error_message: string | null
          estado: string
          id: string
          id_clinica: string | null
          metadata: Json | null
          resend_id: string | null
          template: string
        }
        Insert: {
          asunto: string
          created_at?: string | null
          destinatario: string
          error_message?: string | null
          estado?: string
          id?: string
          id_clinica?: string | null
          metadata?: Json | null
          resend_id?: string | null
          template: string
        }
        Update: {
          asunto?: string
          created_at?: string | null
          destinatario?: string
          error_message?: string | null
          estado?: string
          id?: string
          id_clinica?: string | null
          metadata?: Json | null
          resend_id?: string | null
          template?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      especialidades_catalogo: {
        Row: {
          activa: boolean
          codigo: string
          created_at: string
          label: string
          orden: number
        }
        Insert: {
          activa?: boolean
          codigo: string
          created_at?: string
          label: string
          orden?: number
        }
        Update: {
          activa?: boolean
          codigo?: string
          created_at?: string
          label?: string
          orden?: number
        }
        Relationships: []
      }
      examenes_catalogo: {
        Row: {
          activo: boolean
          categoria: string
          codigo: string
          codigo_fonasa: string | null
          created_at: string
          descripcion: string | null
          especialidades_comunes: string[] | null
          id: string
          indicaciones_comunes: string[] | null
          muestra_requerida: string | null
          nivel_fonasa: number | null
          nombre: string
          nombre_corto: string | null
          orden: number
          preparacion_paciente: string | null
          requiere_preparacion: boolean
          subcategoria: string | null
          updated_at: string
          valores_referencia: string | null
        }
        Insert: {
          activo?: boolean
          categoria: string
          codigo: string
          codigo_fonasa?: string | null
          created_at?: string
          descripcion?: string | null
          especialidades_comunes?: string[] | null
          id?: string
          indicaciones_comunes?: string[] | null
          muestra_requerida?: string | null
          nivel_fonasa?: number | null
          nombre: string
          nombre_corto?: string | null
          orden?: number
          preparacion_paciente?: string | null
          requiere_preparacion?: boolean
          subcategoria?: string | null
          updated_at?: string
          valores_referencia?: string | null
        }
        Update: {
          activo?: boolean
          categoria?: string
          codigo?: string
          codigo_fonasa?: string | null
          created_at?: string
          descripcion?: string | null
          especialidades_comunes?: string[] | null
          id?: string
          indicaciones_comunes?: string[] | null
          muestra_requerida?: string | null
          nivel_fonasa?: number | null
          nombre?: string
          nombre_corto?: string | null
          orden?: number
          preparacion_paciente?: string | null
          requiere_preparacion?: boolean
          subcategoria?: string | null
          updated_at?: string
          valores_referencia?: string | null
        }
        Relationships: []
      }
      fce_adendas: {
        Row: {
          contenido: string
          created_at: string
          created_by: string
          firmado: boolean
          firmado_at: string | null
          firmado_por: string | null
          id: string
          id_clinica: string
          id_documento: string
          id_encuentro: string | null
          id_paciente: string
          motivo: string
          override_director: boolean
          override_motivo: string | null
          override_por: string | null
          tipo_adenda: string
          tipo_documento: string
          updated_at: string
        }
        Insert: {
          contenido: string
          created_at?: string
          created_by: string
          firmado?: boolean
          firmado_at?: string | null
          firmado_por?: string | null
          id?: string
          id_clinica: string
          id_documento: string
          id_encuentro?: string | null
          id_paciente: string
          motivo: string
          override_director?: boolean
          override_motivo?: string | null
          override_por?: string | null
          tipo_adenda: string
          tipo_documento: string
          updated_at?: string
        }
        Update: {
          contenido?: string
          created_at?: string
          created_by?: string
          firmado?: boolean
          firmado_at?: string | null
          firmado_por?: string | null
          id?: string
          id_clinica?: string
          id_documento?: string
          id_encuentro?: string | null
          id_paciente?: string
          motivo?: string
          override_director?: boolean
          override_motivo?: string | null
          override_por?: string | null
          tipo_adenda?: string
          tipo_documento?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fce_adendas_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_adendas_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "fce_encuentros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_adendas_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_encuentro"]
          },
          {
            foreignKeyName: "fce_adendas_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_adendas_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "fce_adendas_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
        ]
      }
      fce_anamnesis: {
        Row: {
          alergias: Json | null
          antecedentes_medicos: Json | null
          antecedentes_quirurgicos: Json | null
          created_at: string | null
          created_by: string | null
          embarazo_activo: boolean
          farmacologia: Json | null
          fecha_eval_gestacional: string | null
          fur: string | null
          habitos: Json | null
          id: string
          id_clinica: string
          id_paciente: string
          motivo_consulta: string | null
          red_flags: Json | null
          semana_gestacional_base: number | null
          updated_at: string | null
        }
        Insert: {
          alergias?: Json | null
          antecedentes_medicos?: Json | null
          antecedentes_quirurgicos?: Json | null
          created_at?: string | null
          created_by?: string | null
          embarazo_activo?: boolean
          farmacologia?: Json | null
          fecha_eval_gestacional?: string | null
          fur?: string | null
          habitos?: Json | null
          id?: string
          id_clinica: string
          id_paciente: string
          motivo_consulta?: string | null
          red_flags?: Json | null
          semana_gestacional_base?: number | null
          updated_at?: string | null
        }
        Update: {
          alergias?: Json | null
          antecedentes_medicos?: Json | null
          antecedentes_quirurgicos?: Json | null
          created_at?: string | null
          created_by?: string | null
          embarazo_activo?: boolean
          farmacologia?: Json | null
          fecha_eval_gestacional?: string | null
          fur?: string | null
          habitos?: Json | null
          id?: string
          id_clinica?: string
          id_paciente?: string
          motivo_consulta?: string | null
          red_flags?: Json | null
          semana_gestacional_base?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fce_anamnesis_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profesionales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_anamnesis_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_profesional"]
          },
          {
            foreignKeyName: "fce_anamnesis_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_anamnesis_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_anamnesis_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "fce_anamnesis_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
        ]
      }
      fce_antropometria: {
        Row: {
          circ_cadera_cm: number | null
          circ_cintura_cm: number | null
          clasificacion: string | null
          created_at: string
          edad_meses_registro: number | null
          formula_grasa: string | null
          id: string
          id_clinica: string
          id_encuentro: string | null
          id_paciente: string
          imc: number | null
          imc_pregestacional: number | null
          masa_magra_kg: number | null
          modo: string
          observaciones: string | null
          perc_grasa: number | null
          percentil_imc: number | null
          peso_kg: number
          pliegues: Json | null
          rango_ganancia_max: number | null
          rango_ganancia_min: number | null
          registrado_at: string
          registrado_por: string
          riesgo_cintura: string | null
          semana_gestacional: number | null
          talla_cm: number
          zscore_imc: number | null
          zscore_peso: number | null
          zscore_talla: number | null
        }
        Insert: {
          circ_cadera_cm?: number | null
          circ_cintura_cm?: number | null
          clasificacion?: string | null
          created_at?: string
          edad_meses_registro?: number | null
          formula_grasa?: string | null
          id?: string
          id_clinica: string
          id_encuentro?: string | null
          id_paciente: string
          imc?: number | null
          imc_pregestacional?: number | null
          masa_magra_kg?: number | null
          modo?: string
          observaciones?: string | null
          perc_grasa?: number | null
          percentil_imc?: number | null
          peso_kg: number
          pliegues?: Json | null
          rango_ganancia_max?: number | null
          rango_ganancia_min?: number | null
          registrado_at?: string
          registrado_por: string
          riesgo_cintura?: string | null
          semana_gestacional?: number | null
          talla_cm: number
          zscore_imc?: number | null
          zscore_peso?: number | null
          zscore_talla?: number | null
        }
        Update: {
          circ_cadera_cm?: number | null
          circ_cintura_cm?: number | null
          clasificacion?: string | null
          created_at?: string
          edad_meses_registro?: number | null
          formula_grasa?: string | null
          id?: string
          id_clinica?: string
          id_encuentro?: string | null
          id_paciente?: string
          imc?: number | null
          imc_pregestacional?: number | null
          masa_magra_kg?: number | null
          modo?: string
          observaciones?: string | null
          perc_grasa?: number | null
          percentil_imc?: number | null
          peso_kg?: number
          pliegues?: Json | null
          rango_ganancia_max?: number | null
          rango_ganancia_min?: number | null
          registrado_at?: string
          registrado_por?: string
          riesgo_cintura?: string | null
          semana_gestacional?: number | null
          talla_cm?: number
          zscore_imc?: number | null
          zscore_peso?: number | null
          zscore_talla?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fce_antropometria_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_antropometria_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "fce_encuentros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_antropometria_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_encuentro"]
          },
          {
            foreignKeyName: "fce_antropometria_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_antropometria_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "fce_antropometria_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
        ]
      }
      fce_consentimientos: {
        Row: {
          contenido: string
          created_at: string | null
          created_by: string | null
          firma_paciente: Json | null
          firma_profesional: Json | null
          firmado: boolean
          firmado_at: string | null
          id: string
          id_clinica: string
          id_paciente: string
          tipo: string
          updated_at: string | null
          version: number
        }
        Insert: {
          contenido: string
          created_at?: string | null
          created_by?: string | null
          firma_paciente?: Json | null
          firma_profesional?: Json | null
          firmado?: boolean
          firmado_at?: string | null
          id?: string
          id_clinica: string
          id_paciente: string
          tipo: string
          updated_at?: string | null
          version?: number
        }
        Update: {
          contenido?: string
          created_at?: string | null
          created_by?: string | null
          firma_paciente?: Json | null
          firma_profesional?: Json | null
          firmado?: boolean
          firmado_at?: string | null
          id?: string
          id_clinica?: string
          id_paciente?: string
          tipo?: string
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fce_consentimientos_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_consentimientos_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_consentimientos_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "fce_consentimientos_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
        ]
      }
      fce_egresos: {
        Row: {
          created_at: string
          created_by: string
          derivacion_a: string | null
          diagnostico_egreso: string
          estado_al_egreso: string | null
          firmado: boolean
          firmado_at: string | null
          firmado_por: string | null
          id: string
          id_clinica: string
          id_encuentro: string | null
          id_paciente: string
          indicaciones_post_egreso: string | null
          notas: string | null
          resumen_tratamiento: string
          snapshot_equipo_tratante: Json | null
          tipo_egreso: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          derivacion_a?: string | null
          diagnostico_egreso: string
          estado_al_egreso?: string | null
          firmado?: boolean
          firmado_at?: string | null
          firmado_por?: string | null
          id?: string
          id_clinica: string
          id_encuentro?: string | null
          id_paciente: string
          indicaciones_post_egreso?: string | null
          notas?: string | null
          resumen_tratamiento: string
          snapshot_equipo_tratante?: Json | null
          tipo_egreso: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          derivacion_a?: string | null
          diagnostico_egreso?: string
          estado_al_egreso?: string | null
          firmado?: boolean
          firmado_at?: string | null
          firmado_por?: string | null
          id?: string
          id_clinica?: string
          id_encuentro?: string | null
          id_paciente?: string
          indicaciones_post_egreso?: string | null
          notas?: string | null
          resumen_tratamiento?: string
          snapshot_equipo_tratante?: Json | null
          tipo_egreso?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fce_egresos_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_egresos_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "fce_encuentros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_egresos_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_encuentro"]
          },
          {
            foreignKeyName: "fce_egresos_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_egresos_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "fce_egresos_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
        ]
      }
      fce_encuentros: {
        Row: {
          created_at: string | null
          ended_at: string | null
          especialidad: string
          id: string
          id_cita: string | null
          id_clinica: string
          id_paciente: string
          id_profesional: string | null
          modalidad: string
          started_at: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          ended_at?: string | null
          especialidad: string
          id?: string
          id_cita?: string | null
          id_clinica: string
          id_paciente: string
          id_profesional?: string | null
          modalidad?: string
          started_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          ended_at?: string | null
          especialidad?: string
          id?: string
          id_cita?: string | null
          id_clinica?: string
          id_paciente?: string
          id_profesional?: string | null
          modalidad?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fce_encuentros_especialidad_fkey"
            columns: ["especialidad"]
            isOneToOne: false
            referencedRelation: "especialidades_catalogo"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "fce_encuentros_id_cita_fkey"
            columns: ["id_cita"]
            isOneToOne: false
            referencedRelation: "citas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_encuentros_id_cita_fkey"
            columns: ["id_cita"]
            isOneToOne: false
            referencedRelation: "citas_hoy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_encuentros_id_cita_fkey"
            columns: ["id_cita"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_cita"]
          },
          {
            foreignKeyName: "fce_encuentros_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_encuentros_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_encuentros_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "fce_encuentros_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_encuentros_id_profesional_fkey"
            columns: ["id_profesional"]
            isOneToOne: false
            referencedRelation: "profesionales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_encuentros_id_profesional_fkey"
            columns: ["id_profesional"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_profesional"]
          },
        ]
      }
      fce_evaluaciones: {
        Row: {
          contraindicaciones_certificadas: Json | null
          created_at: string | null
          created_by: string | null
          data: Json
          especialidad: string
          id: string
          id_clinica: string
          id_encuentro: string | null
          id_paciente: string
          sub_area: string | null
        }
        Insert: {
          contraindicaciones_certificadas?: Json | null
          created_at?: string | null
          created_by?: string | null
          data?: Json
          especialidad: string
          id?: string
          id_clinica: string
          id_encuentro?: string | null
          id_paciente: string
          sub_area?: string | null
        }
        Update: {
          contraindicaciones_certificadas?: Json | null
          created_at?: string | null
          created_by?: string | null
          data?: Json
          especialidad?: string
          id?: string
          id_clinica?: string
          id_encuentro?: string | null
          id_paciente?: string
          sub_area?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fce_evaluaciones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profesionales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_evaluaciones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_profesional"]
          },
          {
            foreignKeyName: "fce_evaluaciones_especialidad_fkey"
            columns: ["especialidad"]
            isOneToOne: false
            referencedRelation: "especialidades_catalogo"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "fce_evaluaciones_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_evaluaciones_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "fce_encuentros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_evaluaciones_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_encuentro"]
          },
          {
            foreignKeyName: "fce_evaluaciones_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_evaluaciones_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "fce_evaluaciones_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
        ]
      }
      fce_ficha_estetica_fotos: {
        Row: {
          created_by: string
          id: string
          id_clinica: string
          id_ficha_estetica: string | null
          id_paciente: string
          region: string | null
          storage_path: string
          tipo: string
          tomada_at: string
          zona_codigo: string | null
        }
        Insert: {
          created_by: string
          id?: string
          id_clinica: string
          id_ficha_estetica?: string | null
          id_paciente: string
          region?: string | null
          storage_path: string
          tipo: string
          tomada_at: string
          zona_codigo?: string | null
        }
        Update: {
          created_by?: string
          id?: string
          id_clinica?: string
          id_ficha_estetica?: string | null
          id_paciente?: string
          region?: string | null
          storage_path?: string
          tipo?: string
          tomada_at?: string
          zona_codigo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fce_ficha_estetica_fotos_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_ficha_estetica_fotos_id_ficha_estetica_fkey"
            columns: ["id_ficha_estetica"]
            isOneToOne: false
            referencedRelation: "fce_fichas_esteticas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_ficha_estetica_fotos_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_ficha_estetica_fotos_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "fce_ficha_estetica_fotos_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
        ]
      }
      fce_ficha_estetica_zonas: {
        Row: {
          dosis: number | null
          id: string
          id_ficha_estetica: string
          id_procedimiento: string | null
          lote: string | null
          observaciones: string | null
          producto_comercial: string | null
          region: string
          tecnica: string | null
          unidad_dosis: string | null
          zona_codigo: string
        }
        Insert: {
          dosis?: number | null
          id?: string
          id_ficha_estetica: string
          id_procedimiento?: string | null
          lote?: string | null
          observaciones?: string | null
          producto_comercial?: string | null
          region: string
          tecnica?: string | null
          unidad_dosis?: string | null
          zona_codigo: string
        }
        Update: {
          dosis?: number | null
          id?: string
          id_ficha_estetica?: string
          id_procedimiento?: string | null
          lote?: string | null
          observaciones?: string | null
          producto_comercial?: string | null
          region?: string
          tecnica?: string | null
          unidad_dosis?: string | null
          zona_codigo?: string
        }
        Relationships: [
          {
            foreignKeyName: "fce_ficha_estetica_zonas_id_ficha_estetica_fkey"
            columns: ["id_ficha_estetica"]
            isOneToOne: false
            referencedRelation: "fce_fichas_esteticas"
            referencedColumns: ["id"]
          },
        ]
      }
      fce_fichas_esteticas: {
        Row: {
          created_at: string
          created_by: string
          firmado: boolean
          firmado_at: string | null
          firmado_por: string | null
          id: string
          id_clinica: string
          id_encuentro: string
          id_paciente: string
          motivo: string | null
          observaciones_generales: string | null
          tipo_ficha: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          firmado?: boolean
          firmado_at?: string | null
          firmado_por?: string | null
          id?: string
          id_clinica: string
          id_encuentro: string
          id_paciente: string
          motivo?: string | null
          observaciones_generales?: string | null
          tipo_ficha: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          firmado?: boolean
          firmado_at?: string | null
          firmado_por?: string | null
          id?: string
          id_clinica?: string
          id_encuentro?: string
          id_paciente?: string
          motivo?: string | null
          observaciones_generales?: string | null
          tipo_ficha?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fce_fichas_esteticas_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_fichas_esteticas_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "fce_encuentros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_fichas_esteticas_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_encuentro"]
          },
          {
            foreignKeyName: "fce_fichas_esteticas_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_fichas_esteticas_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "fce_fichas_esteticas_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
        ]
      }
      fce_informes: {
        Row: {
          contenido: string
          created_at: string
          destinatario: string | null
          firmado: boolean
          firmado_at: string | null
          firmado_por: string | null
          id: string
          id_clinica: string
          id_encuentro: string | null
          id_paciente: string
          id_profesional: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          contenido: string
          created_at?: string
          destinatario?: string | null
          firmado?: boolean
          firmado_at?: string | null
          firmado_por?: string | null
          id?: string
          id_clinica: string
          id_encuentro?: string | null
          id_paciente: string
          id_profesional: string
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          contenido?: string
          created_at?: string
          destinatario?: string | null
          firmado?: boolean
          firmado_at?: string | null
          firmado_por?: string | null
          id?: string
          id_clinica?: string
          id_encuentro?: string | null
          id_paciente?: string
          id_profesional?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fce_informes_firmado_por_fkey"
            columns: ["firmado_por"]
            isOneToOne: false
            referencedRelation: "profesionales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_informes_firmado_por_fkey"
            columns: ["firmado_por"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_profesional"]
          },
          {
            foreignKeyName: "fce_informes_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_informes_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "fce_encuentros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_informes_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_encuentro"]
          },
          {
            foreignKeyName: "fce_informes_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_informes_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "fce_informes_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_informes_id_profesional_fkey"
            columns: ["id_profesional"]
            isOneToOne: false
            referencedRelation: "profesionales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_informes_id_profesional_fkey"
            columns: ["id_profesional"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_profesional"]
          },
        ]
      }
      fce_notas_clinicas: {
        Row: {
          cie10_codigos: string[] | null
          contenido: string
          created_at: string
          created_by: string
          diagnostico: string | null
          firmado: boolean
          firmado_at: string | null
          firmado_por: string | null
          icd_codigos: Json
          icd_version: string | null
          id: string
          id_clinica: string
          id_encuentro: string
          id_paciente: string
          motivo_consulta: string | null
          plan: string | null
          proxima_sesion: string | null
          secciones_estructuradas: Json | null
          updated_at: string
        }
        Insert: {
          cie10_codigos?: string[] | null
          contenido: string
          created_at?: string
          created_by: string
          diagnostico?: string | null
          firmado?: boolean
          firmado_at?: string | null
          firmado_por?: string | null
          icd_codigos?: Json
          icd_version?: string | null
          id?: string
          id_clinica: string
          id_encuentro: string
          id_paciente: string
          motivo_consulta?: string | null
          plan?: string | null
          proxima_sesion?: string | null
          secciones_estructuradas?: Json | null
          updated_at?: string
        }
        Update: {
          cie10_codigos?: string[] | null
          contenido?: string
          created_at?: string
          created_by?: string
          diagnostico?: string | null
          firmado?: boolean
          firmado_at?: string | null
          firmado_por?: string | null
          icd_codigos?: Json
          icd_version?: string | null
          id?: string
          id_clinica?: string
          id_encuentro?: string
          id_paciente?: string
          motivo_consulta?: string | null
          plan?: string | null
          proxima_sesion?: string | null
          secciones_estructuradas?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fce_notas_clinicas_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_notas_clinicas_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "fce_encuentros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_notas_clinicas_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_encuentro"]
          },
          {
            foreignKeyName: "fce_notas_clinicas_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_notas_clinicas_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "fce_notas_clinicas_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
        ]
      }
      fce_notas_soap: {
        Row: {
          analisis_cif: Json | null
          created_at: string | null
          created_by: string | null
          firmado: boolean
          firmado_at: string | null
          firmado_por: string | null
          id: string
          id_clinica: string
          id_encuentro: string
          id_paciente: string
          intervenciones: Json | null
          objetivo: string | null
          plan: string | null
          proxima_sesion: string | null
          subjetivo: string | null
          tareas_domiciliarias: string | null
          updated_at: string
        }
        Insert: {
          analisis_cif?: Json | null
          created_at?: string | null
          created_by?: string | null
          firmado?: boolean
          firmado_at?: string | null
          firmado_por?: string | null
          id?: string
          id_clinica: string
          id_encuentro: string
          id_paciente: string
          intervenciones?: Json | null
          objetivo?: string | null
          plan?: string | null
          proxima_sesion?: string | null
          subjetivo?: string | null
          tareas_domiciliarias?: string | null
          updated_at?: string
        }
        Update: {
          analisis_cif?: Json | null
          created_at?: string | null
          created_by?: string | null
          firmado?: boolean
          firmado_at?: string | null
          firmado_por?: string | null
          id?: string
          id_clinica?: string
          id_encuentro?: string
          id_paciente?: string
          intervenciones?: Json | null
          objetivo?: string | null
          plan?: string | null
          proxima_sesion?: string | null
          subjetivo?: string | null
          tareas_domiciliarias?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fce_notas_soap_firmado_por_fkey"
            columns: ["firmado_por"]
            isOneToOne: false
            referencedRelation: "profesionales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_notas_soap_firmado_por_fkey"
            columns: ["firmado_por"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_profesional"]
          },
          {
            foreignKeyName: "fce_notas_soap_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_notas_soap_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "fce_encuentros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_notas_soap_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_encuentro"]
          },
          {
            foreignKeyName: "fce_notas_soap_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_notas_soap_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "fce_notas_soap_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
        ]
      }
      fce_odontograma: {
        Row: {
          created_at: string
          estado: string
          id: string
          id_clinica: string
          id_paciente: string
          movilidad: number | null
          notas: string | null
          pieza: number
          superficies: Json | null
          updated_at: string
          updated_by: string
        }
        Insert: {
          created_at?: string
          estado?: string
          id?: string
          id_clinica: string
          id_paciente: string
          movilidad?: number | null
          notas?: string | null
          pieza: number
          superficies?: Json | null
          updated_at?: string
          updated_by: string
        }
        Update: {
          created_at?: string
          estado?: string
          id?: string
          id_clinica?: string
          id_paciente?: string
          movilidad?: number | null
          notas?: string | null
          pieza?: number
          superficies?: Json | null
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "fce_odontograma_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_odontograma_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_odontograma_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "fce_odontograma_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
        ]
      }
      fce_odontograma_historial: {
        Row: {
          estado_anterior: string | null
          estado_nuevo: string
          id: string
          id_clinica: string
          id_encuentro: string
          id_odontograma: string
          id_paciente: string
          notas: string | null
          pieza: number
          procedimiento: string | null
          registrado_at: string
          registrado_por: string
          superficies_anterior: Json | null
          superficies_nuevo: Json | null
        }
        Insert: {
          estado_anterior?: string | null
          estado_nuevo: string
          id?: string
          id_clinica: string
          id_encuentro: string
          id_odontograma: string
          id_paciente: string
          notas?: string | null
          pieza: number
          procedimiento?: string | null
          registrado_at?: string
          registrado_por: string
          superficies_anterior?: Json | null
          superficies_nuevo?: Json | null
        }
        Update: {
          estado_anterior?: string | null
          estado_nuevo?: string
          id?: string
          id_clinica?: string
          id_encuentro?: string
          id_odontograma?: string
          id_paciente?: string
          notas?: string | null
          pieza?: number
          procedimiento?: string | null
          registrado_at?: string
          registrado_por?: string
          superficies_anterior?: Json | null
          superficies_nuevo?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fce_odontograma_historial_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_odontograma_historial_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "fce_encuentros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_odontograma_historial_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_encuentro"]
          },
          {
            foreignKeyName: "fce_odontograma_historial_id_odontograma_fkey"
            columns: ["id_odontograma"]
            isOneToOne: false
            referencedRelation: "fce_odontograma"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_odontograma_historial_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_odontograma_historial_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "fce_odontograma_historial_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_odontograma_historial_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profesionales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_odontograma_historial_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_profesional"]
          },
        ]
      }
      fce_ordenes_examen: {
        Row: {
          created_at: string
          created_by: string
          diagnostico_presuntivo: string | null
          estado_resultados: string
          examenes: Json
          firma_canvas: string | null
          firmado: boolean
          firmado_at: string | null
          firmado_por: string | null
          folio_anio: number
          folio_display: string | null
          folio_numero: number
          id: string
          id_clinica: string
          id_encuentro: string | null
          id_paciente: string
          modo_firma: string
          observaciones: string | null
          prioridad: string
          prof_especialidad_snapshot: string | null
          prof_nombre_snapshot: string | null
          prof_registro_snapshot: string | null
          prof_rut_snapshot: string | null
          prof_tipo_registro_snapshot: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          diagnostico_presuntivo?: string | null
          estado_resultados?: string
          examenes: Json
          firma_canvas?: string | null
          firmado?: boolean
          firmado_at?: string | null
          firmado_por?: string | null
          folio_anio: number
          folio_display?: string | null
          folio_numero: number
          id?: string
          id_clinica: string
          id_encuentro?: string | null
          id_paciente: string
          modo_firma: string
          observaciones?: string | null
          prioridad?: string
          prof_especialidad_snapshot?: string | null
          prof_nombre_snapshot?: string | null
          prof_registro_snapshot?: string | null
          prof_rut_snapshot?: string | null
          prof_tipo_registro_snapshot?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          diagnostico_presuntivo?: string | null
          estado_resultados?: string
          examenes?: Json
          firma_canvas?: string | null
          firmado?: boolean
          firmado_at?: string | null
          firmado_por?: string | null
          folio_anio?: number
          folio_display?: string | null
          folio_numero?: number
          id?: string
          id_clinica?: string
          id_encuentro?: string | null
          id_paciente?: string
          modo_firma?: string
          observaciones?: string | null
          prioridad?: string
          prof_especialidad_snapshot?: string | null
          prof_nombre_snapshot?: string | null
          prof_registro_snapshot?: string | null
          prof_rut_snapshot?: string | null
          prof_tipo_registro_snapshot?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fce_ordenes_examen_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_ordenes_examen_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "fce_encuentros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_ordenes_examen_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_encuentro"]
          },
          {
            foreignKeyName: "fce_ordenes_examen_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_ordenes_examen_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "fce_ordenes_examen_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
        ]
      }
      fce_periograma: {
        Row: {
          created_at: string
          datos: Json
          diagnostico_icd: Json
          firmado: boolean
          firmado_at: string | null
          firmado_por: string | null
          id: string
          id_clinica: string
          id_encuentro: string
          id_paciente: string
          indice_sangrado: number | null
          notas: string | null
          profundidad_media: number | null
          registrado_por: string
          sitios_patologicos: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          datos: Json
          diagnostico_icd?: Json
          firmado?: boolean
          firmado_at?: string | null
          firmado_por?: string | null
          id?: string
          id_clinica: string
          id_encuentro: string
          id_paciente: string
          indice_sangrado?: number | null
          notas?: string | null
          profundidad_media?: number | null
          registrado_por: string
          sitios_patologicos?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          datos?: Json
          diagnostico_icd?: Json
          firmado?: boolean
          firmado_at?: string | null
          firmado_por?: string | null
          id?: string
          id_clinica?: string
          id_encuentro?: string
          id_paciente?: string
          indice_sangrado?: number | null
          notas?: string | null
          profundidad_media?: number | null
          registrado_por?: string
          sitios_patologicos?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fce_periograma_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_periograma_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "fce_encuentros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_periograma_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_encuentro"]
          },
          {
            foreignKeyName: "fce_periograma_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_periograma_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "fce_periograma_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
        ]
      }
      fce_plan_objetivos: {
        Row: {
          created_at: string
          created_by: string
          criterio_logro: string | null
          descripcion: string
          dominio_codigo: string
          dominio_label: string
          estado: string
          gas_0: string | null
          gas_mas_1: string | null
          gas_mas_2: string | null
          gas_menos_1: string | null
          gas_menos_2: string | null
          id: string
          id_clinica: string
          id_paciente: string
          id_plan: string
          nivel_actual: number | null
          nivel_basal: number | null
          orden: number
          prioridad: string
          responsable_principal: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          criterio_logro?: string | null
          descripcion: string
          dominio_codigo: string
          dominio_label: string
          estado?: string
          gas_0?: string | null
          gas_mas_1?: string | null
          gas_mas_2?: string | null
          gas_menos_1?: string | null
          gas_menos_2?: string | null
          id?: string
          id_clinica: string
          id_paciente: string
          id_plan: string
          nivel_actual?: number | null
          nivel_basal?: number | null
          orden?: number
          prioridad?: string
          responsable_principal?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          criterio_logro?: string | null
          descripcion?: string
          dominio_codigo?: string
          dominio_label?: string
          estado?: string
          gas_0?: string | null
          gas_mas_1?: string | null
          gas_mas_2?: string | null
          gas_menos_1?: string | null
          gas_menos_2?: string | null
          id?: string
          id_clinica?: string
          id_paciente?: string
          id_plan?: string
          nivel_actual?: number | null
          nivel_basal?: number | null
          orden?: number
          prioridad?: string
          responsable_principal?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fce_plan_objetivos_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_plan_objetivos_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_plan_objetivos_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "fce_plan_objetivos_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_plan_objetivos_id_plan_fkey"
            columns: ["id_plan"]
            isOneToOne: false
            referencedRelation: "fce_planes_intervencion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_plan_objetivos_responsable_principal_fkey"
            columns: ["responsable_principal"]
            isOneToOne: false
            referencedRelation: "profesionales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_plan_objetivos_responsable_principal_fkey"
            columns: ["responsable_principal"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_profesional"]
          },
        ]
      }
      fce_plan_progreso: {
        Row: {
          created_at: string
          estrategias: string | null
          id: string
          id_clinica: string
          id_encuentro: string | null
          id_objetivo: string
          id_paciente: string
          nivel_gas: number
          observacion: string | null
          registrado_at: string
          registrado_por: string
        }
        Insert: {
          created_at?: string
          estrategias?: string | null
          id?: string
          id_clinica: string
          id_encuentro?: string | null
          id_objetivo: string
          id_paciente: string
          nivel_gas: number
          observacion?: string | null
          registrado_at?: string
          registrado_por: string
        }
        Update: {
          created_at?: string
          estrategias?: string | null
          id?: string
          id_clinica?: string
          id_encuentro?: string | null
          id_objetivo?: string
          id_paciente?: string
          nivel_gas?: number
          observacion?: string | null
          registrado_at?: string
          registrado_por?: string
        }
        Relationships: [
          {
            foreignKeyName: "fce_plan_progreso_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_plan_progreso_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "fce_encuentros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_plan_progreso_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_encuentro"]
          },
          {
            foreignKeyName: "fce_plan_progreso_id_objetivo_fkey"
            columns: ["id_objetivo"]
            isOneToOne: false
            referencedRelation: "fce_plan_objetivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_plan_progreso_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_plan_progreso_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "fce_plan_progreso_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_plan_progreso_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profesionales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_plan_progreso_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_profesional"]
          },
        ]
      }
      fce_plan_tratamiento: {
        Row: {
          cerrado: boolean
          cerrado_at: string | null
          cerrado_por: string | null
          created_at: string
          created_by: string
          diagnostico: string | null
          estado: string
          id: string
          id_clinica: string
          id_paciente: string
          monto_pagado: number | null
          observaciones: string | null
          presupuesto_total: number | null
          titulo: string
          updated_at: string
        }
        Insert: {
          cerrado?: boolean
          cerrado_at?: string | null
          cerrado_por?: string | null
          created_at?: string
          created_by: string
          diagnostico?: string | null
          estado?: string
          id?: string
          id_clinica: string
          id_paciente: string
          monto_pagado?: number | null
          observaciones?: string | null
          presupuesto_total?: number | null
          titulo?: string
          updated_at?: string
        }
        Update: {
          cerrado?: boolean
          cerrado_at?: string | null
          cerrado_por?: string | null
          created_at?: string
          created_by?: string
          diagnostico?: string | null
          estado?: string
          id?: string
          id_clinica?: string
          id_paciente?: string
          monto_pagado?: number | null
          observaciones?: string | null
          presupuesto_total?: number | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fce_plan_tratamiento_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_plan_tratamiento_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_plan_tratamiento_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "fce_plan_tratamiento_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
        ]
      }
      fce_plan_tratamiento_items: {
        Row: {
          created_at: string
          descripcion: string | null
          estado: string
          id: string
          id_clinica: string
          id_encuentro_realizado: string | null
          id_plan: string
          notas: string | null
          orden: number
          pieza: number | null
          prioridad: string | null
          procedimiento: string
          realizado_at: string | null
          realizado_por: string | null
          superficie: string | null
          updated_at: string
          valor_unitario: number | null
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          estado?: string
          id?: string
          id_clinica: string
          id_encuentro_realizado?: string | null
          id_plan: string
          notas?: string | null
          orden?: number
          pieza?: number | null
          prioridad?: string | null
          procedimiento: string
          realizado_at?: string | null
          realizado_por?: string | null
          superficie?: string | null
          updated_at?: string
          valor_unitario?: number | null
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          estado?: string
          id?: string
          id_clinica?: string
          id_encuentro_realizado?: string | null
          id_plan?: string
          notas?: string | null
          orden?: number
          pieza?: number | null
          prioridad?: string | null
          procedimiento?: string
          realizado_at?: string | null
          realizado_por?: string | null
          superficie?: string | null
          updated_at?: string
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fce_plan_tratamiento_items_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_plan_tratamiento_items_id_encuentro_realizado_fkey"
            columns: ["id_encuentro_realizado"]
            isOneToOne: false
            referencedRelation: "fce_encuentros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_plan_tratamiento_items_id_encuentro_realizado_fkey"
            columns: ["id_encuentro_realizado"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_encuentro"]
          },
          {
            foreignKeyName: "fce_plan_tratamiento_items_id_plan_fkey"
            columns: ["id_plan"]
            isOneToOne: false
            referencedRelation: "fce_plan_tratamiento"
            referencedColumns: ["id"]
          },
        ]
      }
      fce_planes_intervencion: {
        Row: {
          condicion_codigo: string | null
          created_at: string
          created_by: string
          diagnostico: string | null
          estado: string
          fecha_inicio: string
          fecha_revision: string | null
          firmado: boolean
          firmado_at: string | null
          firmado_por: string | null
          icd_codigos: Json
          id: string
          id_clinica: string
          id_encuentro_origen: string | null
          id_paciente: string
          snapshot_equipo: Json | null
          titulo: string
          updated_at: string
        }
        Insert: {
          condicion_codigo?: string | null
          created_at?: string
          created_by: string
          diagnostico?: string | null
          estado?: string
          fecha_inicio?: string
          fecha_revision?: string | null
          firmado?: boolean
          firmado_at?: string | null
          firmado_por?: string | null
          icd_codigos?: Json
          id?: string
          id_clinica: string
          id_encuentro_origen?: string | null
          id_paciente: string
          snapshot_equipo?: Json | null
          titulo?: string
          updated_at?: string
        }
        Update: {
          condicion_codigo?: string | null
          created_at?: string
          created_by?: string
          diagnostico?: string | null
          estado?: string
          fecha_inicio?: string
          fecha_revision?: string | null
          firmado?: boolean
          firmado_at?: string | null
          firmado_por?: string | null
          icd_codigos?: Json
          id?: string
          id_clinica?: string
          id_encuentro_origen?: string | null
          id_paciente?: string
          snapshot_equipo?: Json | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fce_planes_intervencion_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_planes_intervencion_id_encuentro_origen_fkey"
            columns: ["id_encuentro_origen"]
            isOneToOne: false
            referencedRelation: "fce_encuentros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_planes_intervencion_id_encuentro_origen_fkey"
            columns: ["id_encuentro_origen"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_encuentro"]
          },
          {
            foreignKeyName: "fce_planes_intervencion_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_planes_intervencion_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "fce_planes_intervencion_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
        ]
      }
      fce_prescripciones: {
        Row: {
          created_at: string
          created_by: string
          diagnostico_asociado: string | null
          firma_canvas: string | null
          firmado: boolean
          firmado_at: string | null
          firmado_por: string | null
          folio_anio: number
          folio_display: string | null
          folio_numero: number
          id: string
          id_clinica: string
          id_encuentro: string | null
          id_paciente: string
          indicaciones_generales: string | null
          medicamentos: Json | null
          modo_firma: string
          prof_especialidad_snapshot: string | null
          prof_nombre_snapshot: string | null
          prof_registro_snapshot: string | null
          prof_rut_snapshot: string | null
          prof_tipo_registro_snapshot: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          diagnostico_asociado?: string | null
          firma_canvas?: string | null
          firmado?: boolean
          firmado_at?: string | null
          firmado_por?: string | null
          folio_anio: number
          folio_display?: string | null
          folio_numero: number
          id?: string
          id_clinica: string
          id_encuentro?: string | null
          id_paciente: string
          indicaciones_generales?: string | null
          medicamentos?: Json | null
          modo_firma: string
          prof_especialidad_snapshot?: string | null
          prof_nombre_snapshot?: string | null
          prof_registro_snapshot?: string | null
          prof_rut_snapshot?: string | null
          prof_tipo_registro_snapshot?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          diagnostico_asociado?: string | null
          firma_canvas?: string | null
          firmado?: boolean
          firmado_at?: string | null
          firmado_por?: string | null
          folio_anio?: number
          folio_display?: string | null
          folio_numero?: number
          id?: string
          id_clinica?: string
          id_encuentro?: string | null
          id_paciente?: string
          indicaciones_generales?: string | null
          medicamentos?: Json | null
          modo_firma?: string
          prof_especialidad_snapshot?: string | null
          prof_nombre_snapshot?: string | null
          prof_registro_snapshot?: string | null
          prof_rut_snapshot?: string | null
          prof_tipo_registro_snapshot?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fce_prescripciones_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_prescripciones_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "fce_encuentros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_prescripciones_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_encuentro"]
          },
          {
            foreignKeyName: "fce_prescripciones_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_prescripciones_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "fce_prescripciones_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
        ]
      }
      fce_presupuesto_items: {
        Row: {
          afecta_iva: boolean
          cantidad: number
          codigo: string | null
          created_at: string
          descripcion: string
          descuento_clp: number
          descuento_pct: number
          honorario_clp: number | null
          honorario_tipo: string | null
          honorario_valor: number | null
          id: string
          id_prestacion: string | null
          id_presupuesto: string
          id_profesional: string | null
          orden: number
          pieza: number | null
          precio_base: number
          precio_unitario: number
          recargo_pct: number
          superficie: string | null
          total_linea_clp: number
        }
        Insert: {
          afecta_iva?: boolean
          cantidad?: number
          codigo?: string | null
          created_at?: string
          descripcion: string
          descuento_clp?: number
          descuento_pct?: number
          honorario_clp?: number | null
          honorario_tipo?: string | null
          honorario_valor?: number | null
          id?: string
          id_prestacion?: string | null
          id_presupuesto: string
          id_profesional?: string | null
          orden?: number
          pieza?: number | null
          precio_base?: number
          precio_unitario: number
          recargo_pct?: number
          superficie?: string | null
          total_linea_clp?: number
        }
        Update: {
          afecta_iva?: boolean
          cantidad?: number
          codigo?: string | null
          created_at?: string
          descripcion?: string
          descuento_clp?: number
          descuento_pct?: number
          honorario_clp?: number | null
          honorario_tipo?: string | null
          honorario_valor?: number | null
          id?: string
          id_prestacion?: string | null
          id_presupuesto?: string
          id_profesional?: string | null
          orden?: number
          pieza?: number | null
          precio_base?: number
          precio_unitario?: number
          recargo_pct?: number
          superficie?: string | null
          total_linea_clp?: number
        }
        Relationships: [
          {
            foreignKeyName: "fce_presupuesto_items_id_prestacion_fkey"
            columns: ["id_prestacion"]
            isOneToOne: false
            referencedRelation: "prestaciones_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_presupuesto_items_id_presupuesto_fkey"
            columns: ["id_presupuesto"]
            isOneToOne: false
            referencedRelation: "fce_presupuestos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_presupuesto_items_id_profesional_fkey"
            columns: ["id_profesional"]
            isOneToOne: false
            referencedRelation: "profesionales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_presupuesto_items_id_profesional_fkey"
            columns: ["id_profesional"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_profesional"]
          },
        ]
      }
      fce_presupuestos: {
        Row: {
          created_at: string
          created_by: string | null
          descuento_clp: number
          estado: string
          firmado: boolean
          firmado_at: string | null
          id: string
          id_clinica: string
          id_encuentro: string | null
          id_paciente: string
          id_plan_tratamiento: string | null
          id_profesional: string
          iva_clp: number
          modelo_precio: string | null
          neto_clp: number
          notas: string | null
          subtotal_clp: number
          titulo: string
          total_clp: number
          updated_at: string
          validez_dias: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descuento_clp?: number
          estado?: string
          firmado?: boolean
          firmado_at?: string | null
          id?: string
          id_clinica: string
          id_encuentro?: string | null
          id_paciente: string
          id_plan_tratamiento?: string | null
          id_profesional: string
          iva_clp?: number
          modelo_precio?: string | null
          neto_clp?: number
          notas?: string | null
          subtotal_clp?: number
          titulo: string
          total_clp?: number
          updated_at?: string
          validez_dias?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descuento_clp?: number
          estado?: string
          firmado?: boolean
          firmado_at?: string | null
          id?: string
          id_clinica?: string
          id_encuentro?: string | null
          id_paciente?: string
          id_plan_tratamiento?: string | null
          id_profesional?: string
          iva_clp?: number
          modelo_precio?: string | null
          neto_clp?: number
          notas?: string | null
          subtotal_clp?: number
          titulo?: string
          total_clp?: number
          updated_at?: string
          validez_dias?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fce_presupuestos_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_presupuestos_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "fce_encuentros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_presupuestos_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_encuentro"]
          },
          {
            foreignKeyName: "fce_presupuestos_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_presupuestos_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "fce_presupuestos_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_presupuestos_id_plan_tratamiento_fkey"
            columns: ["id_plan_tratamiento"]
            isOneToOne: false
            referencedRelation: "fce_plan_tratamiento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_presupuestos_id_profesional_fkey"
            columns: ["id_profesional"]
            isOneToOne: false
            referencedRelation: "profesionales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_presupuestos_id_profesional_fkey"
            columns: ["id_profesional"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_profesional"]
          },
        ]
      }
      fce_resumenes_ia: {
        Row: {
          contexto_hash: string
          generado_en: string
          generado_por: string
          id: string
          id_clinica: string
          id_paciente: string
          reporte: Json
          tokens_input: number | null
          tokens_output: number | null
        }
        Insert: {
          contexto_hash: string
          generado_en?: string
          generado_por: string
          id?: string
          id_clinica: string
          id_paciente: string
          reporte: Json
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Update: {
          contexto_hash?: string
          generado_en?: string
          generado_por?: string
          id?: string
          id_clinica?: string
          id_paciente?: string
          reporte?: Json
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fce_resumenes_ia_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_resumenes_ia_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_resumenes_ia_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "fce_resumenes_ia_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
        ]
      }
      fce_signos_vitales: {
        Row: {
          frecuencia_cardiaca: number | null
          frecuencia_respiratoria: number | null
          id: string
          id_clinica: string | null
          id_encuentro: string
          id_paciente: string
          presion_arterial: string | null
          recorded_at: string | null
          recorded_by: string | null
          spo2: number | null
          temperatura: number | null
        }
        Insert: {
          frecuencia_cardiaca?: number | null
          frecuencia_respiratoria?: number | null
          id?: string
          id_clinica?: string | null
          id_encuentro: string
          id_paciente: string
          presion_arterial?: string | null
          recorded_at?: string | null
          recorded_by?: string | null
          spo2?: number | null
          temperatura?: number | null
        }
        Update: {
          frecuencia_cardiaca?: number | null
          frecuencia_respiratoria?: number | null
          id?: string
          id_clinica?: string | null
          id_encuentro?: string
          id_paciente?: string
          presion_arterial?: string | null
          recorded_at?: string | null
          recorded_by?: string | null
          spo2?: number | null
          temperatura?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fce_signos_vitales_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_signos_vitales_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "fce_encuentros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_signos_vitales_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_encuentro"]
          },
          {
            foreignKeyName: "fce_signos_vitales_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_signos_vitales_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "fce_signos_vitales_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_signos_vitales_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profesionales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fce_signos_vitales_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_profesional"]
          },
        ]
      }
      instrumentos_aplicados: {
        Row: {
          aplicado_at: string
          aplicado_por: string
          created_at: string
          id: string
          id_clinica: string
          id_encuentro: string | null
          id_instrumento: string
          id_paciente: string
          interpretacion: string | null
          mostrar_en_timeline: boolean
          notas: string | null
          puntaje_total: number | null
          respuestas: Json
        }
        Insert: {
          aplicado_at?: string
          aplicado_por: string
          created_at?: string
          id?: string
          id_clinica: string
          id_encuentro?: string | null
          id_instrumento: string
          id_paciente: string
          interpretacion?: string | null
          mostrar_en_timeline?: boolean
          notas?: string | null
          puntaje_total?: number | null
          respuestas: Json
        }
        Update: {
          aplicado_at?: string
          aplicado_por?: string
          created_at?: string
          id?: string
          id_clinica?: string
          id_encuentro?: string | null
          id_instrumento?: string
          id_paciente?: string
          interpretacion?: string | null
          mostrar_en_timeline?: boolean
          notas?: string | null
          puntaje_total?: number | null
          respuestas?: Json
        }
        Relationships: [
          {
            foreignKeyName: "instrumentos_aplicados_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instrumentos_aplicados_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "fce_encuentros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instrumentos_aplicados_id_encuentro_fkey"
            columns: ["id_encuentro"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_encuentro"]
          },
          {
            foreignKeyName: "instrumentos_aplicados_id_instrumento_fkey"
            columns: ["id_instrumento"]
            isOneToOne: false
            referencedRelation: "instrumentos_valoracion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instrumentos_aplicados_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instrumentos_aplicados_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "instrumentos_aplicados_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
        ]
      }
      instrumentos_valoracion: {
        Row: {
          activo: boolean
          codigo: string
          componente_id: string | null
          created_at: string
          descripcion: string | null
          especialidades: string[]
          id: string
          interpretacion: Json | null
          nombre: string
          orden: number
          schema_items: Json | null
          tipo_renderer: string
          updated_at: string
          version: string
        }
        Insert: {
          activo?: boolean
          codigo: string
          componente_id?: string | null
          created_at?: string
          descripcion?: string | null
          especialidades: string[]
          id?: string
          interpretacion?: Json | null
          nombre: string
          orden?: number
          schema_items?: Json | null
          tipo_renderer: string
          updated_at?: string
          version?: string
        }
        Update: {
          activo?: boolean
          codigo?: string
          componente_id?: string | null
          created_at?: string
          descripcion?: string | null
          especialidades?: string[]
          id?: string
          interpretacion?: Json | null
          nombre?: string
          orden?: number
          schema_items?: Json | null
          tipo_renderer?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      lead_diagnosticos: {
        Row: {
          cantidad_prof: string | null
          created_at: string
          desafios: string[] | null
          especialidad: string | null
          herramienta: string | null
          id: number
          id_lead: string
          ip_address: string | null
          plan_recomendado: string | null
          precio_uf: number | null
          responsable_wa: string | null
          score: number
          urgencia: string | null
          user_agent: string | null
          volumen: string | null
        }
        Insert: {
          cantidad_prof?: string | null
          created_at?: string
          desafios?: string[] | null
          especialidad?: string | null
          herramienta?: string | null
          id?: never
          id_lead: string
          ip_address?: string | null
          plan_recomendado?: string | null
          precio_uf?: number | null
          responsable_wa?: string | null
          score?: number
          urgencia?: string | null
          user_agent?: string | null
          volumen?: string | null
        }
        Update: {
          cantidad_prof?: string | null
          created_at?: string
          desafios?: string[] | null
          especialidad?: string | null
          herramienta?: string | null
          id?: never
          id_lead?: string
          ip_address?: string | null
          plan_recomendado?: string | null
          precio_uf?: number | null
          responsable_wa?: string | null
          score?: number
          urgencia?: string | null
          user_agent?: string | null
          volumen?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_diagnosticos_id_lead_fkey"
            columns: ["id_lead"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_pipeline: {
        Row: {
          created_at: string
          datos_legacy: Json | null
          etapa: string
          id: string
          id_lead: string
          plan_recomendado: string | null
          precio_uf: number | null
          score: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          datos_legacy?: Json | null
          etapa?: string
          id?: string
          id_lead: string
          plan_recomendado?: string | null
          precio_uf?: number | null
          score?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          datos_legacy?: Json | null
          etapa?: string
          id?: string
          id_lead?: string
          plan_recomendado?: string | null
          precio_uf?: number | null
          score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_pipeline_id_lead_fkey"
            columns: ["id_lead"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          clinica: string
          created_at: string
          diagnostico_at: string | null
          diagnostico_completado: boolean
          email: string
          email_bienvenida_at: string | null
          email_bienvenida_enviado: boolean
          estado: string
          id: string
          ip_address: string | null
          mensaje: string | null
          nombre: string
          origen: string
          telefono: string
          updated_at: string
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          whatsapp_optin: boolean
          whatsapp_optin_at: string | null
          whatsapp_optin_canal: string | null
          whatsapp_optin_texto: string | null
        }
        Insert: {
          clinica: string
          created_at?: string
          diagnostico_at?: string | null
          diagnostico_completado?: boolean
          email: string
          email_bienvenida_at?: string | null
          email_bienvenida_enviado?: boolean
          estado?: string
          id?: string
          ip_address?: string | null
          mensaje?: string | null
          nombre: string
          origen?: string
          telefono: string
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp_optin?: boolean
          whatsapp_optin_at?: string | null
          whatsapp_optin_canal?: string | null
          whatsapp_optin_texto?: string | null
        }
        Update: {
          clinica?: string
          created_at?: string
          diagnostico_at?: string | null
          diagnostico_completado?: boolean
          email?: string
          email_bienvenida_at?: string | null
          email_bienvenida_enviado?: boolean
          estado?: string
          id?: string
          ip_address?: string | null
          mensaje?: string | null
          nombre?: string
          origen?: string
          telefono?: string
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp_optin?: boolean
          whatsapp_optin_at?: string | null
          whatsapp_optin_canal?: string | null
          whatsapp_optin_texto?: string | null
        }
        Relationships: []
      }
      logs_auditoria: {
        Row: {
          accion: string
          actor_id: string | null
          actor_tipo: string
          canal: Database["public"]["Enums"]["canal_contacto"] | null
          created_at: string
          datos_antes: Json | null
          datos_despues: Json | null
          id: string
          id_clinica: string
          id_paciente: string | null
          ip_address: string | null
          registro_id: string | null
          session_id: string | null
          tabla_afectada: string
          tipo_evento: string | null
          user_agent: string | null
        }
        Insert: {
          accion: string
          actor_id?: string | null
          actor_tipo: string
          canal?: Database["public"]["Enums"]["canal_contacto"] | null
          created_at?: string
          datos_antes?: Json | null
          datos_despues?: Json | null
          id?: string
          id_clinica: string
          id_paciente?: string | null
          ip_address?: string | null
          registro_id?: string | null
          session_id?: string | null
          tabla_afectada: string
          tipo_evento?: string | null
          user_agent?: string | null
        }
        Update: {
          accion?: string
          actor_id?: string | null
          actor_tipo?: string
          canal?: Database["public"]["Enums"]["canal_contacto"] | null
          created_at?: string
          datos_antes?: Json | null
          datos_despues?: Json | null
          id?: string
          id_clinica?: string
          id_paciente?: string | null
          ip_address?: string | null
          registro_id?: string | null
          session_id?: string | null
          tabla_afectada?: string
          tipo_evento?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_auditoria_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_auditoria_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_auditoria_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "logs_auditoria_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
        ]
      }
      medicamentos: {
        Row: {
          activo: boolean
          advertencias_importantes: string[] | null
          codigo_atc: string | null
          concentracion: string | null
          contraindicaciones_clave: string[] | null
          created_at: string
          dosis_adulto_sugerida: string | null
          dosis_pediatrica_sugerida: string | null
          es_controlado: boolean
          especialidades_comunes: string[] | null
          forma_farmaceutica: string | null
          grupo_terapeutico: string | null
          id: string
          id_clinica: string | null
          indicaciones_comunes: string[] | null
          notas: string | null
          origen: string | null
          perfiles_autorizados: string[]
          principio_activo: string
          requiere_receta: boolean
          updated_at: string
          validado_clinicamente: boolean
          via_administracion: string | null
        }
        Insert: {
          activo?: boolean
          advertencias_importantes?: string[] | null
          codigo_atc?: string | null
          concentracion?: string | null
          contraindicaciones_clave?: string[] | null
          created_at?: string
          dosis_adulto_sugerida?: string | null
          dosis_pediatrica_sugerida?: string | null
          es_controlado?: boolean
          especialidades_comunes?: string[] | null
          forma_farmaceutica?: string | null
          grupo_terapeutico?: string | null
          id: string
          id_clinica?: string | null
          indicaciones_comunes?: string[] | null
          notas?: string | null
          origen?: string | null
          perfiles_autorizados?: string[]
          principio_activo: string
          requiere_receta?: boolean
          updated_at?: string
          validado_clinicamente?: boolean
          via_administracion?: string | null
        }
        Update: {
          activo?: boolean
          advertencias_importantes?: string[] | null
          codigo_atc?: string | null
          concentracion?: string | null
          contraindicaciones_clave?: string[] | null
          created_at?: string
          dosis_adulto_sugerida?: string | null
          dosis_pediatrica_sugerida?: string | null
          es_controlado?: boolean
          especialidades_comunes?: string[] | null
          forma_farmaceutica?: string | null
          grupo_terapeutico?: string | null
          id?: string
          id_clinica?: string | null
          indicaciones_comunes?: string[] | null
          notas?: string | null
          origen?: string | null
          perfiles_autorizados?: string[]
          principio_activo?: string
          requiere_receta?: boolean
          updated_at?: string
          validado_clinicamente?: boolean
          via_administracion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medicamentos_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      medicamentos_catalogo: {
        Row: {
          activo: boolean
          advertencias_importantes: string[] | null
          bioequivalentes: string[] | null
          codigo_atc: string | null
          concentracion: string | null
          contraindicaciones_clave: string[] | null
          created_at: string
          dosis_adulto_sugerida: string | null
          dosis_pediatrica_sugerida: string | null
          es_controlado: boolean
          especialidades_comunes: string[] | null
          forma_farmaceutica: string
          grupo_terapeutico: string | null
          id: string
          id_clinica: string | null
          indicaciones_comunes: string[] | null
          laboratorio: string | null
          nombre_comercial: string | null
          notas: string | null
          origen: string
          perfiles_autorizados: string[]
          presentacion: string
          principio_activo: string
          requiere_receta: boolean
          updated_at: string
          via_administracion: string
        }
        Insert: {
          activo?: boolean
          advertencias_importantes?: string[] | null
          bioequivalentes?: string[] | null
          codigo_atc?: string | null
          concentracion?: string | null
          contraindicaciones_clave?: string[] | null
          created_at?: string
          dosis_adulto_sugerida?: string | null
          dosis_pediatrica_sugerida?: string | null
          es_controlado?: boolean
          especialidades_comunes?: string[] | null
          forma_farmaceutica: string
          grupo_terapeutico?: string | null
          id?: string
          id_clinica?: string | null
          indicaciones_comunes?: string[] | null
          laboratorio?: string | null
          nombre_comercial?: string | null
          notas?: string | null
          origen?: string
          perfiles_autorizados?: string[]
          presentacion: string
          principio_activo: string
          requiere_receta?: boolean
          updated_at?: string
          via_administracion: string
        }
        Update: {
          activo?: boolean
          advertencias_importantes?: string[] | null
          bioequivalentes?: string[] | null
          codigo_atc?: string | null
          concentracion?: string | null
          contraindicaciones_clave?: string[] | null
          created_at?: string
          dosis_adulto_sugerida?: string | null
          dosis_pediatrica_sugerida?: string | null
          es_controlado?: boolean
          especialidades_comunes?: string[] | null
          forma_farmaceutica?: string
          grupo_terapeutico?: string | null
          id?: string
          id_clinica?: string | null
          indicaciones_comunes?: string[] | null
          laboratorio?: string | null
          nombre_comercial?: string | null
          notas?: string | null
          origen?: string
          perfiles_autorizados?: string[]
          presentacion?: string
          principio_activo?: string
          requiere_receta?: boolean
          updated_at?: string
          via_administracion?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicamentos_catalogo_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      medicamentos_presentaciones: {
        Row: {
          activo: boolean
          bioequivalente: boolean | null
          created_at: string
          es_generico: boolean
          estado: string
          fuente_url: string | null
          id: string
          id_medicamento: string
          laboratorio: string | null
          nombre_comercial: string
          notas: string | null
          presentacion: string | null
          registro_isp: string | null
          tipo_comercial: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          bioequivalente?: boolean | null
          created_at?: string
          es_generico?: boolean
          estado?: string
          fuente_url?: string | null
          id?: string
          id_medicamento: string
          laboratorio?: string | null
          nombre_comercial: string
          notas?: string | null
          presentacion?: string | null
          registro_isp?: string | null
          tipo_comercial?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          bioequivalente?: boolean | null
          created_at?: string
          es_generico?: boolean
          estado?: string
          fuente_url?: string | null
          id?: string
          id_medicamento?: string
          laboratorio?: string | null
          nombre_comercial?: string
          notas?: string | null
          presentacion?: string | null
          registro_isp?: string | null
          tipo_comercial?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicamentos_presentaciones_id_medicamento_fkey"
            columns: ["id_medicamento"]
            isOneToOne: false
            referencedRelation: "medicamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_submissions: {
        Row: {
          access_token: string
          approved_at: string | null
          approved_by: string | null
          clinic_info: Json
          completed_steps: number
          created_at: string
          horarios: Json
          id: string
          id_clinica: string
          info_adicional: Json
          profesionales: Json
          rejection_note: string | null
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string
          approved_at?: string | null
          approved_by?: string | null
          clinic_info?: Json
          completed_steps?: number
          created_at?: string
          horarios?: Json
          id?: string
          id_clinica: string
          info_adicional?: Json
          profesionales?: Json
          rejection_note?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          approved_at?: string | null
          approved_by?: string | null
          clinic_info?: Json
          completed_steps?: number
          created_at?: string
          horarios?: Json
          id?: string
          id_clinica?: string
          info_adicional?: Json
          profesionales?: Json
          rejection_note?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_submissions_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      pacientes: {
        Row: {
          acepta_recordatorios: boolean | null
          activo: boolean | null
          apellido_materno: string | null
          apellido_paterno: string | null
          canal_origen: Database["public"]["Enums"]["canal_contacto"]
          canal_preferido: Database["public"]["Enums"]["canal_contacto"] | null
          consentimiento_datos: boolean
          consentimiento_fecha: string | null
          consentimiento_ip: string | null
          contacto_emergencia: Json | null
          created_at: string
          direccion: Json | null
          email: string | null
          estado_clinico: string
          fecha_nacimiento: string | null
          id: string
          id_clinica: string
          identidad_genero: string | null
          nacionalidad: string | null
          nombre: string
          notas: string | null
          ocupacion: string | null
          prevision: Json | null
          rut: string | null
          sexo_registral: string | null
          telefono: string | null
          updated_at: string
          whatsapp_optin: boolean | null
          whatsapp_optin_at: string | null
          whatsapp_optin_canal: string | null
        }
        Insert: {
          acepta_recordatorios?: boolean | null
          activo?: boolean | null
          apellido_materno?: string | null
          apellido_paterno?: string | null
          canal_origen?: Database["public"]["Enums"]["canal_contacto"]
          canal_preferido?: Database["public"]["Enums"]["canal_contacto"] | null
          consentimiento_datos?: boolean
          consentimiento_fecha?: string | null
          consentimiento_ip?: string | null
          contacto_emergencia?: Json | null
          created_at?: string
          direccion?: Json | null
          email?: string | null
          estado_clinico?: string
          fecha_nacimiento?: string | null
          id?: string
          id_clinica: string
          identidad_genero?: string | null
          nacionalidad?: string | null
          nombre: string
          notas?: string | null
          ocupacion?: string | null
          prevision?: Json | null
          rut?: string | null
          sexo_registral?: string | null
          telefono?: string | null
          updated_at?: string
          whatsapp_optin?: boolean | null
          whatsapp_optin_at?: string | null
          whatsapp_optin_canal?: string | null
        }
        Update: {
          acepta_recordatorios?: boolean | null
          activo?: boolean | null
          apellido_materno?: string | null
          apellido_paterno?: string | null
          canal_origen?: Database["public"]["Enums"]["canal_contacto"]
          canal_preferido?: Database["public"]["Enums"]["canal_contacto"] | null
          consentimiento_datos?: boolean
          consentimiento_fecha?: string | null
          consentimiento_ip?: string | null
          contacto_emergencia?: Json | null
          created_at?: string
          direccion?: Json | null
          email?: string | null
          estado_clinico?: string
          fecha_nacimiento?: string | null
          id?: string
          id_clinica?: string
          identidad_genero?: string | null
          nacionalidad?: string | null
          nombre?: string
          notas?: string | null
          ocupacion?: string | null
          prevision?: Json | null
          rut?: string | null
          sexo_registral?: string | null
          telefono?: string | null
          updated_at?: string
          whatsapp_optin?: boolean | null
          whatsapp_optin_at?: string | null
          whatsapp_optin_canal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pacientes_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      page_events: {
        Row: {
          created_at: string
          event_data: Json
          event_type: string
          id: number
          ip_address: string | null
          page_path: string | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json
          event_type: string
          id?: never
          ip_address?: string | null
          page_path?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json
          event_type?: string
          id?: never
          ip_address?: string | null
          page_path?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      pagos: {
        Row: {
          comprobante_url: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_pago"]
          flow_expires_at: string | null
          flow_token: string | null
          flow_url: string | null
          gateway_payment_id: string | null
          gateway_provider: string | null
          gateway_session_id: string | null
          id: string
          id_cita: string | null
          id_clinica: string
          id_paciente: string | null
          metodo: string
          monto_clp: number
          motivo_liberacion: string | null
          mp_payment_id: string | null
          mp_preference_id: string | null
          pagado_at: string | null
          referencia_externa: string | null
          registrado_por: string | null
          updated_at: string
        }
        Insert: {
          comprobante_url?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_pago"]
          flow_expires_at?: string | null
          flow_token?: string | null
          flow_url?: string | null
          gateway_payment_id?: string | null
          gateway_provider?: string | null
          gateway_session_id?: string | null
          id?: string
          id_cita?: string | null
          id_clinica: string
          id_paciente?: string | null
          metodo: string
          monto_clp: number
          motivo_liberacion?: string | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          pagado_at?: string | null
          referencia_externa?: string | null
          registrado_por?: string | null
          updated_at?: string
        }
        Update: {
          comprobante_url?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_pago"]
          flow_expires_at?: string | null
          flow_token?: string | null
          flow_url?: string | null
          gateway_payment_id?: string | null
          gateway_provider?: string | null
          gateway_session_id?: string | null
          id?: string
          id_cita?: string | null
          id_clinica?: string
          id_paciente?: string | null
          metodo?: string
          monto_clp?: number
          motivo_liberacion?: string | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          pagado_at?: string | null
          referencia_externa?: string | null
          registrado_por?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_id_cita_fkey"
            columns: ["id_cita"]
            isOneToOne: false
            referencedRelation: "citas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_id_cita_fkey"
            columns: ["id_cita"]
            isOneToOne: false
            referencedRelation: "citas_hoy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_id_cita_fkey"
            columns: ["id_cita"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_cita"]
          },
          {
            foreignKeyName: "pagos_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "pagos_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      plantillas_dominios: {
        Row: {
          activo: boolean
          condicion_codigo: string
          condicion_label: string
          created_at: string
          descripcion: string | null
          dominios: Json
          id: string
          orden: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          condicion_codigo: string
          condicion_label: string
          created_at?: string
          descripcion?: string | null
          dominios: Json
          id?: string
          orden?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          condicion_codigo?: string
          condicion_label?: string
          created_at?: string
          descripcion?: string | null
          dominios?: Json
          id?: string
          orden?: number
          updated_at?: string
        }
        Relationships: []
      }
      plantillas_horario: {
        Row: {
          activa: boolean
          created_at: string | null
          dia_semana: number
          duracion_min: number
          hora_fin: string
          hora_inicio: string
          id: string
          id_clinica: string
          id_profesional: string
          notas: string | null
          updated_at: string | null
        }
        Insert: {
          activa?: boolean
          created_at?: string | null
          dia_semana: number
          duracion_min?: number
          hora_fin: string
          hora_inicio: string
          id?: string
          id_clinica: string
          id_profesional: string
          notas?: string | null
          updated_at?: string | null
        }
        Update: {
          activa?: boolean
          created_at?: string | null
          dia_semana?: number
          duracion_min?: number
          hora_fin?: string
          hora_inicio?: string
          id?: string
          id_clinica?: string
          id_profesional?: string
          notas?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plantillas_horario_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plantillas_horario_id_profesional_fkey"
            columns: ["id_profesional"]
            isOneToOne: false
            referencedRelation: "profesionales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plantillas_horario_id_profesional_fkey"
            columns: ["id_profesional"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_profesional"]
          },
        ]
      }
      precios_abono: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          id_clinica: string
          monto_clp: number
          nombre_servicio: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          id_clinica: string
          monto_clp: number
          nombre_servicio: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          id_clinica?: string
          monto_clp?: number
          nombre_servicio?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "precios_abono_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      prestaciones_catalogo: {
        Row: {
          activo: boolean
          afecta_iva: boolean
          ambito: string
          categoria: string
          codigo: string
          created_at: string
          descripcion: string | null
          duracion_min: number | null
          id: string
          id_clinica: string
          id_servicio: string | null
          nombre: string
          orden: number
          precio_base: number
          requiere_pieza: boolean
          updated_at: string
        }
        Insert: {
          activo?: boolean
          afecta_iva?: boolean
          ambito?: string
          categoria: string
          codigo: string
          created_at?: string
          descripcion?: string | null
          duracion_min?: number | null
          id?: string
          id_clinica: string
          id_servicio?: string | null
          nombre: string
          orden?: number
          precio_base?: number
          requiere_pieza?: boolean
          updated_at?: string
        }
        Update: {
          activo?: boolean
          afecta_iva?: boolean
          ambito?: string
          categoria?: string
          codigo?: string
          created_at?: string
          descripcion?: string | null
          duracion_min?: number | null
          id?: string
          id_clinica?: string
          id_servicio?: string | null
          nombre?: string
          orden?: number
          precio_base?: number
          requiere_pieza?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prestaciones_catalogo_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prestaciones_catalogo_id_servicio_fkey"
            columns: ["id_servicio"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
        ]
      }
      procedimientos_esteticos_catalogo: {
        Row: {
          activo: boolean
          categoria: string
          contraindicaciones_clave: string[]
          descripcion: string | null
          id: string
          id_clinica: string | null
          nombre: string
          requiere_consentimiento_especifico: boolean
        }
        Insert: {
          activo?: boolean
          categoria: string
          contraindicaciones_clave?: string[]
          descripcion?: string | null
          id?: string
          id_clinica?: string | null
          nombre: string
          requiere_consentimiento_especifico?: boolean
        }
        Update: {
          activo?: boolean
          categoria?: string
          contraindicaciones_clave?: string[]
          descripcion?: string | null
          id?: string
          id_clinica?: string | null
          nombre?: string
          requiere_consentimiento_especifico?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "procedimientos_esteticos_catalogo_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      profesional_prestaciones: {
        Row: {
          activo: boolean
          created_at: string
          honorario_tipo: string | null
          honorario_valor: number | null
          id: string
          id_prestacion: string
          id_profesional: string
          precio_override: number | null
          recargo_pct: number | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          honorario_tipo?: string | null
          honorario_valor?: number | null
          id?: string
          id_prestacion: string
          id_profesional: string
          precio_override?: number | null
          recargo_pct?: number | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          honorario_tipo?: string | null
          honorario_valor?: number | null
          id?: string
          id_prestacion?: string
          id_profesional?: string
          precio_override?: number | null
          recargo_pct?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profesional_prestaciones_id_prestacion_fkey"
            columns: ["id_prestacion"]
            isOneToOne: false
            referencedRelation: "prestaciones_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profesional_prestaciones_id_profesional_fkey"
            columns: ["id_profesional"]
            isOneToOne: false
            referencedRelation: "profesionales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profesional_prestaciones_id_profesional_fkey"
            columns: ["id_profesional"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_profesional"]
          },
        ]
      }
      profesional_servicios: {
        Row: {
          activo: boolean
          atiende_domicilio: boolean
          created_at: string
          duracion_override_min: number | null
          id: string
          id_profesional: string
          id_servicio: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          atiende_domicilio?: boolean
          created_at?: string
          duracion_override_min?: number | null
          id?: string
          id_profesional: string
          id_servicio: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          atiende_domicilio?: boolean
          created_at?: string
          duracion_override_min?: number | null
          id?: string
          id_profesional?: string
          id_servicio?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profesional_servicios_id_profesional_fkey"
            columns: ["id_profesional"]
            isOneToOne: false
            referencedRelation: "profesionales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profesional_servicios_id_profesional_fkey"
            columns: ["id_profesional"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_profesional"]
          },
          {
            foreignKeyName: "profesional_servicios_id_servicio_fkey"
            columns: ["id_servicio"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
        ]
      }
      profesionales: {
        Row: {
          activo: boolean | null
          auth_id: string | null
          color_agenda: string | null
          created_at: string
          duracion_consulta: number
          email: string | null
          es_agendable: boolean
          especialidad: string
          id: string
          id_clinica: string
          nombre: string
          numero_registro: string | null
          puede_estetica: boolean
          puede_indicar_examenes: boolean
          puede_prescribir: boolean
          recibe_notificaciones: boolean
          rut: string | null
          telefono: string | null
          tipo_registro: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean | null
          auth_id?: string | null
          color_agenda?: string | null
          created_at?: string
          duracion_consulta?: number
          email?: string | null
          es_agendable?: boolean
          especialidad: string
          id?: string
          id_clinica: string
          nombre: string
          numero_registro?: string | null
          puede_estetica?: boolean
          puede_indicar_examenes?: boolean
          puede_prescribir?: boolean
          recibe_notificaciones?: boolean
          rut?: string | null
          telefono?: string | null
          tipo_registro?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean | null
          auth_id?: string | null
          color_agenda?: string | null
          created_at?: string
          duracion_consulta?: number
          email?: string | null
          es_agendable?: boolean
          especialidad?: string
          id?: string
          id_clinica?: string
          nombre?: string
          numero_registro?: string | null
          puede_estetica?: boolean
          puede_indicar_examenes?: boolean
          puede_prescribir?: boolean
          recibe_notificaciones?: boolean
          rut?: string | null
          telefono?: string | null
          tipo_registro?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profesionales_especialidad_fkey"
            columns: ["especialidad"]
            isOneToOne: false
            referencedRelation: "especialidades_catalogo"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "profesionales_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      recordatorio_logs: {
        Row: {
          canal: string
          contenido_mensaje: string | null
          entregado_at: string | null
          enviado_at: string
          estado: string
          id: string
          id_cita: string
          id_clinica: string
          intent_respuesta: string | null
          leido_at: string | null
          respondido_at: string | null
          respuesta_paciente: string | null
          tipo: string
          wa_message_id: string | null
        }
        Insert: {
          canal: string
          contenido_mensaje?: string | null
          entregado_at?: string | null
          enviado_at?: string
          estado?: string
          id?: string
          id_cita: string
          id_clinica: string
          intent_respuesta?: string | null
          leido_at?: string | null
          respondido_at?: string | null
          respuesta_paciente?: string | null
          tipo: string
          wa_message_id?: string | null
        }
        Update: {
          canal?: string
          contenido_mensaje?: string | null
          entregado_at?: string | null
          enviado_at?: string
          estado?: string
          id?: string
          id_cita?: string
          id_clinica?: string
          intent_respuesta?: string | null
          leido_at?: string | null
          respondido_at?: string | null
          respuesta_paciente?: string | null
          tipo?: string
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recordatorio_logs_id_cita_fkey"
            columns: ["id_cita"]
            isOneToOne: false
            referencedRelation: "citas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordatorio_logs_id_cita_fkey"
            columns: ["id_cita"]
            isOneToOne: false
            referencedRelation: "citas_hoy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordatorio_logs_id_cita_fkey"
            columns: ["id_cita"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_cita"]
          },
          {
            foreignKeyName: "recordatorio_logs_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      servicios: {
        Row: {
          activo: boolean
          atiende_domicilio_default: boolean
          categoria: string | null
          created_at: string
          descripcion: string | null
          duracion_default_min: number
          icon_chat: string | null
          id: string
          id_clinica: string
          match_keywords: string[]
          nombre: string
          orden: number
          precio_domicilio: number | null
          precio_local: number | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          atiende_domicilio_default?: boolean
          categoria?: string | null
          created_at?: string
          descripcion?: string | null
          duracion_default_min?: number
          icon_chat?: string | null
          id?: string
          id_clinica: string
          match_keywords?: string[]
          nombre: string
          orden?: number
          precio_domicilio?: number | null
          precio_local?: number | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          atiende_domicilio_default?: boolean
          categoria?: string | null
          created_at?: string
          descripcion?: string | null
          duracion_default_min?: number
          icon_chat?: string | null
          id?: string
          id_clinica?: string
          match_keywords?: string[]
          nombre?: string
          orden?: number
          precio_domicilio?: number | null
          precio_local?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "servicios_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      sesiones_chat: {
        Row: {
          canal: Database["public"]["Enums"]["canal_contacto"]
          costo_total_usd: number | null
          created_at: string
          estado: string
          id: string
          id_clinica: string
          id_paciente: string | null
          intent_detectado: string | null
          metadata: Json
          session_id: string
          tokens_total: number | null
          updated_at: string
        }
        Insert: {
          canal?: Database["public"]["Enums"]["canal_contacto"]
          costo_total_usd?: number | null
          created_at?: string
          estado?: string
          id?: string
          id_clinica: string
          id_paciente?: string | null
          intent_detectado?: string | null
          metadata?: Json
          session_id: string
          tokens_total?: number | null
          updated_at?: string
        }
        Update: {
          canal?: Database["public"]["Enums"]["canal_contacto"]
          costo_total_usd?: number | null
          created_at?: string
          estado?: string
          id?: string
          id_clinica?: string
          id_paciente?: string | null
          intent_detectado?: string | null
          metadata?: Json
          session_id?: string
          tokens_total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sesiones_chat_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sesiones_chat_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sesiones_chat_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "sesiones_chat_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
        ]
      }
      sucursales_clinica: {
        Row: {
          activo: boolean
          ciudad: string | null
          comuna: string | null
          created_at: string
          direccion: string
          es_principal: boolean
          horario: Json | null
          id: string
          id_clinica: string
          nombre: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          ciudad?: string | null
          comuna?: string | null
          created_at?: string
          direccion: string
          es_principal?: boolean
          horario?: Json | null
          id?: string
          id_clinica: string
          nombre?: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          ciudad?: string | null
          comuna?: string | null
          created_at?: string
          direccion?: string
          es_principal?: boolean
          horario?: Json | null
          id?: string
          id_clinica?: string
          nombre?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sucursales_clinica_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_mensajes: {
        Row: {
          autor_id: string
          autor_nombre: string | null
          autor_tipo: string
          contenido: string
          created_at: string
          id: string
          id_ticket: string
        }
        Insert: {
          autor_id: string
          autor_nombre?: string | null
          autor_tipo: string
          contenido: string
          created_at?: string
          id?: string
          id_ticket: string
        }
        Update: {
          autor_id?: string
          autor_nombre?: string | null
          autor_tipo?: string
          contenido?: string
          created_at?: string
          id?: string
          id_ticket?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_mensajes_id_ticket_fkey"
            columns: ["id_ticket"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          asunto: string
          categoria: string
          creado_por: string
          created_at: string
          descripcion: string
          estado: string
          id: string
          id_clinica: string
          notas_internas: string | null
          prioridad: string
          resuelto_at: string | null
          updated_at: string
        }
        Insert: {
          asunto: string
          categoria: string
          creado_por: string
          created_at?: string
          descripcion: string
          estado?: string
          id?: string
          id_clinica: string
          notas_internas?: string | null
          prioridad?: string
          resuelto_at?: string | null
          updated_at?: string
        }
        Update: {
          asunto?: string
          categoria?: string
          creado_por?: string
          created_at?: string
          descripcion?: string
          estado?: string
          id?: string
          id_clinica?: string
          notas_internas?: string | null
          prioridad?: string
          resuelto_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_consumo_mensual: {
        Row: {
          costo_excedente_usd: number | null
          costo_meta_usd: number
          created_at: string
          cuota_incluida: number
          id: string
          id_clinica: string
          mes: string
          msgs_excedente: number | null
          msgs_marketing: number
          msgs_service: number
          msgs_utility: number
          updated_at: string
        }
        Insert: {
          costo_excedente_usd?: number | null
          costo_meta_usd?: number
          created_at?: string
          cuota_incluida: number
          id?: string
          id_clinica: string
          mes: string
          msgs_excedente?: number | null
          msgs_marketing?: number
          msgs_service?: number
          msgs_utility?: number
          updated_at?: string
        }
        Update: {
          costo_excedente_usd?: number | null
          costo_meta_usd?: number
          created_at?: string
          cuota_incluida?: number
          id?: string
          id_clinica?: string
          mes?: string
          msgs_excedente?: number | null
          msgs_marketing?: number
          msgs_service?: number
          msgs_utility?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_consumo_mensual_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversaciones_leidas: {
        Row: {
          id_clinica: string
          leido_hasta: string
          updated_at: string
          wa_phone: string
        }
        Insert: {
          id_clinica: string
          leido_hasta: string
          updated_at?: string
          wa_phone: string
        }
        Update: {
          id_clinica?: string
          leido_hasta?: string
          updated_at?: string
          wa_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversaciones_leidas_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          debounce_until: string | null
          error_message: string | null
          id: string
          id_clinica: string
          max_retries: number
          messages_concat: string
          phone_number_id: string
          raw_payload: Json
          retry_count: number
          started_at: string | null
          status: string
          updated_at: string
          wa_phone: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          debounce_until?: string | null
          error_message?: string | null
          id?: string
          id_clinica: string
          max_retries?: number
          messages_concat: string
          phone_number_id: string
          raw_payload: Json
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          wa_phone: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          debounce_until?: string | null
          error_message?: string | null
          id?: string
          id_clinica?: string
          max_retries?: number
          messages_concat?: string
          phone_number_id?: string
          raw_payload?: Json
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          wa_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_jobs_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_mensajes_log: {
        Row: {
          content: string | null
          costo_meta_usd: number | null
          created_at: string
          direction: string
          error_code: string | null
          error_message: string | null
          estado_respuesta: string | null
          id: string
          id_clinica: string
          message_type: string
          phone_number_id: string
          sms_fallback_at: string | null
          sms_fallback_sent: boolean | null
          status: string | null
          status_updated_at: string | null
          template_category: string | null
          template_name: string | null
          tokens_input: number | null
          tokens_output: number | null
          wa_phone: string
          wam_id: string | null
        }
        Insert: {
          content?: string | null
          costo_meta_usd?: number | null
          created_at?: string
          direction: string
          error_code?: string | null
          error_message?: string | null
          estado_respuesta?: string | null
          id?: string
          id_clinica: string
          message_type?: string
          phone_number_id: string
          sms_fallback_at?: string | null
          sms_fallback_sent?: boolean | null
          status?: string | null
          status_updated_at?: string | null
          template_category?: string | null
          template_name?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          wa_phone: string
          wam_id?: string | null
        }
        Update: {
          content?: string | null
          costo_meta_usd?: number | null
          created_at?: string
          direction?: string
          error_code?: string | null
          error_message?: string | null
          estado_respuesta?: string | null
          id?: string
          id_clinica?: string
          message_type?: string
          phone_number_id?: string
          sms_fallback_at?: string | null
          sms_fallback_sent?: boolean | null
          status?: string | null
          status_updated_at?: string | null
          template_category?: string | null
          template_name?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          wa_phone?: string
          wam_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_mensajes_log_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_sesiones: {
        Row: {
          context: Json | null
          created_at: string
          estado: string
          id: string
          id_clinica: string
          id_paciente: string | null
          intent_actual: string | null
          mensajes: Json
          ultimo_mensaje_paciente: string | null
          updated_at: string
          wa_phone: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          estado?: string
          id?: string
          id_clinica: string
          id_paciente?: string | null
          intent_actual?: string | null
          mensajes?: Json
          ultimo_mensaje_paciente?: string | null
          updated_at?: string
          wa_phone: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          estado?: string
          id?: string
          id_clinica?: string
          id_paciente?: string | null
          intent_actual?: string | null
          mensajes?: Json
          ultimo_mensaje_paciente?: string | null
          updated_at?: string
          wa_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sesiones_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_sesiones_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_sesiones_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_agenda_diaria"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "whatsapp_sesiones_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "vista_pacientes_clinicos"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          body_text: string
          category: string
          created_at: string
          id: string
          meta_template_id: string | null
          rejected_reason: string | null
          status: string
          template_language: string
          template_name: string
          updated_at: string
          variables_map: Json | null
          waba_id: string
        }
        Insert: {
          body_text: string
          category: string
          created_at?: string
          id?: string
          meta_template_id?: string | null
          rejected_reason?: string | null
          status?: string
          template_language?: string
          template_name: string
          updated_at?: string
          variables_map?: Json | null
          waba_id: string
        }
        Update: {
          body_text?: string
          category?: string
          created_at?: string
          id?: string
          meta_template_id?: string | null
          rejected_reason?: string | null
          status?: string
          template_language?: string
          template_name?: string
          updated_at?: string
          variables_map?: Json | null
          waba_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      citas_hoy: {
        Row: {
          canal_origen: Database["public"]["Enums"]["canal_contacto"] | null
          especialidad: string | null
          estado: Database["public"]["Enums"]["estado_cita"] | null
          fecha: string | null
          hora_fin: string | null
          hora_inicio: string | null
          id: string | null
          id_clinica: string | null
          paciente: string | null
          profesional: string | null
        }
        Relationships: [
          {
            foreignKeyName: "citas_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profesionales_especialidad_fkey"
            columns: ["especialidad"]
            isOneToOne: false
            referencedRelation: "especialidades_catalogo"
            referencedColumns: ["codigo"]
          },
        ]
      }
      metricas_canal: {
        Row: {
          canal: Database["public"]["Enums"]["canal_contacto"] | null
          costo_total: number | null
          id_clinica: string | null
          mes: string | null
          total_mensajes: number | null
          total_tokens: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conversaciones_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      vista_agenda_diaria: {
        Row: {
          canal_origen: Database["public"]["Enums"]["canal_contacto"] | null
          cita_metadata: Json | null
          color_agenda: string | null
          confirmada_at: string | null
          encuentro_status: string | null
          estado: Database["public"]["Enums"]["estado_cita"] | null
          fecha: string | null
          hora_fin: string | null
          hora_inicio: string | null
          id_cita: string | null
          id_clinica: string | null
          id_encuentro: string | null
          id_paciente: string | null
          id_pago: string | null
          id_profesional: string | null
          notas_cita: string | null
          paciente_apellido: string | null
          paciente_email: string | null
          paciente_nombre: string | null
          paciente_prevision: string | null
          paciente_rut: string | null
          paciente_telefono: string | null
          profesional_especialidad: string | null
          profesional_nombre: string | null
          requiere_pago: boolean | null
          servicio_nombre: string | null
        }
        Relationships: [
          {
            foreignKeyName: "citas_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profesionales_especialidad_fkey"
            columns: ["profesional_especialidad"]
            isOneToOne: false
            referencedRelation: "especialidades_catalogo"
            referencedColumns: ["codigo"]
          },
        ]
      }
      vista_pacientes_clinicos: {
        Row: {
          apellido_materno: string | null
          apellido_paterno: string | null
          canal_origen: Database["public"]["Enums"]["canal_contacto"] | null
          contacto_emergencia: Json | null
          direccion: Json | null
          email: string | null
          fecha_nacimiento: string | null
          id: string | null
          id_clinica: string | null
          identidad_genero: string | null
          nacionalidad: string | null
          nombre: string | null
          notas: string | null
          ocupacion: string | null
          prevision: Json | null
          proxima_cita_fecha: string | null
          proxima_cita_hora: string | null
          rut: string | null
          sexo_registral: string | null
          telefono: string | null
          total_citas_completadas: number | null
          total_citas_confirmadas: number | null
          total_encuentros: number | null
          ultima_atencion: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pacientes_id_clinica_fkey"
            columns: ["id_clinica"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      actualizar_estado_flow_merchant: {
        Args: { p_merchant_id: string; p_nuevo_status: number }
        Returns: Json
      }
      buscar_citas_paciente: {
        Args: { p_id_clinica: string; p_telefono: string }
        Returns: {
          estado: Database["public"]["Enums"]["estado_cita"]
          fecha: string
          hora_fin: string
          hora_inicio: string
          id_cita: string
          nombre_paciente: string
          profesional: string
          servicio_nota: string
        }[]
      }
      cancelar_cita:
        | { Args: { p_id_cita: string; p_motivo?: string }; Returns: Json }
        | {
            Args: {
              p_anulada_por?: string
              p_id_cita: string
              p_motivo?: string
            }
            Returns: Json
          }
      completar_diagnostico: {
        Args: {
          p_cantidad_prof: string
          p_desafios: string[]
          p_especialidad: string
          p_herramienta: string
          p_ip?: string
          p_lead_id: string
          p_responsable_wa: string
          p_urgencia: string
          p_user_agent?: string
          p_volumen: string
        }
        Returns: {
          pipeline_id: string
          plan: string
          precio: number
          score: number
        }[]
      }
      confirmar_pago_webhook: {
        Args: { p_payment_id?: string; p_session_id: string }
        Returns: Json
      }
      crear_clinica_completa: {
        Args: { p_owner_id: string; p_payload: Json }
        Returns: Json
      }
      crear_pago_pendiente: {
        Args: { p_id_cita: string; p_metodo: string; p_session_id?: string }
        Returns: Json
      }
      es_profesional_clinico: {
        Args: { p_id_clinica: string }
        Returns: boolean
      }
      fce_modulos_por_plan: { Args: { p_plan: string }; Returns: string[] }
      fn_checkin_paciente: {
        Args: {
          p_actor_id?: string
          p_id_cita: string
          p_metodo_pago?: string
          p_monto_clp?: number
        }
        Returns: Json
      }
      generar_disponibilidad_semanal: {
        Args: { p_id_clinica: string; p_semanas_adelante?: number }
        Returns: Json
      }
      get_clinica_ids_for_user: { Args: { user_id: string }; Returns: string[] }
      liberar_cita_sin_pago: {
        Args: { p_id_admin_user: string; p_id_cita: string; p_motivo: string }
        Returns: Json
      }
      liberar_citas_expiradas: {
        Args: { p_id_clinica?: string }
        Returns: Json
      }
      normalizar_rut: { Args: { p_rut: string }; Returns: string }
      obtener_agenda_dia: {
        Args: {
          p_fecha?: string
          p_id_clinica: string
          p_id_profesional?: string
        }
        Returns: {
          canal_origen: string
          cita_id: string
          estado_cita: string
          estado_pago: string
          estado_slot: string
          fecha: string
          hora_fin: string
          hora_inicio: string
          id_pago: string
          monto_abono: number
          notas_cita: string
          paciente_nombre: string
          paciente_telefono: string
          profesional: string
          profesional_id: string
          servicio_duracion: number
          servicio_nombre: string
          servicio_precio: number
          slot_id: string
        }[]
      }
      obtener_booking_config: { Args: { p_id_clinica: string }; Returns: Json }
      obtener_disponibilidad: {
        Args: {
          p_desde_fecha?: string
          p_dias_adelante?: number
          p_id_clinica: string
          p_id_profesional?: string
        }
        Returns: {
          duracion_minutos: number
          especialidad: string
          fecha: string
          hora_fin: string
          hora_inicio: string
          id_disponibilidad: string
          nombre_profesional: string
        }[]
      }
      obtener_monto_abono: {
        Args: { p_id_clinica: string; p_nombre_servicio?: string }
        Returns: Json
      }
      registrar_flow_merchant: {
        Args: {
          p_id_clinica: string
          p_merchant_id: string
          p_merchant_status?: number
        }
        Returns: Json
      }
      registrar_pago_manual: {
        Args: {
          p_id_admin_user: string
          p_id_cita: string
          p_metodo: string
          p_monto: number
          p_referencia?: string
        }
        Returns: Json
      }
      reservar_cita:
        | {
            Args: {
              p_canal?: Database["public"]["Enums"]["canal_contacto"]
              p_id_disponibilidad: string
              p_id_sesion?: string
              p_metadata?: Json
              p_nombre_paciente: string
              p_servicio?: string
              p_telefono_paciente: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_canal?: Database["public"]["Enums"]["canal_contacto"]
              p_id_disponibilidad: string
              p_id_profesional_servicio?: string
              p_id_sesion?: string
              p_metadata?: Json
              p_nombre_paciente: string
              p_servicio?: string
              p_telefono_paciente: string
            }
            Returns: Json
          }
      tiene_acceso_clinico: { Args: { p_id_clinica: string }; Returns: boolean }
      upgrade_plan_clinica: {
        Args: {
          p_id_clinica: string
          p_plan_anterior: string
          p_plan_nuevo: string
        }
        Returns: Json
      }
      validar_rut_chileno: { Args: { p_rut: string }; Returns: boolean }
      vault_delete_clinic_secrets: {
        Args: { p_id_clinica: string }
        Returns: number
      }
      vault_get_clinic_secret: {
        Args: { p_id_clinica: string; p_key_name: string }
        Returns: string
      }
      vault_set_clinic_secret: {
        Args: {
          p_id_clinica: string
          p_key_name: string
          p_secret_value: string
        }
        Returns: string
      }
      verificar_estado_pago: { Args: { p_id_cita: string }; Returns: Json }
    }
    Enums: {
      canal_contacto:
        | "web_widget"
        | "whatsapp"
        | "instagram_dm"
        | "telefono"
        | "otro"
      estado_cita:
        | "pendiente_pago"
        | "agendada"
        | "recordatorio_enviado"
        | "confirmada"
        | "completada"
        | "anulada"
        | "no_asiste"
      estado_pago:
        | "pendiente"
        | "aprobado"
        | "rechazado"
        | "reembolsado"
        | "expirado"
      rol_mensaje: "user" | "assistant" | "system"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      canal_contacto: [
        "web_widget",
        "whatsapp",
        "instagram_dm",
        "telefono",
        "otro",
      ],
      estado_cita: [
        "pendiente_pago",
        "agendada",
        "recordatorio_enviado",
        "confirmada",
        "completada",
        "anulada",
        "no_asiste",
      ],
      estado_pago: [
        "pendiente",
        "aprobado",
        "rechazado",
        "reembolsado",
        "expirado",
      ],
      rol_mensaje: ["user", "assistant", "system"],
    },
  },
} as const
