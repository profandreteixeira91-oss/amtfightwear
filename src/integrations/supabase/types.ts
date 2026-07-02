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
      email_sequence_runs: {
        Row: {
          created_at: string
          current_step: number
          id: string
          last_step_sent_at: string | null
          lead_id: string
          next_send_at: string | null
          sequence_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_step?: number
          id?: string
          last_step_sent_at?: string | null
          lead_id: string
          next_send_at?: string | null
          sequence_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_step?: number
          id?: string
          last_step_sent_at?: string | null
          lead_id?: string
          next_send_at?: string | null
          sequence_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sequence_runs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sequence_runs_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequences: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          steps: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          steps?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          steps?: Json
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
          {
            foreignKeyName: "ig_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
          {
            foreignKeyName: "ig_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
      lead_enrichments: {
        Row: {
          created_at: string
          field: string
          id: string
          lead_id: string
          new_value: string | null
          old_value: string | null
          source: string | null
        }
        Insert: {
          created_at?: string
          field: string
          id?: string
          lead_id: string
          new_value?: string | null
          old_value?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string
          field?: string
          id?: string
          lead_id?: string
          new_value?: string | null
          old_value?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_enrichments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_exports: {
        Row: {
          count: number | null
          created_at: string
          file_url: string | null
          filters: Json | null
          format: string
          id: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          count?: number | null
          created_at?: string
          file_url?: string | null
          filters?: Json | null
          format: string
          id?: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          count?: number | null
          created_at?: string
          file_url?: string | null
          filters?: Json | null
          format?: string
          id?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      lead_history: {
        Row: {
          action: string
          actor_id: string | null
          changes: Json | null
          created_at: string
          id: string
          lead_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          changes?: Json | null
          created_at?: string
          id?: string
          lead_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          changes?: Json | null
          created_at?: string
          id?: string
          lead_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          address: string | null
          ai_approach: string | null
          ai_best_hour: string | null
          ai_opportunities: string | null
          ai_recommended_channel: string | null
          ai_score: number | null
          ai_summary: string | null
          business_hours: Json | null
          category: string | null
          city: string | null
          cnpj: string | null
          created_at: string
          created_by: string | null
          data_source: string | null
          description: string | null
          email: string | null
          enriched_at: string | null
          enrichment_status: string | null
          facebook: string | null
          id: string
          ig_conversation_id: string | null
          instagram_avatar_url: string | null
          instagram_bio: string | null
          instagram_followers: number | null
          instagram_handle: string | null
          instagram_is_business: boolean | null
          instagram_url: string | null
          instagram_verified: boolean | null
          last_contact_at: string | null
          last_response_at: string | null
          lat: number | null
          lead_type: string | null
          legal_name: string | null
          linkedin: string | null
          lng: number | null
          modality: string | null
          name: string
          notes: string | null
          owner_id: string | null
          phone: string | null
          pipeline_stage: string
          quality_flag: string | null
          rating: number | null
          responsible: string | null
          reviews_count: number | null
          source: string | null
          state: string | null
          status: string
          tags: string[] | null
          technologies: string[] | null
          trade_name: string | null
          updated_at: string
          website: string | null
          website_title: string | null
          whatsapp: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          ai_approach?: string | null
          ai_best_hour?: string | null
          ai_opportunities?: string | null
          ai_recommended_channel?: string | null
          ai_score?: number | null
          ai_summary?: string | null
          business_hours?: Json | null
          category?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          data_source?: string | null
          description?: string | null
          email?: string | null
          enriched_at?: string | null
          enrichment_status?: string | null
          facebook?: string | null
          id?: string
          ig_conversation_id?: string | null
          instagram_avatar_url?: string | null
          instagram_bio?: string | null
          instagram_followers?: number | null
          instagram_handle?: string | null
          instagram_is_business?: boolean | null
          instagram_url?: string | null
          instagram_verified?: boolean | null
          last_contact_at?: string | null
          last_response_at?: string | null
          lat?: number | null
          lead_type?: string | null
          legal_name?: string | null
          linkedin?: string | null
          lng?: number | null
          modality?: string | null
          name: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          pipeline_stage?: string
          quality_flag?: string | null
          rating?: number | null
          responsible?: string | null
          reviews_count?: number | null
          source?: string | null
          state?: string | null
          status?: string
          tags?: string[] | null
          technologies?: string[] | null
          trade_name?: string | null
          updated_at?: string
          website?: string | null
          website_title?: string | null
          whatsapp?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          ai_approach?: string | null
          ai_best_hour?: string | null
          ai_opportunities?: string | null
          ai_recommended_channel?: string | null
          ai_score?: number | null
          ai_summary?: string | null
          business_hours?: Json | null
          category?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          data_source?: string | null
          description?: string | null
          email?: string | null
          enriched_at?: string | null
          enrichment_status?: string | null
          facebook?: string | null
          id?: string
          ig_conversation_id?: string | null
          instagram_avatar_url?: string | null
          instagram_bio?: string | null
          instagram_followers?: number | null
          instagram_handle?: string | null
          instagram_is_business?: boolean | null
          instagram_url?: string | null
          instagram_verified?: boolean | null
          last_contact_at?: string | null
          last_response_at?: string | null
          lat?: number | null
          lead_type?: string | null
          legal_name?: string | null
          linkedin?: string | null
          lng?: number | null
          modality?: string | null
          name?: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          pipeline_stage?: string
          quality_flag?: string | null
          rating?: number | null
          responsible?: string | null
          reviews_count?: number | null
          source?: string | null
          state?: string | null
          status?: string
          tags?: string[] | null
          technologies?: string[] | null
          trade_name?: string | null
          updated_at?: string
          website?: string | null
          website_title?: string | null
          whatsapp?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_ig_conversation_id_fkey"
            columns: ["ig_conversation_id"]
            isOneToOne: false
            referencedRelation: "ig_conversations"
            referencedColumns: ["id"]
          },
        ]
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
      outreach_log: {
        Row: {
          body: string | null
          channel: string
          created_at: string
          error: string | null
          id: string
          lead_id: string
          sent_at: string
          status: string
          subject: string | null
        }
        Insert: {
          body?: string | null
          channel: string
          created_at?: string
          error?: string | null
          id?: string
          lead_id: string
          sent_at?: string
          status?: string
          subject?: string | null
        }
        Update: {
          body?: string | null
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          lead_id?: string
          sent_at?: string
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_settings: {
        Row: {
          created_at: string
          daily_email_cap: number
          daily_instagram_cap: number
          enabled: boolean
          from_email: string | null
          from_name: string
          id: string
          priority_region: string
          site_url: string
          tone: string
          updated_at: string
          weekly_cooldown_days: number
        }
        Insert: {
          created_at?: string
          daily_email_cap?: number
          daily_instagram_cap?: number
          enabled?: boolean
          from_email?: string | null
          from_name?: string
          id?: string
          priority_region?: string
          site_url?: string
          tone?: string
          updated_at?: string
          weekly_cooldown_days?: number
        }
        Update: {
          created_at?: string
          daily_email_cap?: number
          daily_instagram_cap?: number
          enabled?: boolean
          from_email?: string | null
          from_name?: string
          id?: string
          priority_region?: string
          site_url?: string
          tone?: string
          updated_at?: string
          weekly_cooldown_days?: number
        }
        Relationships: []
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
      scrape_runs: {
        Row: {
          city: string | null
          created_at: string
          duration_ms: number | null
          error: string | null
          found: number | null
          id: string
          inserted: number | null
          query: string | null
          state: string | null
          status: string
          theme: string | null
          triggered_by: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          found?: number | null
          id?: string
          inserted?: number | null
          query?: string | null
          state?: string | null
          status?: string
          theme?: string | null
          triggered_by?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          found?: number | null
          id?: string
          inserted?: number | null
          query?: string | null
          state?: string | null
          status?: string
          theme?: string | null
          triggered_by?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      scraper_automations: {
        Row: {
          active: boolean | null
          created_at: string
          id: string
          kind: string
          last_run_at: string | null
          name: string
          params: Json | null
          schedule_cron: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          id?: string
          kind: string
          last_run_at?: string | null
          name: string
          params?: Json | null
          schedule_cron: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string
          id?: string
          kind?: string
          last_run_at?: string | null
          name?: string
          params?: Json | null
          schedule_cron?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      scraper_logs: {
        Row: {
          created_at: string
          id: string
          kind: string
          message: string | null
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          message?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          message?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      scraper_settings: {
        Row: {
          auto_enrich: boolean | null
          auto_score: boolean | null
          created_at: string
          credits_available: number | null
          credits_used: number | null
          interval_ms: number | null
          max_concurrency: number | null
          max_results_per_search: number | null
          timeout_ms: number | null
          updated_at: string
          user_id: string
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          auto_enrich?: boolean | null
          auto_score?: boolean | null
          created_at?: string
          credits_available?: number | null
          credits_used?: number | null
          interval_ms?: number | null
          max_concurrency?: number | null
          max_results_per_search?: number | null
          timeout_ms?: number | null
          updated_at?: string
          user_id: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          auto_enrich?: boolean | null
          auto_score?: boolean | null
          created_at?: string
          credits_available?: number | null
          credits_used?: number | null
          interval_ms?: number | null
          max_concurrency?: number | null
          max_results_per_search?: number | null
          timeout_ms?: number | null
          updated_at?: string
          user_id?: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: []
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
