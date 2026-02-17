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
      activity_images: {
        Row: {
          activity_id: number
          created_at: string | null
          id: string
          image_base64: string
          locale: string
        }
        Insert: {
          activity_id: number
          created_at?: string | null
          id?: string
          image_base64: string
          locale: string
        }
        Update: {
          activity_id?: number
          created_at?: string | null
          id?: string
          image_base64?: string
          locale?: string
        }
        Relationships: []
      }
      assessment_events: {
        Row: {
          area_id: number | null
          assessment_id: string
          baby_id: string
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          milestone_id: number | null
          question_index: number | null
          session_id: string | null
          skill_id: number | null
          user_agent: string | null
        }
        Insert: {
          area_id?: number | null
          assessment_id: string
          baby_id: string
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          milestone_id?: number | null
          question_index?: number | null
          session_id?: string | null
          skill_id?: number | null
          user_agent?: string | null
        }
        Update: {
          area_id?: number | null
          assessment_id?: string
          baby_id?: string
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          milestone_id?: number | null
          question_index?: number | null
          session_id?: string | null
          skill_id?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_events_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_events_baby_id_fkey"
            columns: ["baby_id"]
            isOneToOne: false
            referencedRelation: "babies"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_responses: {
        Row: {
          answer: string
          area_id: number | null
          assessment_id: string
          created_at: string | null
          id: string
          milestone_id: number
          skill_id: number | null
          source: string | null
        }
        Insert: {
          answer: string
          area_id?: number | null
          assessment_id: string
          created_at?: string | null
          id?: string
          milestone_id: number
          skill_id?: number | null
          source?: string | null
        }
        Update: {
          answer?: string
          area_id?: number | null
          assessment_id?: string
          created_at?: string | null
          id?: string
          milestone_id?: number
          skill_id?: number | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_responses_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          baby_id: string
          completed_at: string | null
          created_at: string | null
          email_sent_at: string | null
          id: string
          locale: string | null
          reference_age_months: number
          started_at: string | null
        }
        Insert: {
          baby_id: string
          completed_at?: string | null
          created_at?: string | null
          email_sent_at?: string | null
          id?: string
          locale?: string | null
          reference_age_months: number
          started_at?: string | null
        }
        Update: {
          baby_id?: string
          completed_at?: string | null
          created_at?: string | null
          email_sent_at?: string | null
          id?: string
          locale?: string | null
          reference_age_months?: number
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_baby_id_fkey"
            columns: ["baby_id"]
            isOneToOne: false
            referencedRelation: "babies"
            referencedColumns: ["id"]
          },
        ]
      }
      babies: {
        Row: {
          birthdate: string
          created_at: string | null
          email: string | null
          gestational_weeks: number | null
          id: string
          name: string
          sex_at_birth: string | null
          user_id: string | null
        }
        Insert: {
          birthdate: string
          created_at?: string | null
          email?: string | null
          gestational_weeks?: number | null
          id?: string
          name: string
          sex_at_birth?: string | null
          user_id?: string | null
        }
        Update: {
          birthdate?: string
          created_at?: string | null
          email?: string | null
          gestational_weeks?: number | null
          id?: string
          name?: string
          sex_at_birth?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "babies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_updates: {
        Row: {
          area_id: number
          baby_id: string
          created_at: string | null
          id: string
          milestone_id: number
          skill_id: number
          status: string
          updated_at: string | null
        }
        Insert: {
          area_id: number
          baby_id: string
          created_at?: string | null
          id?: string
          milestone_id: number
          skill_id: number
          status: string
          updated_at?: string | null
        }
        Update: {
          area_id?: number
          baby_id?: string
          created_at?: string | null
          id?: string
          milestone_id?: number
          skill_id?: number
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "milestone_updates_baby_id_fkey"
            columns: ["baby_id"]
            isOneToOne: false
            referencedRelation: "babies"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          age: number
          area_id: number
          area_name: string
          created_at: string | null
          description: string
          locale: string
          media_jpg_content_type: string | null
          media_jpg_file_name: string | null
          media_mp4_content_type: string | null
          media_mp4_file_name: string | null
          milestone_id: number
          question: string
          science_fact: string
          skill_id: number
          skill_name: string
          source_data: string
        }
        Insert: {
          age: number
          area_id: number
          area_name: string
          created_at?: string | null
          description: string
          locale?: string
          media_jpg_content_type?: string | null
          media_jpg_file_name?: string | null
          media_mp4_content_type?: string | null
          media_mp4_file_name?: string | null
          milestone_id: number
          question: string
          science_fact: string
          skill_id: number
          skill_name: string
          source_data: string
        }
        Update: {
          age?: number
          area_id?: number
          area_name?: string
          created_at?: string | null
          description?: string
          locale?: string
          media_jpg_content_type?: string | null
          media_jpg_file_name?: string | null
          media_mp4_content_type?: string | null
          media_mp4_file_name?: string | null
          milestone_id?: number
          question?: string
          science_fact?: string
          skill_id?: number
          skill_name?: string
          source_data?: string
        }
        Relationships: []
      }
      page_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      skill_percentile_curves: {
        Row: {
          age_months: number
          created_at: string | null
          id: string
          locale: string
          percentile: number
          probability: number
          skill_id: number
          skill_name: string
        }
        Insert: {
          age_months: number
          created_at?: string | null
          id?: string
          locale?: string
          percentile: number
          probability: number
          skill_id: number
          skill_name: string
        }
        Update: {
          age_months?: number
          created_at?: string | null
          id?: string
          locale?: string
          percentile?: number
          probability?: number
          skill_id?: number
          skill_name?: string
        }
        Relationships: []
      }
      skill_probability_curves: {
        Row: {
          age_months: number
          created_at: string | null
          id: string
          locale: string
          mark_key: string
          probability: number
          skill_id: number
          skill_name: string
        }
        Insert: {
          age_months: number
          created_at?: string | null
          id?: string
          locale?: string
          mark_key: string
          probability: number
          skill_id: number
          skill_name: string
        }
        Update: {
          age_months?: number
          created_at?: string | null
          id?: string
          locale?: string
          mark_key?: string
          probability?: number
          skill_id?: number
          skill_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      link_baby_after_signup: {
        Args: { assessment_uuid: string; baby_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
