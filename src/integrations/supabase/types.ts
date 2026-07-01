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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          level: string
          metadata: Json
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          level?: string
          metadata?: Json
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          level?: string
          metadata?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      ai_insights: {
        Row: {
          created_at: string
          data: Json
          id: string
          kind: string
          severity: string
          summary: string | null
          title: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          kind: string
          severity?: string
          summary?: string | null
          title: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          kind?: string
          severity?: string
          summary?: string | null
          title?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      crm_deals: {
        Row: {
          created_at: string
          customer_id: string | null
          expected_close_at: string | null
          id: string
          notes: string | null
          owner_id: string | null
          probability: number
          stage: string
          title: string
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          expected_close_at?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          probability?: number
          stage?: string
          title: string
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          expected_close_at?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          probability?: number
          stage?: string
          title?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_deals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          city: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          last_order_at: string | null
          orders_count: number
          phone: string | null
          segment: string
          state: string | null
          total_spent: number
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          last_order_at?: string | null
          orders_count?: number
          phone?: string | null
          segment?: string
          state?: string | null
          total_spent?: number
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          last_order_at?: string | null
          orders_count?: number
          phone?: string | null
          segment?: string
          state?: string | null
          total_spent?: number
          updated_at?: string
        }
        Relationships: []
      }
      kpi_snapshots: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          name: string
          reference_date: string
          target: number | null
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          reference_date?: string
          target?: number | null
          value?: number
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          reference_date?: string
          target?: number | null
          value?: number
        }
        Relationships: []
      }
      leads: {
        Row: {
          city: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          lead_type: string | null
          modality: string | null
          name: string
          notes: string | null
          phone: string | null
          responsible: string | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          lead_type?: string | null
          modality?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          responsible?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          lead_type?: string | null
          modality?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          responsible?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      market_metrics: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          metric: string
          period_end: string | null
          period_start: string | null
          source: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          metric: string
          period_end?: string | null
          period_start?: string | null
          source: string
          value?: number
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          metric?: string
          period_end?: string | null
          period_start?: string | null
          source?: string
          value?: number
        }
        Relationships: []
      }
      meta_connections: {
        Row: {
          created_at: string
          facebook_user_id: string | null
          facebook_user_name: string | null
          id: string
          instagram_business_account_id: string | null
          instagram_username: string | null
          last_sync_at: string | null
          page_access_token: string
          page_id: string
          page_name: string
          page_picture_url: string | null
          scopes: string | null
          status: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          facebook_user_id?: string | null
          facebook_user_name?: string | null
          id?: string
          instagram_business_account_id?: string | null
          instagram_username?: string | null
          last_sync_at?: string | null
          page_access_token: string
          page_id: string
          page_name: string
          page_picture_url?: string | null
          scopes?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          facebook_user_id?: string | null
          facebook_user_name?: string | null
          id?: string
          instagram_business_account_id?: string | null
          instagram_username?: string | null
          last_sync_at?: string | null
          page_access_token?: string
          page_id?: string
          page_name?: string
          page_picture_url?: string | null
          scopes?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meta_oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          state: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          quantity: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          channel: string
          created_at: string
          customer_id: string | null
          discount: number
          id: string
          order_number: string | null
          placed_at: string
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          customer_id?: string | null
          discount?: number
          id?: string
          order_number?: string | null
          placed_at?: string
          status?: string
          total?: number
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          customer_id?: string | null
          discount?: number
          id?: string
          order_number?: string | null
          placed_at?: string
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          cost: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          sku: string | null
          source_url: string | null
          status: string
          stock: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: number
          sku?: string | null
          source_url?: string | null
          status?: string
          stock?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          sku?: string | null
          source_url?: string | null
          status?: string
          stock?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_posts: {
        Row: {
          caption: string
          created_at: string
          error: string | null
          id: string
          ig_media_id: string | null
          ig_permalink: string | null
          image_url: string
          product_id: string | null
          published_at: string | null
          scheduled_for: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          caption: string
          created_at?: string
          error?: string | null
          id?: string
          ig_media_id?: string | null
          ig_permalink?: string | null
          image_url: string
          product_id?: string | null
          published_at?: string | null
          scheduled_for?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string
          created_at?: string
          error?: string | null
          id?: string
          ig_media_id?: string | null
          ig_permalink?: string | null
          image_url?: string
          product_id?: string | null
          published_at?: string | null
          scheduled_for?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
