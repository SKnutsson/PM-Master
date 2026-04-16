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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          is_milestone: boolean
          name: string
          notes: string | null
          phase: string | null
          project_id: string
          responsible: string
          sort_order: number | null
          start_date: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_milestone?: boolean
          name: string
          notes?: string | null
          phase?: string | null
          project_id: string
          responsible: string
          sort_order?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_milestone?: boolean
          name?: string
          notes?: string | null
          phase?: string | null
          project_id?: string
          responsible?: string
          sort_order?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_resource_entries: {
        Row: {
          created_at: string
          date: string
          id: string
          installer_id: string | null
          planned_travel_hours: number
          planned_work_hours: number
          project_id: string
          project_installer_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          installer_id?: string | null
          planned_travel_hours?: number
          planned_work_hours?: number
          project_id: string
          project_installer_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          installer_id?: string | null
          planned_travel_hours?: number
          planned_work_hours?: number
          project_id?: string
          project_installer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_resource_entries_installer_id_fkey"
            columns: ["installer_id"]
            isOneToOne: false
            referencedRelation: "installers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_resource_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_resource_entries_project_installer_id_fkey"
            columns: ["project_installer_id"]
            isOneToOne: false
            referencedRelation: "project_installers"
            referencedColumns: ["id"]
          },
        ]
      }
      documentation_items: {
        Row: {
          created_at: string
          deadline: string | null
          document_type: string
          id: string
          notes: string | null
          project_id: string
          responsible: string | null
          sort_order: number
          status: string
          submitted_date: string | null
          submitted_to: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          document_type?: string
          id?: string
          notes?: string | null
          project_id: string
          responsible?: string | null
          sort_order?: number
          status?: string
          submitted_date?: string | null
          submitted_to?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deadline?: string | null
          document_type?: string
          id?: string
          notes?: string | null
          project_id?: string
          responsible?: string | null
          sort_order?: number
          status?: string
          submitted_date?: string | null
          submitted_to?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentation_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_template_items: {
        Row: {
          created_at: string
          id: string
          item_type: string
          name: string
          sort_order: number
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_type?: string
          name: string
          sort_order?: number
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_type?: string
          name?: string
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "finance_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_templates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      forecast_events: {
        Row: {
          changed_by: string | null
          created_at: string
          details: string | null
          event_type: string
          forecast_id: string | null
          id: string
          new_value: string | null
          old_value: string | null
          product_name: string | null
          project_name: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          details?: string | null
          event_type: string
          forecast_id?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          product_name?: string | null
          project_name: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          details?: string | null
          event_type?: string
          forecast_id?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          product_name?: string | null
          project_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "forecast_events_forecast_id_fkey"
            columns: ["forecast_id"]
            isOneToOne: false
            referencedRelation: "forecasts"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_months: {
        Row: {
          amount: number
          created_at: string | null
          forecast_id: string
          id: string
          month: string
          year: number
        }
        Insert: {
          amount?: number
          created_at?: string | null
          forecast_id: string
          id?: string
          month: string
          year?: number
        }
        Update: {
          amount?: number
          created_at?: string | null
          forecast_id?: string
          id?: string
          month?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "forecast_months_forecast_id_fkey"
            columns: ["forecast_id"]
            isOneToOne: false
            referencedRelation: "forecasts"
            referencedColumns: ["id"]
          },
        ]
      }
      forecasts: {
        Row: {
          created_at: string | null
          deal_status: Database["public"]["Enums"]["deal_status"]
          id: string
          notes: string | null
          product: string
          project: string
          sales_person: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deal_status?: Database["public"]["Enums"]["deal_status"]
          id?: string
          notes?: string | null
          product: string
          project: string
          sales_person?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deal_status?: Database["public"]["Enums"]["deal_status"]
          id?: string
          notes?: string | null
          product?: string
          project?: string
          sales_person?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      installers: {
        Row: {
          company: string
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          company?: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          company?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lifecycle_items: {
        Row: {
          created_at: string
          id: string
          node_id: string
          sort_order: number
          text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          node_id: string
          sort_order?: number
          text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          node_id?: string
          sort_order?: number
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lifecycle_items_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "lifecycle_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      lifecycle_nodes: {
        Row: {
          created_at: string
          id: string
          name: string
          node_type: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          node_type?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          node_type?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_color: string | null
          created_at: string
          display_name: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string
          user_id: string
          user_role: string | null
        }
        Insert: {
          avatar_color?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
          user_role?: string | null
        }
        Update: {
          avatar_color?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          user_role?: string | null
        }
        Relationships: []
      }
      project_accounting: {
        Row: {
          created_at: string
          id: string
          project_id: string
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_accounting_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_accounting_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "finance_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_budget_lines: {
        Row: {
          budgeted_amount: number
          created_at: string
          id: string
          item_type: string
          name: string
          project_accounting_id: string
          sort_order: number
          template_item_id: string | null
          updated_at: string
        }
        Insert: {
          budgeted_amount?: number
          created_at?: string
          id?: string
          item_type?: string
          name?: string
          project_accounting_id: string
          sort_order?: number
          template_item_id?: string | null
          updated_at?: string
        }
        Update: {
          budgeted_amount?: number
          created_at?: string
          id?: string
          item_type?: string
          name?: string
          project_accounting_id?: string
          sort_order?: number
          template_item_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_budget_lines_project_accounting_id_fkey"
            columns: ["project_accounting_id"]
            isOneToOne: false
            referencedRelation: "project_accounting"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budget_lines_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "finance_template_items"
            referencedColumns: ["id"]
          },
        ]
      }
      project_finances: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          date: string
          description: string
          id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          id?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_finances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_installers: {
        Row: {
          created_at: string
          id: string
          installer_id: string | null
          is_vacant: boolean
          project_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          installer_id?: string | null
          is_vacant?: boolean
          project_id: string
        }
        Update: {
          created_at?: string
          id?: string
          installer_id?: string | null
          is_vacant?: boolean
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_installers_installer_id_fkey"
            columns: ["installer_id"]
            isOneToOne: false
            referencedRelation: "installers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_installers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_resource_allocations: {
        Row: {
          created_at: string
          end_date: string
          id: string
          installer_id: string
          planned_hours: number
          project_id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          installer_id: string
          planned_hours?: number
          project_id: string
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          installer_id?: string
          planned_hours?: number
          project_id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_resource_allocations_installer_id_fkey"
            columns: ["installer_id"]
            isOneToOne: false
            referencedRelation: "installers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_resource_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_transactions: {
        Row: {
          amount: number
          budget_line_id: string
          created_at: string
          date: string
          id: string
          note: string | null
        }
        Insert: {
          amount?: number
          budget_line_id: string
          created_at?: string
          date?: string
          id?: string
          note?: string | null
        }
        Update: {
          amount?: number
          budget_line_id?: string
          created_at?: string
          date?: string
          id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_transactions_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "project_budget_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          code: string | null
          created_at: string | null
          customer: string
          department: string
          end_date: string | null
          id: string
          name: string
          notes: string | null
          product: string | null
          progress: number | null
          project_manager: string | null
          sales_person: string | null
          sort_order: number | null
          start_date: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          customer: string
          department: string
          end_date?: string | null
          id?: string
          name: string
          notes?: string | null
          product?: string | null
          progress?: number | null
          project_manager?: string | null
          sales_person?: string | null
          sort_order?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          customer?: string
          department?: string
          end_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          product?: string | null
          progress?: number | null
          project_manager?: string | null
          sales_person?: string | null
          sort_order?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      resource_estimations: {
        Row: {
          created_at: string
          estimated_install_hours: number
          estimated_travel_hours: number
          id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          estimated_install_hours?: number
          estimated_travel_hours?: number
          id?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          estimated_install_hours?: number
          estimated_travel_hours?: number
          id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_estimations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_targets: {
        Row: {
          created_at: string
          id: string
          target_msek: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          target_msek?: number
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          target_msek?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      schedule_history: {
        Row: {
          forecast_id: string
          id: string
          moved_at: string | null
          new_month: string
          original_amount: number
          original_month: string
        }
        Insert: {
          forecast_id: string
          id?: string
          moved_at?: string | null
          new_month: string
          original_amount: number
          original_month: string
        }
        Update: {
          forecast_id?: string
          id?: string
          moved_at?: string | null
          new_month?: string
          original_amount?: number
          original_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_history_forecast_id_fkey"
            columns: ["forecast_id"]
            isOneToOne: false
            referencedRelation: "forecasts"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          comment: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          id: string
          name: string
          project_id: string | null
          responsible: string
          status: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          id?: string
          name: string
          project_id?: string | null
          responsible?: string
          status?: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          id?: string
          name?: string
          project_id?: string | null
          responsible?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      is_authenticated: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      deal_status: "Budget" | "Offert" | "Order" | "Fakturerad" | "Förlorad"
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
      app_role: ["admin", "user"],
      deal_status: ["Budget", "Offert", "Order", "Fakturerad", "Förlorad"],
    },
  },
} as const
