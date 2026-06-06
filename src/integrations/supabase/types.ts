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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_creations: {
        Row: {
          created_at: string
          id: string
          image_url: string
          prompt: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          prompt?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          prompt?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      catalog_decor_links: {
        Row: {
          catalog_id: string
          created_at: string
          decor_id: string
          display_order: number
          id: string
        }
        Insert: {
          catalog_id: string
          created_at?: string
          decor_id: string
          display_order?: number
          id?: string
        }
        Update: {
          catalog_id?: string
          created_at?: string
          decor_id?: string
          display_order?: number
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_decor_links_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "catalogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_decor_links_decor_id_fkey"
            columns: ["decor_id"]
            isOneToOne: false
            referencedRelation: "decors"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogs: {
        Row: {
          code: Database["public"]["Enums"]["catalog_code"]
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          label: string
          project_type: Database["public"]["Enums"]["usage_context"]
          updated_at: string
        }
        Insert: {
          code: Database["public"]["Enums"]["catalog_code"]
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          label: string
          project_type: Database["public"]["Enums"]["usage_context"]
          updated_at?: string
        }
        Update: {
          code?: Database["public"]["Enums"]["catalog_code"]
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          label?: string
          project_type?: Database["public"]["Enums"]["usage_context"]
          updated_at?: string
        }
        Relationships: []
      }
      creative_favorites: {
        Row: {
          created_at: string
          id: string
          image_data: string | null
          prompt: string
          response: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_data?: string | null
          prompt: string
          response: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_data?: string | null
          prompt?: string
          response?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      decor_categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      decors: {
        Row: {
          catalog_pdf_url: string | null
          category: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          reference_code: string
          texture_image_url: string
          updated_at: string
          usage_contexts: Database["public"]["Enums"]["usage_context"][]
        }
        Insert: {
          catalog_pdf_url?: string | null
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          reference_code: string
          texture_image_url: string
          updated_at?: string
          usage_contexts?: Database["public"]["Enums"]["usage_context"][]
        }
        Update: {
          catalog_pdf_url?: string | null
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          reference_code?: string
          texture_image_url?: string
          updated_at?: string
          usage_contexts?: Database["public"]["Enums"]["usage_context"][]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accent_color_hex: string | null
          addressline1: string | null
          addressline2: string | null
          city: string | null
          cobranding_enabled: boolean | null
          company_name: string | null
          contact_name: string | null
          country: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          is_active: boolean
          last_name: string | null
          logo_url: string | null
          phone: string | null
          postal_code: string | null
          siret: string | null
          tagline: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          accent_color_hex?: string | null
          addressline1?: string | null
          addressline2?: string | null
          city?: string | null
          cobranding_enabled?: boolean | null
          company_name?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          is_active?: boolean
          last_name?: string | null
          logo_url?: string | null
          phone?: string | null
          postal_code?: string | null
          siret?: string | null
          tagline?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          accent_color_hex?: string | null
          addressline1?: string | null
          addressline2?: string | null
          city?: string | null
          cobranding_enabled?: boolean | null
          company_name?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          logo_url?: string | null
          phone?: string | null
          postal_code?: string | null
          siret?: string | null
          tagline?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      project_photos: {
        Row: {
          created_at: string
          id: string
          original_image_url: string
          project_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          original_image_url: string
          project_id: string
        }
        Update: {
          created_at?: string
          id?: string
          original_image_url?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_reference: string | null
          created_at: string
          id: string
          title: string
          updated_at: string
          use_case: Database["public"]["Enums"]["usage_context"]
          user_id: string
        }
        Insert: {
          client_reference?: string | null
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          use_case?: Database["public"]["Enums"]["usage_context"]
          user_id: string
        }
        Update: {
          client_reference?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          use_case?: Database["public"]["Enums"]["usage_context"]
          user_id?: string
        }
        Relationships: []
      }
      render_favorites: {
        Row: {
          created_at: string
          id: string
          render_result_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          render_result_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          render_result_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "render_favorites_render_result_id_fkey"
            columns: ["render_result_id"]
            isOneToOne: false
            referencedRelation: "render_results"
            referencedColumns: ["id"]
          },
        ]
      }
      render_results: {
        Row: {
          created_at: string
          decor_id: string | null
          id: string
          project_photo_id: string
          result_image_url: string
        }
        Insert: {
          created_at?: string
          decor_id?: string | null
          id?: string
          project_photo_id: string
          result_image_url: string
        }
        Update: {
          created_at?: string
          decor_id?: string | null
          id?: string
          project_photo_id?: string
          result_image_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "render_results_decor_id_fkey"
            columns: ["decor_id"]
            isOneToOne: false
            referencedRelation: "decors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "render_results_project_photo_id_fkey"
            columns: ["project_photo_id"]
            isOneToOne: false
            referencedRelation: "project_photos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quotas: {
        Row: {
          created_at: string
          id: string
          quota_limit: number
          quota_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quota_limit?: number
          quota_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quota_limit?: number
          quota_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_and_increment_quota: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_quota_used: { Args: { p_user_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "client"
      catalog_code:
        | "elevator_walls"
        | "elevator_floors"
        | "van_evasion"
        | "terrace_compact"
        | "other_all"
      usage_context: "ascenseur" | "van" | "terrasse" | "autre"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "client"],
      catalog_code: [
        "elevator_walls",
        "elevator_floors",
        "van_evasion",
        "terrace_compact",
        "other_all",
      ],
      usage_context: ["ascenseur", "van", "terrasse", "autre"],
    },
  },
} as const
