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
      auto_post_settings: {
        Row: {
          categories: string[]
          created_at: string
          daily_plan: Json
          enabled: boolean
          id: string
          last_error: string | null
          last_run_at: string | null
          last_status: string | null
          schedule_hours_utc: number[]
          singleton: boolean
          tone: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          categories?: string[]
          created_at?: string
          daily_plan?: Json
          enabled?: boolean
          id?: string
          last_error?: string | null
          last_run_at?: string | null
          last_status?: string | null
          schedule_hours_utc?: number[]
          singleton?: boolean
          tone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          categories?: string[]
          created_at?: string
          daily_plan?: Json
          enabled?: boolean
          id?: string
          last_error?: string | null
          last_run_at?: string | null
          last_status?: string | null
          schedule_hours_utc?: number[]
          singleton?: boolean
          tone?: string
          updated_at?: string
          updated_by?: string | null
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      ig_accounts: {
        Row: {
          account_type: string | null
          biography: string | null
          category: string | null
          connection_id: string | null
          created_at: string
          followers_count: number | null
          follows_count: number | null
          id: string
          ig_user_id: string
          last_synced_at: string | null
          media_count: number | null
          name: string | null
          profile_picture_url: string | null
          status: string
          updated_at: string
          user_id: string
          username: string | null
          website: string | null
        }
        Insert: {
          account_type?: string | null
          biography?: string | null
          category?: string | null
          connection_id?: string | null
          created_at?: string
          followers_count?: number | null
          follows_count?: number | null
          id?: string
          ig_user_id: string
          last_synced_at?: string | null
          media_count?: number | null
          name?: string | null
          profile_picture_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
          username?: string | null
          website?: string | null
        }
        Update: {
          account_type?: string | null
          biography?: string | null
          category?: string | null
          connection_id?: string | null
          created_at?: string
          followers_count?: number | null
          follows_count?: number | null
          id?: string
          ig_user_id?: string
          last_synced_at?: string | null
          media_count?: number | null
          name?: string | null
          profile_picture_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          username?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ig_accounts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "meta_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_automations: {
        Row: {
          actions: Json | null
          conditions: Json | null
          created_at: string
          enabled: boolean
          id: string
          last_run_at: string | null
          name: string
          runs_count: number
          trigger: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          name: string
          runs_count?: number
          trigger: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          name?: string
          runs_count?: number
          trigger?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ig_comments: {
        Row: {
          comment_id: string
          created_at: string
          from_id: string | null
          from_username: string | null
          id: string
          ig_account_id: string | null
          media_id: string | null
          parent_id: string | null
          replied: boolean | null
          text: string | null
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          from_id?: string | null
          from_username?: string | null
          id?: string
          ig_account_id?: string | null
          media_id?: string | null
          parent_id?: string | null
          replied?: boolean | null
          text?: string | null
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          from_id?: string | null
          from_username?: string | null
          id?: string
          ig_account_id?: string | null
          media_id?: string | null
          parent_id?: string | null
          replied?: boolean | null
          text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ig_comments_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_conversations: {
        Row: {
          ai_intent: string | null
          ai_priority: number | null
          ai_summary: string | null
          assignee_id: string | null
          channel: string
          created_at: string
          id: string
          ig_account_id: string | null
          last_message_at: string | null
          last_message_preview: string | null
          lead_id: string | null
          notes: string | null
          participant_avatar_url: string | null
          participant_igsid: string
          participant_name: string | null
          participant_username: string | null
          status: string
          tags: string[] | null
          unread_count: number
          updated_at: string
          user_id: string
          window_expires_at: string | null
        }
        Insert: {
          ai_intent?: string | null
          ai_priority?: number | null
          ai_summary?: string | null
          assignee_id?: string | null
          channel?: string
          created_at?: string
          id?: string
          ig_account_id?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          lead_id?: string | null
          notes?: string | null
          participant_avatar_url?: string | null
          participant_igsid: string
          participant_name?: string | null
          participant_username?: string | null
          status?: string
          tags?: string[] | null
          unread_count?: number
          updated_at?: string
          user_id: string
          window_expires_at?: string | null
        }
        Update: {
          ai_intent?: string | null
          ai_priority?: number | null
          ai_summary?: string | null
          assignee_id?: string | null
          channel?: string
          created_at?: string
          id?: string
          ig_account_id?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          lead_id?: string | null
          notes?: string | null
          participant_avatar_url?: string | null
          participant_igsid?: string
          participant_name?: string | null
          participant_username?: string | null
          status?: string
          tags?: string[] | null
          unread_count?: number
          updated_at?: string
          user_id?: string
          window_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ig_conversations_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_events: {
        Row: {
          actor_id: string | null
          conversation_id: string | null
          created_at: string
          event_type: string
          id: string
          lead_id: string | null
          payload: Json | null
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          conversation_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          lead_id?: string | null
          payload?: Json | null
          user_id: string
        }
        Update: {
          actor_id?: string | null
          conversation_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          lead_id?: string | null
          payload?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ig_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ig_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_media_cache: {
        Row: {
          caption: string | null
          comments_count: number | null
          id: string
          ig_account_id: string | null
          like_count: number | null
          media_id: string
          media_type: string | null
          media_url: string | null
          permalink: string | null
          synced_at: string
          thumbnail_url: string | null
          timestamp: string | null
          user_id: string
        }
        Insert: {
          caption?: string | null
          comments_count?: number | null
          id?: string
          ig_account_id?: string | null
          like_count?: number | null
          media_id: string
          media_type?: string | null
          media_url?: string | null
          permalink?: string | null
          synced_at?: string
          thumbnail_url?: string | null
          timestamp?: string | null
          user_id: string
        }
        Update: {
          caption?: string | null
          comments_count?: number | null
          id?: string
          ig_account_id?: string | null
          like_count?: number | null
          media_id?: string
          media_type?: string | null
          media_url?: string | null
          permalink?: string | null
          synced_at?: string
          thumbnail_url?: string | null
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ig_media_cache_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_messages: {
        Row: {
          attachments: Json | null
          conversation_id: string
          created_at: string
          direction: string
          id: string
          is_echo: boolean | null
          mid: string | null
          sent_at: string
          text: string | null
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          conversation_id: string
          created_at?: string
          direction: string
          id?: string
          is_echo?: boolean | null
          mid?: string | null
          sent_at?: string
          text?: string | null
          user_id: string
        }
        Update: {
          attachments?: Json | null
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: string
          is_echo?: boolean | null
          mid?: string | null
          sent_at?: string
          text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ig_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ig_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_sync_log: {
        Row: {
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          ig_account_id: string | null
          items_count: number | null
          status: string
          sync_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          ig_account_id?: string | null
          items_count?: number | null
          status: string
          sync_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          ig_account_id?: string | null
          items_count?: number | null
          status?: string
          sync_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ig_sync_log_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_webhook_log: {
        Row: {
          entry_id: string | null
          error: string | null
          event_type: string | null
          id: string
          object: string | null
          payload: Json | null
          processed: boolean | null
          received_at: string
          signature_valid: boolean | null
        }
        Insert: {
          entry_id?: string | null
          error?: string | null
          event_type?: string | null
          id?: string
          object?: string | null
          payload?: Json | null
          processed?: boolean | null
          received_at?: string
          signature_valid?: boolean | null
        }
        Update: {
          entry_id?: string | null
          error?: string | null
          event_type?: string | null
          id?: string
          object?: string | null
          payload?: Json | null
          processed?: boolean | null
          received_at?: string
          signature_valid?: boolean | null
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
      price_research: {
        Row: {
          competitor_name: string | null
          competitor_price: number | null
          competitor_url: string
          created_at: string
          currency: string | null
          description: string | null
          id: string
          product_id: string
          raw_snippet: string | null
          similarity_score: number | null
          source_type: string | null
          title: string | null
        }
        Insert: {
          competitor_name?: string | null
          competitor_price?: number | null
          competitor_url: string
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          product_id: string
          raw_snippet?: string | null
          similarity_score?: number | null
          source_type?: string | null
          title?: string | null
        }
        Update: {
          competitor_name?: string | null
          competitor_price?: number | null
          competitor_url?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          product_id?: string
          raw_snippet?: string | null
          similarity_score?: number | null
          source_type?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_research_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      price_suggestions: {
        Row: {
          avg_market: number | null
          competitors_analyzed: number
          created_at: string
          current_price: number
          description_gap: string | null
          id: string
          max_market: number | null
          min_market: number | null
          position: string | null
          product_id: string
          reasoning: string | null
          suggested_price: number
        }
        Insert: {
          avg_market?: number | null
          competitors_analyzed?: number
          created_at?: string
          current_price: number
          description_gap?: string | null
          id?: string
          max_market?: number | null
          min_market?: number | null
          position?: string | null
          product_id: string
          reasoning?: string | null
          suggested_price: number
        }
        Update: {
          avg_market?: number | null
          competitors_analyzed?: number
          created_at?: string
          current_price?: number
          description_gap?: string | null
          id?: string
          max_market?: number | null
          min_market?: number | null
          position?: string | null
          product_id?: string
          reasoning?: string | null
          suggested_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_suggestions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
          wc_product_id: number | null
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
          wc_product_id?: number | null
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
          wc_product_id?: number | null
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
      prospect_automations: {
        Row: {
          actions: Json
          active: boolean
          conditions: Json
          created_at: string
          id: string
          last_run_at: string | null
          name: string
          owner_id: string
          runs_count: number
          trigger: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          active?: boolean
          conditions?: Json
          created_at?: string
          id?: string
          last_run_at?: string | null
          name: string
          owner_id: string
          runs_count?: number
          trigger: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          active?: boolean
          conditions?: Json
          created_at?: string
          id?: string
          last_run_at?: string | null
          name?: string
          owner_id?: string
          runs_count?: number
          trigger?: string
          updated_at?: string
        }
        Relationships: []
      }
      prospect_companies: {
        Row: {
          address: string | null
          ai_pitch: string | null
          ai_summary: string | null
          best_channel:
            | Database["public"]["Enums"]["prospect_contact_channel"]
            | null
          business_hours: string | null
          category: string | null
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          enriched_at: string | null
          id: string
          last_contacted_at: string | null
          lat: number | null
          lng: number | null
          logo_url: string | null
          name: string
          normalized_name: string
          notes: string | null
          origin: string | null
          owner_id: string
          phone: string | null
          pipeline_stage: Database["public"]["Enums"]["prospect_pipeline_stage"]
          postal_code: string | null
          responsible_name: string | null
          score: number
          segment: string | null
          source_url: string | null
          state: string | null
          status: Database["public"]["Enums"]["prospect_lead_status"]
          tags: string[]
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          ai_pitch?: string | null
          ai_summary?: string | null
          best_channel?:
            | Database["public"]["Enums"]["prospect_contact_channel"]
            | null
          business_hours?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          enriched_at?: string | null
          id?: string
          last_contacted_at?: string | null
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name: string
          normalized_name: string
          notes?: string | null
          origin?: string | null
          owner_id: string
          phone?: string | null
          pipeline_stage?: Database["public"]["Enums"]["prospect_pipeline_stage"]
          postal_code?: string | null
          responsible_name?: string | null
          score?: number
          segment?: string | null
          source_url?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["prospect_lead_status"]
          tags?: string[]
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          ai_pitch?: string | null
          ai_summary?: string | null
          best_channel?:
            | Database["public"]["Enums"]["prospect_contact_channel"]
            | null
          business_hours?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          enriched_at?: string | null
          id?: string
          last_contacted_at?: string | null
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name?: string
          normalized_name?: string
          notes?: string | null
          origin?: string | null
          owner_id?: string
          phone?: string | null
          pipeline_stage?: Database["public"]["Enums"]["prospect_pipeline_stage"]
          postal_code?: string | null
          responsible_name?: string | null
          score?: number
          segment?: string | null
          source_url?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["prospect_lead_status"]
          tags?: string[]
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      prospect_contacts: {
        Row: {
          channel: Database["public"]["Enums"]["prospect_contact_channel"]
          company_id: string
          created_at: string
          id: string
          is_primary: boolean
          label: string | null
          owner_id: string
          source: string | null
          value: string
          verified: boolean
        }
        Insert: {
          channel: Database["public"]["Enums"]["prospect_contact_channel"]
          company_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          label?: string | null
          owner_id: string
          source?: string | null
          value: string
          verified?: boolean
        }
        Update: {
          channel?: Database["public"]["Enums"]["prospect_contact_channel"]
          company_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          label?: string | null
          owner_id?: string
          source?: string | null
          value?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "prospect_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospect_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_enrichment_jobs: {
        Row: {
          attempts: number
          company_id: string
          created_at: string
          error: string | null
          fields_found: Json
          finished_at: string | null
          id: string
          owner_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["prospect_job_status"]
        }
        Insert: {
          attempts?: number
          company_id: string
          created_at?: string
          error?: string | null
          fields_found?: Json
          finished_at?: string | null
          id?: string
          owner_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["prospect_job_status"]
        }
        Update: {
          attempts?: number
          company_id?: string
          created_at?: string
          error?: string | null
          fields_found?: Json
          finished_at?: string | null
          id?: string
          owner_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["prospect_job_status"]
        }
        Relationships: [
          {
            foreignKeyName: "prospect_enrichment_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospect_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_exports: {
        Row: {
          columns: string[]
          created_at: string
          file_url: string | null
          filters: Json
          format: string
          id: string
          owner_id: string
          rows_count: number
          status: string
        }
        Insert: {
          columns?: string[]
          created_at?: string
          file_url?: string | null
          filters?: Json
          format: string
          id?: string
          owner_id: string
          rows_count?: number
          status?: string
        }
        Update: {
          columns?: string[]
          created_at?: string
          file_url?: string | null
          filters?: Json
          format?: string
          id?: string
          owner_id?: string
          rows_count?: number
          status?: string
        }
        Relationships: []
      }
      prospect_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          level: string
          message: string | null
          metadata: Json
          owner_id: string
          source: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          level?: string
          message?: string | null
          metadata?: Json
          owner_id: string
          source: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          level?: string
          message?: string | null
          metadata?: Json
          owner_id?: string
          source?: string
        }
        Relationships: []
      }
      prospect_searches: {
        Row: {
          category: string | null
          city: string | null
          country: string | null
          created_at: string
          filters: Json
          id: string
          keywords: string | null
          last_run_at: string | null
          name: string
          owner_id: string
          results_count: number
          scheduled_cron: string | null
          segment: string | null
          state: string | null
          status: string
          target_count: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          filters?: Json
          id?: string
          keywords?: string | null
          last_run_at?: string | null
          name: string
          owner_id: string
          results_count?: number
          scheduled_cron?: string | null
          segment?: string | null
          state?: string | null
          status?: string
          target_count?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          filters?: Json
          id?: string
          keywords?: string | null
          last_run_at?: string | null
          name?: string
          owner_id?: string
          results_count?: number
          scheduled_cron?: string | null
          segment?: string | null
          state?: string | null
          status?: string
          target_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      prospect_sequence_runs: {
        Row: {
          cancelled_reason: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          current_step: number
          id: string
          next_run_at: string | null
          owner_id: string
          sequence_id: string
          status: string
        }
        Insert: {
          cancelled_reason?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          current_step?: number
          id?: string
          next_run_at?: string | null
          owner_id: string
          sequence_id: string
          status?: string
        }
        Update: {
          cancelled_reason?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          current_step?: number
          id?: string
          next_run_at?: string | null
          owner_id?: string
          sequence_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_sequence_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospect_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_sequence_runs_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "prospect_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_sequences: {
        Row: {
          active: boolean
          cancel_on_reply: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          steps: Json
          updated_at: string
        }
        Insert: {
          active?: boolean
          cancel_on_reply?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          steps?: Json
          updated_at?: string
        }
        Update: {
          active?: boolean
          cancel_on_reply?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          steps?: Json
          updated_at?: string
        }
        Relationships: []
      }
      prospect_settings: {
        Row: {
          autopilot_enabled: boolean
          created_at: string
          email_subject_template: string | null
          email_template: string | null
          enrichment_interval_min: number
          owner_id: string
          priority_regions: string[]
          required_fields: string[]
          score_weights: Json
          search_interval_min: number
          updated_at: string
          whatsapp_template: string | null
        }
        Insert: {
          autopilot_enabled?: boolean
          created_at?: string
          email_subject_template?: string | null
          email_template?: string | null
          enrichment_interval_min?: number
          owner_id: string
          priority_regions?: string[]
          required_fields?: string[]
          score_weights?: Json
          search_interval_min?: number
          updated_at?: string
          whatsapp_template?: string | null
        }
        Update: {
          autopilot_enabled?: boolean
          created_at?: string
          email_subject_template?: string | null
          email_template?: string | null
          enrichment_interval_min?: number
          owner_id?: string
          priority_regions?: string[]
          required_fields?: string[]
          score_weights?: Json
          search_interval_min?: number
          updated_at?: string
          whatsapp_template?: string | null
        }
        Relationships: []
      }
      prospect_timeline: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          event_type: string
          id: string
          owner_id: string
          payload: Json
          title: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          owner_id: string
          payload?: Json
          title: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          owner_id?: string
          payload?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_timeline_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospect_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_agent_settings: {
        Row: {
          business_hours_json: Json
          cart_url_template: string
          channel_ig_enabled: boolean
          channel_wa_enabled: boolean
          channel_web_enabled: boolean
          created_at: string
          greeting_ig: string
          greeting_wa: string
          greeting_web: string
          id: string
          offline_message: string
          site_url: string
          tone: string
          updated_at: string
        }
        Insert: {
          business_hours_json?: Json
          cart_url_template?: string
          channel_ig_enabled?: boolean
          channel_wa_enabled?: boolean
          channel_web_enabled?: boolean
          created_at?: string
          greeting_ig?: string
          greeting_wa?: string
          greeting_web?: string
          id?: string
          offline_message?: string
          site_url?: string
          tone?: string
          updated_at?: string
        }
        Update: {
          business_hours_json?: Json
          cart_url_template?: string
          channel_ig_enabled?: boolean
          channel_wa_enabled?: boolean
          channel_web_enabled?: boolean
          created_at?: string
          greeting_ig?: string
          greeting_wa?: string
          greeting_web?: string
          id?: string
          offline_message?: string
          site_url?: string
          tone?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales_cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          size: string | null
          unit_price: number
          wc_product_id: number | null
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: string
          product_id?: string | null
          product_name: string
          quantity?: number
          size?: string | null
          unit_price?: number
          wc_product_id?: number | null
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          size?: string | null
          unit_price?: number
          wc_product_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "sales_carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_carts: {
        Row: {
          checkout_url: string | null
          conversation_id: string
          created_at: string
          id: string
          status: string
          total_estimate: number
          updated_at: string
        }
        Insert: {
          checkout_url?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          status?: string
          total_estimate?: number
          updated_at?: string
        }
        Update: {
          checkout_url?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          status?: string
          total_estimate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_carts_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "sales_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_conversations: {
        Row: {
          channel: string
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          external_id: string
          id: string
          last_message_at: string
          status: string
          updated_at: string
        }
        Insert: {
          channel: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          external_id: string
          id?: string
          last_message_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          external_id?: string
          id?: string
          last_message_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales_kb_articles: {
        Row: {
          body_md: string
          created_at: string
          id: string
          is_active: boolean
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          body_md: string
          created_at?: string
          id?: string
          is_active?: boolean
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          body_md?: string
          created_at?: string
          id?: string
          is_active?: boolean
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          parts: Json
          role: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          parts: Json
          role: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          parts?: Json
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "sales_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_posts: {
        Row: {
          caption: string
          carousel_urls: string[]
          created_at: string
          error: string | null
          id: string
          ig_media_id: string | null
          ig_permalink: string | null
          image_url: string
          post_type: string
          product_id: string | null
          published_at: string | null
          scheduled_for: string | null
          source: string
          status: string
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          caption: string
          carousel_urls?: string[]
          created_at?: string
          error?: string | null
          id?: string
          ig_media_id?: string | null
          ig_permalink?: string | null
          image_url: string
          post_type?: string
          product_id?: string | null
          published_at?: string | null
          scheduled_for?: string | null
          source?: string
          status?: string
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string
          carousel_urls?: string[]
          created_at?: string
          error?: string | null
          id?: string
          ig_media_id?: string | null
          ig_permalink?: string | null
          image_url?: string
          post_type?: string
          product_id?: string | null
          published_at?: string | null
          scheduled_for?: string | null
          source?: string
          status?: string
          theme?: string | null
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      prospect_contact_channel:
        | "email"
        | "whatsapp"
        | "instagram"
        | "phone"
        | "website"
      prospect_job_status:
        | "pending"
        | "running"
        | "success"
        | "failed"
        | "not_found"
      prospect_lead_status:
        | "ativo"
        | "qualificado"
        | "desqualificado"
        | "em_contato"
        | "convertido"
        | "arquivado"
      prospect_pipeline_stage:
        | "novo"
        | "captado"
        | "enriquecido"
        | "contato_iniciado"
        | "resposta_recebida"
        | "reuniao"
        | "proposta"
        | "negociacao"
        | "cliente"
        | "perdido"
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
      prospect_contact_channel: [
        "email",
        "whatsapp",
        "instagram",
        "phone",
        "website",
      ],
      prospect_job_status: [
        "pending",
        "running",
        "success",
        "failed",
        "not_found",
      ],
      prospect_lead_status: [
        "ativo",
        "qualificado",
        "desqualificado",
        "em_contato",
        "convertido",
        "arquivado",
      ],
      prospect_pipeline_stage: [
        "novo",
        "captado",
        "enriquecido",
        "contato_iniciado",
        "resposta_recebida",
        "reuniao",
        "proposta",
        "negociacao",
        "cliente",
        "perdido",
      ],
    },
  },
} as const
