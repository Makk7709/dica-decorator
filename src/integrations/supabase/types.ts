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
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "client"
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
      usage_context: ["ascenseur", "van", "terrasse", "autre"],
    },
  },
} as const
