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
      ads_ab_tests: {
        Row: {
          campaign_id: string
          created_at: string
          ended_at: string | null
          hypothesis: string | null
          id: string
          metric: string
          name: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
          winner_variant_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          ended_at?: string | null
          hypothesis?: string | null
          id?: string
          metric?: string
          name: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          winner_variant_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          ended_at?: string | null
          hypothesis?: string | null
          id?: string
          metric?: string
          name?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          winner_variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_ab_tests_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ads_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ads_ab_variants: {
        Row: {
          clicks: number | null
          conversions: number | null
          copy_id: string | null
          cpa: number | null
          created_at: string
          creative_id: string | null
          ctr: number | null
          id: string
          impressions: number | null
          is_control: boolean
          meta_ad_id: string | null
          meta_creative_id: string | null
          name: string
          revenue: number | null
          roas: number | null
          spend: number | null
          test_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clicks?: number | null
          conversions?: number | null
          copy_id?: string | null
          cpa?: number | null
          created_at?: string
          creative_id?: string | null
          ctr?: number | null
          id?: string
          impressions?: number | null
          is_control?: boolean
          meta_ad_id?: string | null
          meta_creative_id?: string | null
          name: string
          revenue?: number | null
          roas?: number | null
          spend?: number | null
          test_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clicks?: number | null
          conversions?: number | null
          copy_id?: string | null
          cpa?: number | null
          created_at?: string
          creative_id?: string | null
          ctr?: number | null
          id?: string
          impressions?: number | null
          is_control?: boolean
          meta_ad_id?: string | null
          meta_creative_id?: string | null
          name?: string
          revenue?: number | null
          roas?: number | null
          spend?: number | null
          test_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_ab_variants_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "ads_ab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      ads_accounts: {
        Row: {
          act_id: string
          business_id: string | null
          capabilities: Json | null
          created_at: string
          currency: string | null
          id: string
          meta_connection_id: string | null
          name: string
          pixel_id: string | null
          pixel_status: string | null
          status: string
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          act_id: string
          business_id?: string | null
          capabilities?: Json | null
          created_at?: string
          currency?: string | null
          id?: string
          meta_connection_id?: string | null
          name: string
          pixel_id?: string | null
          pixel_status?: string | null
          status?: string
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          act_id?: string
          business_id?: string | null
          capabilities?: Json | null
          created_at?: string
          currency?: string | null
          id?: string
          meta_connection_id?: string | null
          name?: string
          pixel_id?: string | null
          pixel_status?: string | null
          status?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_accounts_meta_connection_id_fkey"
            columns: ["meta_connection_id"]
            isOneToOne: false
            referencedRelation: "meta_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      ads_alerts: {
        Row: {
          campaign_id: string | null
          created_at: string
          id: string
          message: string | null
          metric: Json | null
          read_at: string | null
          severity: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          metric?: Json | null
          read_at?: string | null
          severity?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          metric?: Json | null
          read_at?: string | null
          severity?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_alerts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ads_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ads_briefings: {
        Row: {
          age_range: string | null
          audiences: Json | null
          brand_tone: string | null
          budget_daily: number | null
          budget_estimate: Json | null
          budget_total: number | null
          competitors: string | null
          created_at: string
          deadline: string | null
          gender: string | null
          id: string
          interests: string[] | null
          margin: number | null
          objective: string
          offer: string | null
          price: number | null
          product_id: string | null
          product_name: string
          region: string | null
          revenue_goal: number | null
          strategy: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age_range?: string | null
          audiences?: Json | null
          brand_tone?: string | null
          budget_daily?: number | null
          budget_estimate?: Json | null
          budget_total?: number | null
          competitors?: string | null
          created_at?: string
          deadline?: string | null
          gender?: string | null
          id?: string
          interests?: string[] | null
          margin?: number | null
          objective: string
          offer?: string | null
          price?: number | null
          product_id?: string | null
          product_name: string
          region?: string | null
          revenue_goal?: number | null
          strategy?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age_range?: string | null
          audiences?: Json | null
          brand_tone?: string | null
          budget_daily?: number | null
          budget_estimate?: Json | null
          budget_total?: number | null
          competitors?: string | null
          created_at?: string
          deadline?: string | null
          gender?: string | null
          id?: string
          interests?: string[] | null
          margin?: number | null
          objective?: string
          offer?: string | null
          price?: number | null
          product_id?: string | null
          product_name?: string
          region?: string | null
          revenue_goal?: number | null
          strategy?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ads_campaigns: {
        Row: {
          ads_account_id: string | null
          briefing_id: string | null
          budget_daily: number | null
          budget_total: number | null
          created_at: string
          end_at: string | null
          id: string
          last_error: string | null
          last_sync_at: string | null
          meta_ad_id: string | null
          meta_adset_id: string | null
          meta_campaign_id: string | null
          meta_creative_id: string | null
          name: string
          objective: string
          published_at: string | null
          start_at: string | null
          status: string
          strategy: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ads_account_id?: string | null
          briefing_id?: string | null
          budget_daily?: number | null
          budget_total?: number | null
          created_at?: string
          end_at?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          meta_ad_id?: string | null
          meta_adset_id?: string | null
          meta_campaign_id?: string | null
          meta_creative_id?: string | null
          name: string
          objective: string
          published_at?: string | null
          start_at?: string | null
          status?: string
          strategy?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ads_account_id?: string | null
          briefing_id?: string | null
          budget_daily?: number | null
          budget_total?: number | null
          created_at?: string
          end_at?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          meta_ad_id?: string | null
          meta_adset_id?: string | null
          meta_campaign_id?: string | null
          meta_creative_id?: string | null
          name?: string
          objective?: string
          published_at?: string | null
          start_at?: string | null
          status?: string
          strategy?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_campaigns_ads_account_id_fkey"
            columns: ["ads_account_id"]
            isOneToOne: false
            referencedRelation: "ads_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_campaigns_briefing_id_fkey"
            columns: ["briefing_id"]
            isOneToOne: false
            referencedRelation: "ads_briefings"
            referencedColumns: ["id"]
          },
        ]
      }
      ads_copies: {
        Row: {
          briefing_id: string | null
          campaign_id: string | null
          click_potential: string | null
          conversion_potential: string | null
          created_at: string
          cta: string | null
          description: string | null
          hashtags: string[] | null
          headline: string
          id: string
          is_favorite: boolean
          is_winner: boolean | null
          primary_text: string
          quality_score: number | null
          tags: string[] | null
          triggers: string[] | null
          updated_at: string
          user_id: string
          winner_score: number | null
        }
        Insert: {
          briefing_id?: string | null
          campaign_id?: string | null
          click_potential?: string | null
          conversion_potential?: string | null
          created_at?: string
          cta?: string | null
          description?: string | null
          hashtags?: string[] | null
          headline: string
          id?: string
          is_favorite?: boolean
          is_winner?: boolean | null
          primary_text: string
          quality_score?: number | null
          tags?: string[] | null
          triggers?: string[] | null
          updated_at?: string
          user_id: string
          winner_score?: number | null
        }
        Update: {
          briefing_id?: string | null
          campaign_id?: string | null
          click_potential?: string | null
          conversion_potential?: string | null
          created_at?: string
          cta?: string | null
          description?: string | null
          hashtags?: string[] | null
          headline?: string
          id?: string
          is_favorite?: boolean
          is_winner?: boolean | null
          primary_text?: string
          quality_score?: number | null
          tags?: string[] | null
          triggers?: string[] | null
          updated_at?: string
          user_id?: string
          winner_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_copies_briefing_id_fkey"
            columns: ["briefing_id"]
            isOneToOne: false
            referencedRelation: "ads_briefings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_copies_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ads_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ads_creative_embeddings: {
        Row: {
          campaign_id: string | null
          content: string
          copy_id: string | null
          cpa: number | null
          created_at: string
          creative_id: string | null
          ctr: number | null
          embedding: string
          id: string
          metadata: Json
          performance_score: number
          roas: number | null
          spend: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          content: string
          copy_id?: string | null
          cpa?: number | null
          created_at?: string
          creative_id?: string | null
          ctr?: number | null
          embedding: string
          id?: string
          metadata?: Json
          performance_score?: number
          roas?: number | null
          spend?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          content?: string
          copy_id?: string | null
          cpa?: number | null
          created_at?: string
          creative_id?: string | null
          ctr?: number | null
          embedding?: string
          id?: string
          metadata?: Json
          performance_score?: number
          roas?: number | null
          spend?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_creative_embeddings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ads_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_creative_embeddings_copy_id_fkey"
            columns: ["copy_id"]
            isOneToOne: false
            referencedRelation: "ads_copies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_creative_embeddings_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "ads_creatives"
            referencedColumns: ["id"]
          },
        ]
      }
      ads_creatives: {
        Row: {
          aspect: string | null
          brief: Json | null
          briefing_id: string | null
          campaign_id: string | null
          copy_id: string | null
          created_at: string
          format: string
          id: string
          image_url: string | null
          is_favorite: boolean
          is_winner: boolean | null
          palette: string[] | null
          prompt: string | null
          score: number | null
          storage_path: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
          winner_score: number | null
        }
        Insert: {
          aspect?: string | null
          brief?: Json | null
          briefing_id?: string | null
          campaign_id?: string | null
          copy_id?: string | null
          created_at?: string
          format: string
          id?: string
          image_url?: string | null
          is_favorite?: boolean
          is_winner?: boolean | null
          palette?: string[] | null
          prompt?: string | null
          score?: number | null
          storage_path?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
          winner_score?: number | null
        }
        Update: {
          aspect?: string | null
          brief?: Json | null
          briefing_id?: string | null
          campaign_id?: string | null
          copy_id?: string | null
          created_at?: string
          format?: string
          id?: string
          image_url?: string | null
          is_favorite?: boolean
          is_winner?: boolean | null
          palette?: string[] | null
          prompt?: string | null
          score?: number | null
          storage_path?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          winner_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_creatives_briefing_id_fkey"
            columns: ["briefing_id"]
            isOneToOne: false
            referencedRelation: "ads_briefings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_creatives_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ads_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_creatives_copy_id_fkey"
            columns: ["copy_id"]
            isOneToOne: false
            referencedRelation: "ads_copies"
            referencedColumns: ["id"]
          },
        ]
      }
      ads_insights: {
        Row: {
          campaign_id: string | null
          clicks: number | null
          conversions: number | null
          cpa: number | null
          cpc: number | null
          cpm: number | null
          created_at: string
          ctr: number | null
          date: string
          id: string
          impressions: number | null
          revenue: number | null
          roas: number | null
          spend: number | null
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          clicks?: number | null
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          date: string
          id?: string
          impressions?: number | null
          revenue?: number | null
          roas?: number | null
          spend?: number | null
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          clicks?: number | null
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          date?: string
          id?: string
          impressions?: number | null
          revenue?: number | null
          roas?: number | null
          spend?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_insights_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ads_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ads_optimizations: {
        Row: {
          applied_at: string | null
          campaign_id: string | null
          created_at: string
          id: string
          reason: string | null
          severity: string | null
          status: string
          suggestion: Json | null
          title: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          campaign_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          severity?: string | null
          status?: string
          suggestion?: Json | null
          title?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string | null
          campaign_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          severity?: string | null
          status?: string
          suggestion?: Json | null
          title?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_optimizations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ads_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ads_scale_history: {
        Row: {
          action: string
          auto_applied: boolean
          campaign_id: string
          cpa_at_action: number | null
          created_at: string
          ctr_at_action: number | null
          id: string
          meta_response: Json | null
          new_budget: number | null
          previous_budget: number | null
          reason: string | null
          roas_at_action: number | null
          scale_pct: number | null
          user_id: string
        }
        Insert: {
          action: string
          auto_applied?: boolean
          campaign_id: string
          cpa_at_action?: number | null
          created_at?: string
          ctr_at_action?: number | null
          id?: string
          meta_response?: Json | null
          new_budget?: number | null
          previous_budget?: number | null
          reason?: string | null
          roas_at_action?: number | null
          scale_pct?: number | null
          user_id: string
        }
        Update: {
          action?: string
          auto_applied?: boolean
          campaign_id?: string
          cpa_at_action?: number | null
          created_at?: string
          ctr_at_action?: number | null
          id?: string
          meta_response?: Json | null
          new_budget?: number | null
          previous_budget?: number | null
          reason?: string | null
          roas_at_action?: number | null
          scale_pct?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_scale_history_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ads_campaigns"
            referencedColumns: ["id"]
          },
        ]
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
      custom_shop_fabrics: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          price_delta: number
          sort_order: number
          template_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price_delta?: number
          sort_order?: number
          template_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price_delta?: number
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_shop_fabrics_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "custom_shop_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_shop_patch_slots: {
        Row: {
          created_at: string
          h_pct: number | null
          id: string
          key: string
          label: string
          rotation_deg: number
          sort_order: number
          template_id: string
          variant_key: string
          w_pct: number
          x_pct: number
          y_pct: number
        }
        Insert: {
          created_at?: string
          h_pct?: number | null
          id?: string
          key: string
          label: string
          rotation_deg?: number
          sort_order?: number
          template_id: string
          variant_key?: string
          w_pct?: number
          x_pct: number
          y_pct: number
        }
        Update: {
          created_at?: string
          h_pct?: number | null
          id?: string
          key?: string
          label?: string
          rotation_deg?: number
          sort_order?: number
          template_id?: string
          variant_key?: string
          w_pct?: number
          x_pct?: number
          y_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "custom_shop_patch_slots_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "custom_shop_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_shop_patches: {
        Row: {
          active: boolean
          created_at: string
          id: string
          image_url: string
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          image_url: string
          name: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          image_url?: string
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      custom_shop_templates: {
        Row: {
          active: boolean
          base_image_url: string | null
          base_price: number
          created_at: string
          description: string | null
          id: string
          kind: string
          name: string
          preview_ratio: number
          production_days: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_image_url?: string | null
          base_price?: number
          created_at?: string
          description?: string | null
          id?: string
          kind: string
          name: string
          preview_ratio?: number
          production_days?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_image_url?: string | null
          base_price?: number
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          name?: string
          preview_ratio?: number
          production_days?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      custom_shop_variants: {
        Row: {
          base_image_url: string | null
          created_at: string
          id: string
          key: string
          label: string
          sort_order: number
          template_id: string
        }
        Insert: {
          base_image_url?: string | null
          created_at?: string
          id?: string
          key: string
          label: string
          sort_order?: number
          template_id: string
        }
        Update: {
          base_image_url?: string | null
          created_at?: string
          id?: string
          key?: string
          label?: string
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_shop_variants_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "custom_shop_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_shop_zones: {
        Row: {
          created_at: string
          default_hex: string
          h_pct: number
          id: string
          key: string
          label: string
          mask_image_url: string | null
          rotation_deg: number
          solid: boolean
          sort_order: number
          template_id: string
          variant_key: string
          w_pct: number
          x_pct: number
          y_pct: number
        }
        Insert: {
          created_at?: string
          default_hex?: string
          h_pct?: number
          id?: string
          key: string
          label: string
          mask_image_url?: string | null
          rotation_deg?: number
          solid?: boolean
          sort_order?: number
          template_id: string
          variant_key?: string
          w_pct?: number
          x_pct?: number
          y_pct?: number
        }
        Update: {
          created_at?: string
          default_hex?: string
          h_pct?: number
          id?: string
          key?: string
          label?: string
          mask_image_url?: string | null
          rotation_deg?: number
          solid?: boolean
          sort_order?: number
          template_id?: string
          variant_key?: string
          w_pct?: number
          x_pct?: number
          y_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "custom_shop_zones_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "custom_shop_templates"
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
      dojo_academy_profile: {
        Row: {
          address: string | null
          brand_primary: string | null
          brand_secondary: string | null
          city: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          facebook: string | null
          instagram: string | null
          legal_name: string | null
          logo_as_default: boolean | null
          logo_placements: Json | null
          logo_url: string | null
          modalities: string[] | null
          owner_id: string
          phone: string | null
          seal_url: string | null
          signature_url: string | null
          stamp_url: string | null
          state: string | null
          trade_name: string | null
          updated_at: string
          website: string | null
          whatsapp: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          brand_primary?: string | null
          brand_secondary?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          facebook?: string | null
          instagram?: string | null
          legal_name?: string | null
          logo_as_default?: boolean | null
          logo_placements?: Json | null
          logo_url?: string | null
          modalities?: string[] | null
          owner_id: string
          phone?: string | null
          seal_url?: string | null
          signature_url?: string | null
          stamp_url?: string | null
          state?: string | null
          trade_name?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          brand_primary?: string | null
          brand_secondary?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          facebook?: string | null
          instagram?: string | null
          legal_name?: string | null
          logo_as_default?: boolean | null
          logo_placements?: Json | null
          logo_url?: string | null
          modalities?: string[] | null
          owner_id?: string
          phone?: string | null
          seal_url?: string | null
          signature_url?: string | null
          stamp_url?: string | null
          state?: string | null
          trade_name?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      dojo_account_audit: {
        Row: {
          action: string
          created_at: string
          id: string
          meta: Json | null
          owner_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          meta?: Json | null
          owner_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          meta?: Json | null
          owner_id?: string
        }
        Relationships: []
      }
      dojo_account_notifications: {
        Row: {
          created_at: string
          email_enabled: boolean
          finance_alerts: boolean
          owner_id: string
          product_news: boolean
          reminders: boolean
          system_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          finance_alerts?: boolean
          owner_id: string
          product_news?: boolean
          reminders?: boolean
          system_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          finance_alerts?: boolean
          owner_id?: string
          product_news?: boolean
          reminders?: boolean
          system_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      dojo_attendance: {
        Row: {
          checked_in_at: string
          checked_out_at: string | null
          class_id: string | null
          created_at: string
          created_by: string | null
          device: string | null
          external_user: string | null
          id: string
          ip_address: string | null
          method: string
          notes: string | null
          owner_id: string
          source: string | null
          status: string
          student_id: string | null
          unit_id: string | null
          visitor_name: string | null
          visitor_origin: string | null
          visitor_phone: string | null
        }
        Insert: {
          checked_in_at?: string
          checked_out_at?: string | null
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          device?: string | null
          external_user?: string | null
          id?: string
          ip_address?: string | null
          method?: string
          notes?: string | null
          owner_id: string
          source?: string | null
          status?: string
          student_id?: string | null
          unit_id?: string | null
          visitor_name?: string | null
          visitor_origin?: string | null
          visitor_phone?: string | null
        }
        Update: {
          checked_in_at?: string
          checked_out_at?: string | null
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          device?: string | null
          external_user?: string | null
          id?: string
          ip_address?: string | null
          method?: string
          notes?: string | null
          owner_id?: string
          source?: string | null
          status?: string
          student_id?: string | null
          unit_id?: string | null
          visitor_name?: string | null
          visitor_origin?: string | null
          visitor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dojo_attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "dojo_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_attendance_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "dojo_units"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_belts: {
        Row: {
          category: string
          color_hex: string
          created_at: string
          id: string
          max_degrees: number
          name: string
          owner_id: string
          sort_order: number
          stripe_hex: string | null
        }
        Insert: {
          category?: string
          color_hex?: string
          created_at?: string
          id?: string
          max_degrees?: number
          name: string
          owner_id: string
          sort_order: number
          stripe_hex?: string | null
        }
        Update: {
          category?: string
          color_hex?: string
          created_at?: string
          id?: string
          max_degrees?: number
          name?: string
          owner_id?: string
          sort_order?: number
          stripe_hex?: string | null
        }
        Relationships: []
      }
      dojo_certificate_templates: {
        Row: {
          active: boolean
          background_url: string
          category: string | null
          created_at: string
          fields: Json
          height: number
          id: string
          is_default: boolean | null
          name: string
          owner_id: string
          updated_at: string
          variables: Json | null
          width: number
        }
        Insert: {
          active?: boolean
          background_url: string
          category?: string | null
          created_at?: string
          fields?: Json
          height?: number
          id?: string
          is_default?: boolean | null
          name: string
          owner_id: string
          updated_at?: string
          variables?: Json | null
          width?: number
        }
        Update: {
          active?: boolean
          background_url?: string
          category?: string | null
          created_at?: string
          fields?: Json
          height?: number
          id?: string
          is_default?: boolean | null
          name?: string
          owner_id?: string
          updated_at?: string
          variables?: Json | null
          width?: number
        }
        Relationships: []
      }
      dojo_certificates: {
        Row: {
          created_at: string
          graduation_id: string | null
          id: string
          issued_at: string
          owner_id: string
          pdf_url: string | null
          public_hash: string
          student_id: string
          template_id: string | null
          values: Json
        }
        Insert: {
          created_at?: string
          graduation_id?: string | null
          id?: string
          issued_at?: string
          owner_id: string
          pdf_url?: string | null
          public_hash?: string
          student_id: string
          template_id?: string | null
          values?: Json
        }
        Update: {
          created_at?: string
          graduation_id?: string | null
          id?: string
          issued_at?: string
          owner_id?: string
          pdf_url?: string | null
          public_hash?: string
          student_id?: string
          template_id?: string | null
          values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "dojo_certificates_graduation_id_fkey"
            columns: ["graduation_id"]
            isOneToOne: false
            referencedRelation: "dojo_graduations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_certificates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_certificates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "dojo_certificate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_checkin_settings: {
        Row: {
          allow_multiple_daily: boolean
          block_on_overdue: boolean
          created_at: string
          extras: Json
          kiosk_pin: string | null
          min_interval_minutes: number
          owner_id: string
          require_checkout: boolean
          require_partner_validation: boolean
          updated_at: string
          warn_on_medical: boolean
          warn_on_overdue: boolean
          welcome_message: string | null
        }
        Insert: {
          allow_multiple_daily?: boolean
          block_on_overdue?: boolean
          created_at?: string
          extras?: Json
          kiosk_pin?: string | null
          min_interval_minutes?: number
          owner_id: string
          require_checkout?: boolean
          require_partner_validation?: boolean
          updated_at?: string
          warn_on_medical?: boolean
          warn_on_overdue?: boolean
          welcome_message?: string | null
        }
        Update: {
          allow_multiple_daily?: boolean
          block_on_overdue?: boolean
          created_at?: string
          extras?: Json
          kiosk_pin?: string | null
          min_interval_minutes?: number
          owner_id?: string
          require_checkout?: boolean
          require_partner_validation?: boolean
          updated_at?: string
          warn_on_medical?: boolean
          warn_on_overdue?: boolean
          welcome_message?: string | null
        }
        Relationships: []
      }
      dojo_class_occurrences: {
        Row: {
          cancel_reason: string | null
          class_id: string
          created_at: string
          end_time: string | null
          id: string
          notes: string | null
          occurrence_date: string
          owner_id: string
          schedule_id: string | null
          start_time: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cancel_reason?: string | null
          class_id: string
          created_at?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          occurrence_date: string
          owner_id: string
          schedule_id?: string | null
          start_time?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cancel_reason?: string | null
          class_id?: string
          created_at?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          occurrence_date?: string
          owner_id?: string
          schedule_id?: string | null
          start_time?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_class_occurrences_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "dojo_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_class_occurrences_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "dojo_class_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_class_schedules: {
        Row: {
          class_id: string
          created_at: string
          end_time: string
          id: string
          owner_id: string
          start_time: string
          weekday: number
        }
        Insert: {
          class_id: string
          created_at?: string
          end_time: string
          id?: string
          owner_id: string
          start_time: string
          weekday: number
        }
        Update: {
          class_id?: string
          created_at?: string
          end_time?: string
          id?: string
          owner_id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "dojo_class_schedules_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "dojo_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_class_students: {
        Row: {
          class_id: string
          enrolled_at: string
          id: string
          owner_id: string
          status: string
          student_id: string
        }
        Insert: {
          class_id: string
          enrolled_at?: string
          id?: string
          owner_id: string
          status?: string
          student_id: string
        }
        Update: {
          class_id?: string
          enrolled_at?: string
          id?: string
          owner_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "dojo_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_class_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_classes: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          level: string
          max_students: number
          modality: string
          name: string
          notes: string | null
          owner_id: string
          space_id: string | null
          status: string
          teacher_id: string | null
          teacher_name: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          level?: string
          max_students?: number
          modality?: string
          name: string
          notes?: string | null
          owner_id: string
          space_id?: string | null
          status?: string
          teacher_id?: string | null
          teacher_name?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          level?: string
          max_students?: number
          modality?: string
          name?: string
          notes?: string | null
          owner_id?: string
          space_id?: string | null
          status?: string
          teacher_id?: string | null
          teacher_name?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_classes_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "dojo_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_classes_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "dojo_units"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_competition_athletes: {
        Row: {
          age_group: string | null
          belt: string | null
          category: string | null
          competition_id: string
          created_at: string
          id: string
          notes: string | null
          owner_id: string
          registered_at: string
          registered_by: string | null
          status: Database["public"]["Enums"]["competition_athlete_status"]
          student_id: string
          updated_at: string
          weight: number | null
        }
        Insert: {
          age_group?: string | null
          belt?: string | null
          category?: string | null
          competition_id: string
          created_at?: string
          id?: string
          notes?: string | null
          owner_id: string
          registered_at?: string
          registered_by?: string | null
          status?: Database["public"]["Enums"]["competition_athlete_status"]
          student_id: string
          updated_at?: string
          weight?: number | null
        }
        Update: {
          age_group?: string | null
          belt?: string | null
          category?: string | null
          competition_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          owner_id?: string
          registered_at?: string
          registered_by?: string | null
          status?: Database["public"]["Enums"]["competition_athlete_status"]
          student_id?: string
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dojo_competition_athletes_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "dojo_competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_competition_athletes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_competition_attachments: {
        Row: {
          competition_id: string
          created_at: string
          id: string
          kind: string | null
          name: string
          owner_id: string
          url: string
        }
        Insert: {
          competition_id: string
          created_at?: string
          id?: string
          kind?: string | null
          name: string
          owner_id: string
          url: string
        }
        Update: {
          competition_id?: string
          created_at?: string
          id?: string
          kind?: string | null
          name?: string
          owner_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_competition_attachments_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "dojo_competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_competition_medals: {
        Row: {
          athlete_id: string
          category: string | null
          competition_id: string
          created_at: string
          id: string
          medal: string
          owner_id: string
        }
        Insert: {
          athlete_id: string
          category?: string | null
          competition_id: string
          created_at?: string
          id?: string
          medal: string
          owner_id: string
        }
        Update: {
          athlete_id?: string
          category?: string | null
          competition_id?: string
          created_at?: string
          id?: string
          medal?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_competition_medals_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "dojo_competition_athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_competition_medals_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "dojo_competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_competition_results: {
        Row: {
          athlete_id: string
          competition_id: string
          created_at: string
          id: string
          matches_lost: number | null
          matches_won: number | null
          notes: string | null
          owner_id: string
          placement: number | null
          updated_at: string
        }
        Insert: {
          athlete_id: string
          competition_id: string
          created_at?: string
          id?: string
          matches_lost?: number | null
          matches_won?: number | null
          notes?: string | null
          owner_id: string
          placement?: number | null
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          competition_id?: string
          created_at?: string
          id?: string
          matches_lost?: number | null
          matches_won?: number | null
          notes?: string | null
          owner_id?: string
          placement?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_competition_results_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "dojo_competition_athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_competition_results_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "dojo_competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_competitions: {
        Row: {
          address: string | null
          age_groups: Json
          banner_url: string | null
          belts: Json
          categories: Json
          city: string | null
          country: string | null
          created_at: string
          currency: string | null
          description: string | null
          ends_at: string | null
          entry_fee: number | null
          external_id: string | null
          external_url: string | null
          id: string
          modality: string | null
          name: string
          organizer: string | null
          owner_id: string
          provider: Database["public"]["Enums"]["competition_provider"]
          registration_deadline: string | null
          source_data: Json
          starts_at: string | null
          state: string | null
          status: string
          updated_at: string
          venue_name: string | null
          with_gi: boolean | null
        }
        Insert: {
          address?: string | null
          age_groups?: Json
          banner_url?: string | null
          belts?: Json
          categories?: Json
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          ends_at?: string | null
          entry_fee?: number | null
          external_id?: string | null
          external_url?: string | null
          id?: string
          modality?: string | null
          name: string
          organizer?: string | null
          owner_id: string
          provider?: Database["public"]["Enums"]["competition_provider"]
          registration_deadline?: string | null
          source_data?: Json
          starts_at?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          venue_name?: string | null
          with_gi?: boolean | null
        }
        Update: {
          address?: string | null
          age_groups?: Json
          banner_url?: string | null
          belts?: Json
          categories?: Json
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          ends_at?: string | null
          entry_fee?: number | null
          external_id?: string | null
          external_url?: string | null
          id?: string
          modality?: string | null
          name?: string
          organizer?: string | null
          owner_id?: string
          provider?: Database["public"]["Enums"]["competition_provider"]
          registration_deadline?: string | null
          source_data?: Json
          starts_at?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          venue_name?: string | null
          with_gi?: boolean | null
        }
        Relationships: []
      }
      dojo_enrollments: {
        Row: {
          created_at: string
          custom_amount: number | null
          due_day: number
          end_date: string | null
          id: string
          owner_id: string
          plan_id: string
          start_date: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_amount?: number | null
          due_day?: number
          end_date?: string | null
          id?: string
          owner_id: string
          plan_id: string
          start_date?: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_amount?: number | null
          due_day?: number
          end_date?: string | null
          id?: string
          owner_id?: string
          plan_id?: string
          start_date?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_enrollments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "dojo_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_eval_categories: {
        Row: {
          archived: boolean
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          order_index: number
          owner_id: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          order_index?: number
          owner_id: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          order_index?: number
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      dojo_eval_plans: {
        Row: {
          comments: string | null
          created_at: string
          id: string
          improvement_points: string | null
          next_evaluation_at: string | null
          owner_id: string
          recommended_techniques: string[]
          recommended_videos: string[]
          session_id: string
          strong_points: string | null
          updated_at: string
        }
        Insert: {
          comments?: string | null
          created_at?: string
          id?: string
          improvement_points?: string | null
          next_evaluation_at?: string | null
          owner_id: string
          recommended_techniques?: string[]
          recommended_videos?: string[]
          session_id: string
          strong_points?: string | null
          updated_at?: string
        }
        Update: {
          comments?: string | null
          created_at?: string
          id?: string
          improvement_points?: string | null
          next_evaluation_at?: string | null
          owner_id?: string
          recommended_techniques?: string[]
          recommended_videos?: string[]
          session_id?: string
          strong_points?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_eval_plans_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "dojo_eval_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_eval_sessions: {
        Row: {
          attachments: Json
          created_at: string
          evaluator_id: string | null
          finished_at: string | null
          id: string
          max_score: number
          observations: string | null
          owner_id: string
          percentage: number
          result: string | null
          scheduled_at: string | null
          scores: Json
          started_at: string | null
          status: string
          student_id: string
          template_id: string | null
          total_score: number
          updated_at: string
        }
        Insert: {
          attachments?: Json
          created_at?: string
          evaluator_id?: string | null
          finished_at?: string | null
          id?: string
          max_score?: number
          observations?: string | null
          owner_id: string
          percentage?: number
          result?: string | null
          scheduled_at?: string | null
          scores?: Json
          started_at?: string | null
          status?: string
          student_id: string
          template_id?: string | null
          total_score?: number
          updated_at?: string
        }
        Update: {
          attachments?: Json
          created_at?: string
          evaluator_id?: string | null
          finished_at?: string | null
          id?: string
          max_score?: number
          observations?: string | null
          owner_id?: string
          percentage?: number
          result?: string | null
          scheduled_at?: string | null
          scores?: Json
          started_at?: string | null
          status?: string
          student_id?: string
          template_id?: string | null
          total_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_eval_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_eval_sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "dojo_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_eval_techniques: {
        Row: {
          archived: boolean
          category_id: string | null
          created_at: string
          default_score: number
          description: string | null
          estimated_seconds: number | null
          id: string
          image_url: string | null
          name: string
          observations: string | null
          owner_id: string
          required: boolean
          tags: string[]
          updated_at: string
          video_id: string | null
        }
        Insert: {
          archived?: boolean
          category_id?: string | null
          created_at?: string
          default_score?: number
          description?: string | null
          estimated_seconds?: number | null
          id?: string
          image_url?: string | null
          name: string
          observations?: string | null
          owner_id: string
          required?: boolean
          tags?: string[]
          updated_at?: string
          video_id?: string | null
        }
        Update: {
          archived?: boolean
          category_id?: string | null
          created_at?: string
          default_score?: number
          description?: string | null
          estimated_seconds?: number | null
          id?: string
          image_url?: string | null
          name?: string
          observations?: string | null
          owner_id?: string
          required?: boolean
          tags?: string[]
          updated_at?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dojo_eval_techniques_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "dojo_eval_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_eval_techniques_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "dojo_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_evaluations: {
        Row: {
          active: boolean
          auto_graduate: boolean
          belt_id: string | null
          category: string | null
          created_at: string
          degree: number
          description: string | null
          end_belt_id: string | null
          id: string
          is_library: boolean
          items: Json
          method: string
          min_attendance: number | null
          min_training_months: number | null
          modality: string | null
          observations: string | null
          owner_id: string | null
          parent_template_id: string | null
          passing_score: number | null
          scale: Json
          structure: Json
          teacher_id: string | null
          title: string
          total_score: number
          unit_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          active?: boolean
          auto_graduate?: boolean
          belt_id?: string | null
          category?: string | null
          created_at?: string
          degree?: number
          description?: string | null
          end_belt_id?: string | null
          id?: string
          is_library?: boolean
          items?: Json
          method?: string
          min_attendance?: number | null
          min_training_months?: number | null
          modality?: string | null
          observations?: string | null
          owner_id?: string | null
          parent_template_id?: string | null
          passing_score?: number | null
          scale?: Json
          structure?: Json
          teacher_id?: string | null
          title: string
          total_score?: number
          unit_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          active?: boolean
          auto_graduate?: boolean
          belt_id?: string | null
          category?: string | null
          created_at?: string
          degree?: number
          description?: string | null
          end_belt_id?: string | null
          id?: string
          is_library?: boolean
          items?: Json
          method?: string
          min_attendance?: number | null
          min_training_months?: number | null
          modality?: string | null
          observations?: string | null
          owner_id?: string | null
          parent_template_id?: string | null
          passing_score?: number | null
          scale?: Json
          structure?: Json
          teacher_id?: string | null
          title?: string
          total_score?: number
          unit_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "dojo_evaluations_belt_id_fkey"
            columns: ["belt_id"]
            isOneToOne: false
            referencedRelation: "dojo_belts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_evaluations_end_belt_id_fkey"
            columns: ["end_belt_id"]
            isOneToOne: false
            referencedRelation: "dojo_belts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_evaluations_parent_template_id_fkey"
            columns: ["parent_template_id"]
            isOneToOne: false
            referencedRelation: "dojo_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_evaluations_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "dojo_units"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          description: string
          due_date: string
          id: string
          owner_id: string
          paid_at: string | null
          status: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          description: string
          due_date: string
          id?: string
          owner_id: string
          paid_at?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          owner_id?: string
          paid_at?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_expenses_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "dojo_units"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_graduation_settings: {
        Row: {
          classes_by_belt: Json
          created_at: string
          default_classes: number
          default_period_months: number
          id: string
          owner_id: string
          period_months_by_belt: Json
          system: string
          updated_at: string
        }
        Insert: {
          classes_by_belt?: Json
          created_at?: string
          default_classes?: number
          default_period_months?: number
          id?: string
          owner_id: string
          period_months_by_belt?: Json
          system?: string
          updated_at?: string
        }
        Update: {
          classes_by_belt?: Json
          created_at?: string
          default_classes?: number
          default_period_months?: number
          id?: string
          owner_id?: string
          period_months_by_belt?: Json
          system?: string
          updated_at?: string
        }
        Relationships: []
      }
      dojo_graduations: {
        Row: {
          belt_id: string
          created_at: string
          degree: number
          evaluator: string | null
          graduation_date: string
          id: string
          notes: string | null
          owner_id: string
          student_id: string
        }
        Insert: {
          belt_id: string
          created_at?: string
          degree?: number
          evaluator?: string | null
          graduation_date?: string
          id?: string
          notes?: string | null
          owner_id: string
          student_id: string
        }
        Update: {
          belt_id?: string
          created_at?: string
          degree?: number
          evaluator?: string | null
          graduation_date?: string
          id?: string
          notes?: string | null
          owner_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_graduations_belt_id_fkey"
            columns: ["belt_id"]
            isOneToOne: false
            referencedRelation: "dojo_belts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_graduations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_invoices: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          due_date: string
          enrollment_id: string | null
          id: string
          method: string | null
          owner_id: string
          paid_at: string | null
          payment_id: string | null
          payment_link: string | null
          payment_provider: string | null
          status: string
          student_id: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          due_date: string
          enrollment_id?: string | null
          id?: string
          method?: string | null
          owner_id: string
          paid_at?: string | null
          payment_id?: string | null
          payment_link?: string | null
          payment_provider?: string | null
          status?: string
          student_id: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          due_date?: string
          enrollment_id?: string | null
          id?: string
          method?: string | null
          owner_id?: string
          paid_at?: string | null
          payment_id?: string | null
          payment_link?: string | null
          payment_provider?: string | null
          status?: string
          student_id?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_invoices_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "dojo_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_invoices_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "dojo_units"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_partner_checkins: {
        Row: {
          attendance_id: string | null
          created_at: string
          external_user: string | null
          id: string
          owner_id: string | null
          payload: Json | null
          provider: string
          reason: string | null
          status: string
          token: string | null
          unit_id: string | null
        }
        Insert: {
          attendance_id?: string | null
          created_at?: string
          external_user?: string | null
          id?: string
          owner_id?: string | null
          payload?: Json | null
          provider: string
          reason?: string | null
          status: string
          token?: string | null
          unit_id?: string | null
        }
        Update: {
          attendance_id?: string | null
          created_at?: string
          external_user?: string | null
          id?: string
          owner_id?: string | null
          payload?: Json | null
          provider?: string
          reason?: string | null
          status?: string
          token?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dojo_partner_checkins_attendance_id_fkey"
            columns: ["attendance_id"]
            isOneToOne: false
            referencedRelation: "dojo_attendance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_partner_checkins_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "dojo_units"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_partner_integrations: {
        Row: {
          api_key_hint: string | null
          config: Json
          created_at: string
          enabled: boolean
          id: string
          owner_id: string
          provider: string
          unit_id: string | null
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          api_key_hint?: string | null
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          owner_id: string
          provider: string
          unit_id?: string | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          api_key_hint?: string | null
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          owner_id?: string
          provider?: string
          unit_id?: string | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dojo_partner_integrations_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "dojo_units"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_payment_gateways: {
        Row: {
          access_token: string | null
          active: boolean
          created_at: string
          id: string
          is_default: boolean
          label: string | null
          owner_id: string
          provider: string
          public_key: string | null
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          access_token?: string | null
          active?: boolean
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          owner_id: string
          provider: string
          public_key?: string | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          access_token?: string | null
          active?: boolean
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          owner_id?: string
          provider?: string
          public_key?: string | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: []
      }
      dojo_plans: {
        Row: {
          active: boolean
          amount: number
          created_at: string
          duration_days: number
          id: string
          name: string
          owner_id: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount: number
          created_at?: string
          duration_days?: number
          id?: string
          name: string
          owner_id: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount?: number
          created_at?: string
          duration_days?: number
          id?: string
          name?: string
          owner_id?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_plans_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "dojo_units"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_error: string | null
          last_success_at: string | null
          owner_id: string
          p256dh: string
          student_id: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_error?: string | null
          last_success_at?: string | null
          owner_id: string
          p256dh: string
          student_id: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_error?: string | null
          last_success_at?: string | null
          owner_id?: string
          p256dh?: string
          student_id?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dojo_push_subscriptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_spaces: {
        Row: {
          active: boolean
          capacity: number | null
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          capacity?: number | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          capacity?: number | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_spaces_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "dojo_units"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_student_app_config: {
        Row: {
          config: Json
          created_at: string
          draft: Json
          has_unpublished_changes: boolean
          owner_id: string
          published_at: string | null
          published_by: string | null
          updated_at: string
          version: number
        }
        Insert: {
          config?: Json
          created_at?: string
          draft?: Json
          has_unpublished_changes?: boolean
          owner_id: string
          published_at?: string | null
          published_by?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          config?: Json
          created_at?: string
          draft?: Json
          has_unpublished_changes?: boolean
          owner_id?: string
          published_at?: string | null
          published_by?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      dojo_student_app_news: {
        Row: {
          active: boolean
          audience: string
          body: string | null
          created_at: string
          cta_label: string | null
          cta_link: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          kind: string
          owner_id: string
          priority: number
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          audience?: string
          body?: string | null
          created_at?: string
          cta_label?: string | null
          cta_link?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          kind?: string
          owner_id: string
          priority?: number
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          audience?: string
          body?: string | null
          created_at?: string
          cta_label?: string | null
          cta_link?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          kind?: string
          owner_id?: string
          priority?: number
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      dojo_student_app_versions: {
        Row: {
          author_id: string | null
          config: Json
          created_at: string
          id: string
          label: string | null
          owner_id: string
          version: number
        }
        Insert: {
          author_id?: string | null
          config: Json
          created_at?: string
          id?: string
          label?: string | null
          owner_id: string
          version: number
        }
        Update: {
          author_id?: string | null
          config?: Json
          created_at?: string
          id?: string
          label?: string | null
          owner_id?: string
          version?: number
        }
        Relationships: []
      }
      dojo_student_notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string | null
          owner_id: string
          read_at: string | null
          student_id: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          owner_id: string
          read_at?: string | null
          student_id: string
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          owner_id?: string
          read_at?: string | null
          student_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_student_notifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_students: {
        Row: {
          address: string | null
          address_complement: string | null
          address_number: string | null
          anamnesis: Json
          birth_date: string | null
          blood_type: string | null
          checkin_pin: string | null
          city: string | null
          cpf: string | null
          created_at: string
          current_belt_id: string | null
          current_degree: number
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          full_name: string
          gender: string | null
          guardian_name: string | null
          guardian_phone: string | null
          has_medical_clearance: boolean
          health_insurance: string | null
          id: string
          image_rights_consent: boolean
          lgpd_consent: boolean
          lgpd_consent_date: string | null
          marital_status: string | null
          medical_clearance_date: string | null
          nationality: string | null
          neighborhood: string | null
          notes: string | null
          owner_id: string
          phone: string | null
          photo_url: string | null
          profession: string | null
          qr_token: string | null
          rg: string | null
          state: string | null
          status: string
          street: string | null
          terms_accepted: boolean
          terms_accepted_date: string | null
          unit_id: string | null
          updated_at: string
          user_id: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          anamnesis?: Json
          birth_date?: string | null
          blood_type?: string | null
          checkin_pin?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          current_belt_id?: string | null
          current_degree?: number
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          full_name: string
          gender?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          has_medical_clearance?: boolean
          health_insurance?: string | null
          id?: string
          image_rights_consent?: boolean
          lgpd_consent?: boolean
          lgpd_consent_date?: string | null
          marital_status?: string | null
          medical_clearance_date?: string | null
          nationality?: string | null
          neighborhood?: string | null
          notes?: string | null
          owner_id: string
          phone?: string | null
          photo_url?: string | null
          profession?: string | null
          qr_token?: string | null
          rg?: string | null
          state?: string | null
          status?: string
          street?: string | null
          terms_accepted?: boolean
          terms_accepted_date?: string | null
          unit_id?: string | null
          updated_at?: string
          user_id?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          anamnesis?: Json
          birth_date?: string | null
          blood_type?: string | null
          checkin_pin?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          current_belt_id?: string | null
          current_degree?: number
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          full_name?: string
          gender?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          has_medical_clearance?: boolean
          health_insurance?: string | null
          id?: string
          image_rights_consent?: boolean
          lgpd_consent?: boolean
          lgpd_consent_date?: string | null
          marital_status?: string | null
          medical_clearance_date?: string | null
          nationality?: string | null
          neighborhood?: string | null
          notes?: string | null
          owner_id?: string
          phone?: string | null
          photo_url?: string | null
          profession?: string | null
          qr_token?: string | null
          rg?: string | null
          state?: string | null
          status?: string
          street?: string | null
          terms_accepted?: boolean
          terms_accepted_date?: string | null
          unit_id?: string | null
          updated_at?: string
          user_id?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dojo_students_current_belt_id_fkey"
            columns: ["current_belt_id"]
            isOneToOne: false
            referencedRelation: "dojo_belts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_students_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "dojo_units"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          currency: string
          current_period_end: string | null
          id: string
          last_event: Json | null
          mp_preapproval_id: string | null
          owner_id: string
          plan_amount: number
          status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          id?: string
          last_event?: Json | null
          mp_preapproval_id?: string | null
          owner_id: string
          plan_amount?: number
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          id?: string
          last_event?: Json | null
          mp_preapproval_id?: string | null
          owner_id?: string
          plan_amount?: number
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dojo_units: {
        Row: {
          active: boolean
          address: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dojo_video_categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
          parent_id: string | null
          slug: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id: string
          parent_id?: string | null
          slug?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          parent_id?: string | null
          slug?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_video_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "dojo_video_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_video_comments: {
        Row: {
          author_avatar: string | null
          author_name: string | null
          body: string
          created_at: string
          id: string
          likes: number
          owner_id: string
          parent_id: string | null
          pinned: boolean
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          author_avatar?: string | null
          author_name?: string | null
          body: string
          created_at?: string
          id?: string
          likes?: number
          owner_id: string
          parent_id?: string | null
          pinned?: boolean
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          author_avatar?: string | null
          author_name?: string | null
          body?: string
          created_at?: string
          id?: string
          likes?: number
          owner_id?: string
          parent_id?: string | null
          pinned?: boolean
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_video_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "dojo_video_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_video_comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "dojo_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_video_favorites: {
        Row: {
          created_at: string
          owner_id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          owner_id: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          owner_id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_video_favorites_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "dojo_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_video_progress: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          last_seen_at: string
          owner_id: string
          percent: number
          user_id: string
          video_id: string
          watched_seconds: number
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          last_seen_at?: string
          owner_id: string
          percent?: number
          user_id: string
          video_id: string
          watched_seconds?: number
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          last_seen_at?: string
          owner_id?: string
          percent?: number
          user_id?: string
          video_id?: string
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "dojo_video_progress_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "dojo_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_video_views: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          seconds_watched: number
          user_id: string | null
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          seconds_watched?: number
          user_id?: string | null
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          seconds_watched?: number
          user_id?: string | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_video_views_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "dojo_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_videos: {
        Row: {
          access_rules: Json
          archived_at: string | null
          attachments: Json
          category_id: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          likes_count: number
          owner_id: string
          provider_id: string | null
          published_at: string | null
          scheduled_at: string | null
          status: string
          subcategory_id: string | null
          tags: string[]
          teacher_id: string | null
          teacher_name: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_source: string
          video_url: string | null
          views_count: number
          visibility: string
        }
        Insert: {
          access_rules?: Json
          archived_at?: string | null
          attachments?: Json
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          likes_count?: number
          owner_id: string
          provider_id?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          subcategory_id?: string | null
          tags?: string[]
          teacher_id?: string | null
          teacher_name?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_source?: string
          video_url?: string | null
          views_count?: number
          visibility?: string
        }
        Update: {
          access_rules?: Json
          archived_at?: string | null
          attachments?: Json
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          likes_count?: number
          owner_id?: string
          provider_id?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          subcategory_id?: string | null
          tags?: string[]
          teacher_id?: string | null
          teacher_name?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_source?: string
          video_url?: string | null
          views_count?: number
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_videos_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "dojo_video_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_videos_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "dojo_video_categories"
            referencedColumns: ["id"]
          },
        ]
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
      order_notifications: {
        Row: {
          body: string
          created_at: string
          event: string
          id: string
          order_id: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          event: string
          id?: string
          order_id?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          event?: string
          id?: string
          order_id?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "store_orders"
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
          category_id: string | null
          cest: string | null
          cfop: string | null
          compare_at_price: number | null
          cost: number
          created_at: string
          description: string | null
          description_html: string | null
          featured: boolean
          gtin: string | null
          id: string
          image_url: string | null
          meta_description: string | null
          meta_title: string | null
          name: string
          ncm: string | null
          origem: string | null
          price: number
          short_description: string | null
          sku: string | null
          slug: string | null
          source_url: string | null
          status: string
          stock: number
          unidade: string | null
          updated_at: string
          wc_product_id: number | null
          weight_grams: number | null
          wholesale_discount_percent: number | null
          wholesale_enabled: boolean
        }
        Insert: {
          category?: string | null
          category_id?: string | null
          cest?: string | null
          cfop?: string | null
          compare_at_price?: number | null
          cost?: number
          created_at?: string
          description?: string | null
          description_html?: string | null
          featured?: boolean
          gtin?: string | null
          id?: string
          image_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          ncm?: string | null
          origem?: string | null
          price?: number
          short_description?: string | null
          sku?: string | null
          slug?: string | null
          source_url?: string | null
          status?: string
          stock?: number
          unidade?: string | null
          updated_at?: string
          wc_product_id?: number | null
          weight_grams?: number | null
          wholesale_discount_percent?: number | null
          wholesale_enabled?: boolean
        }
        Update: {
          category?: string | null
          category_id?: string | null
          cest?: string | null
          cfop?: string | null
          compare_at_price?: number | null
          cost?: number
          created_at?: string
          description?: string | null
          description_html?: string | null
          featured?: boolean
          gtin?: string | null
          id?: string
          image_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          ncm?: string | null
          origem?: string | null
          price?: number
          short_description?: string | null
          sku?: string | null
          slug?: string | null
          source_url?: string | null
          status?: string
          stock?: number
          unidade?: string | null
          updated_at?: string
          wc_product_id?: number | null
          weight_grams?: number | null
          wholesale_discount_percent?: number | null
          wholesale_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "store_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          city: string | null
          complement: string | null
          cpf: string | null
          created_at: string
          document: string | null
          email: string | null
          full_name: string | null
          id: string
          job_title: string | null
          language: string | null
          neighborhood: string | null
          notes: string | null
          number: string | null
          phone: string | null
          rg: string | null
          state: string | null
          street: string | null
          timezone: string | null
          updated_at: string
          whatsapp: string | null
          zip: string | null
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          job_title?: string | null
          language?: string | null
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          phone?: string | null
          rg?: string | null
          state?: string | null
          street?: string | null
          timezone?: string | null
          updated_at?: string
          whatsapp?: string | null
          zip?: string | null
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          language?: string | null
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          phone?: string | null
          rg?: string | null
          state?: string | null
          street?: string | null
          timezone?: string | null
          updated_at?: string
          whatsapp?: string | null
          zip?: string | null
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
          daily_ma_cities: string[]
          daily_ma_last_run_at: string | null
          daily_ma_per_preset: number
          daily_ma_presets: string[]
          daily_ma_states: string[]
          daily_ma_sweep_enabled: boolean
          email_subject_template: string | null
          email_template: string | null
          enrichment_interval_min: number
          instagram_media_url: string | null
          instagram_template: string | null
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
          daily_ma_cities?: string[]
          daily_ma_last_run_at?: string | null
          daily_ma_per_preset?: number
          daily_ma_presets?: string[]
          daily_ma_states?: string[]
          daily_ma_sweep_enabled?: boolean
          email_subject_template?: string | null
          email_template?: string | null
          enrichment_interval_min?: number
          instagram_media_url?: string | null
          instagram_template?: string | null
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
          daily_ma_cities?: string[]
          daily_ma_last_run_at?: string | null
          daily_ma_per_preset?: number
          daily_ma_presets?: string[]
          daily_ma_states?: string[]
          daily_ma_sweep_enabled?: boolean
          email_subject_template?: string | null
          email_template?: string | null
          enrichment_interval_min?: number
          instagram_media_url?: string | null
          instagram_template?: string | null
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
      store_cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "store_carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "store_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_carts: {
        Row: {
          created_at: string
          currency: string
          id: string
          session_token: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          session_token?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          session_token?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      store_categories: {
        Row: {
          active: boolean
          cest: string | null
          cfop: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          ncm: string | null
          origem: string | null
          parent_id: string | null
          slug: string
          sort_order: number
          source_url: string | null
          unidade: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          cest?: string | null
          cfop?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          ncm?: string | null
          origem?: string | null
          parent_id?: string | null
          slug: string
          sort_order?: number
          source_url?: string | null
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          cest?: string | null
          cfop?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          ncm?: string | null
          origem?: string | null
          parent_id?: string | null
          slug?: string
          sort_order?: number
          source_url?: string | null
          unidade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "store_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      store_import_jobs: {
        Row: {
          created_at: string
          error_message: string | null
          failed: number
          id: string
          log: Json
          processed: number
          source: string
          started_by: string | null
          status: string
          succeeded: number
          total_urls: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          failed?: number
          id?: string
          log?: Json
          processed?: number
          source: string
          started_by?: string | null
          status?: string
          succeeded?: number
          total_urls?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          failed?: number
          id?: string
          log?: Json
          processed?: number
          source?: string
          started_by?: string | null
          status?: string
          succeeded?: number
          total_urls?: number
          updated_at?: string
        }
        Relationships: []
      }
      store_order_items: {
        Row: {
          created_at: string
          custom_config: Json | null
          id: string
          image_url: string | null
          order_id: string
          product_id: string | null
          product_name: string
          production_days: number | null
          quantity: number
          sku: string | null
          total_price: number
          unit_price: number
          variant_id: string | null
          variant_label: string | null
        }
        Insert: {
          created_at?: string
          custom_config?: Json | null
          id?: string
          image_url?: string | null
          order_id: string
          product_id?: string | null
          product_name: string
          production_days?: number | null
          quantity: number
          sku?: string | null
          total_price: number
          unit_price: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Update: {
          created_at?: string
          custom_config?: Json | null
          id?: string
          image_url?: string | null
          order_id?: string
          product_id?: string | null
          product_name?: string
          production_days?: number | null
          quantity?: number
          sku?: string | null
          total_price?: number
          unit_price?: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "store_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "store_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_orders: {
        Row: {
          asaas_boleto_url: string | null
          asaas_customer_id: string | null
          asaas_invoice_url: string | null
          asaas_payment_id: string | null
          asaas_pix_copy_paste: string | null
          asaas_pix_expires_at: string | null
          asaas_pix_qr_code: string | null
          billing_address: Json | null
          card_last4: string | null
          created_at: string
          currency: string
          customer_document: string | null
          customer_email: string
          customer_name: string
          customer_phone: string | null
          discount: number
          id: string
          installments: number | null
          max_production_days: number | null
          melhor_envio_cart_id: string | null
          melhor_envio_data: Json
          melhor_envio_label_url: string | null
          melhor_envio_order_id: string | null
          melhor_envio_protocol: string | null
          melhor_envio_service_id: number | null
          melhor_envio_service_name: string | null
          melhor_envio_status: string | null
          melhor_envio_synced_at: string | null
          metadata: Json
          mp_payment_id: string | null
          mp_preference_id: string | null
          notes: string | null
          order_number: string
          payment_method: string | null
          payment_provider: string | null
          payment_raw: Json | null
          payment_reference: string | null
          payment_status: string
          shipping_address: Json
          shipping_cost: number
          shipping_method: string | null
          shipping_tracking: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string | null
          whatsapp_notified: Json
        }
        Insert: {
          asaas_boleto_url?: string | null
          asaas_customer_id?: string | null
          asaas_invoice_url?: string | null
          asaas_payment_id?: string | null
          asaas_pix_copy_paste?: string | null
          asaas_pix_expires_at?: string | null
          asaas_pix_qr_code?: string | null
          billing_address?: Json | null
          card_last4?: string | null
          created_at?: string
          currency?: string
          customer_document?: string | null
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          discount?: number
          id?: string
          installments?: number | null
          max_production_days?: number | null
          melhor_envio_cart_id?: string | null
          melhor_envio_data?: Json
          melhor_envio_label_url?: string | null
          melhor_envio_order_id?: string | null
          melhor_envio_protocol?: string | null
          melhor_envio_service_id?: number | null
          melhor_envio_service_name?: string | null
          melhor_envio_status?: string | null
          melhor_envio_synced_at?: string | null
          metadata?: Json
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          payment_provider?: string | null
          payment_raw?: Json | null
          payment_reference?: string | null
          payment_status?: string
          shipping_address?: Json
          shipping_cost?: number
          shipping_method?: string | null
          shipping_tracking?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
          whatsapp_notified?: Json
        }
        Update: {
          asaas_boleto_url?: string | null
          asaas_customer_id?: string | null
          asaas_invoice_url?: string | null
          asaas_payment_id?: string | null
          asaas_pix_copy_paste?: string | null
          asaas_pix_expires_at?: string | null
          asaas_pix_qr_code?: string | null
          billing_address?: Json | null
          card_last4?: string | null
          created_at?: string
          currency?: string
          customer_document?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          discount?: number
          id?: string
          installments?: number | null
          max_production_days?: number | null
          melhor_envio_cart_id?: string | null
          melhor_envio_data?: Json
          melhor_envio_label_url?: string | null
          melhor_envio_order_id?: string | null
          melhor_envio_protocol?: string | null
          melhor_envio_service_id?: number | null
          melhor_envio_service_name?: string | null
          melhor_envio_status?: string | null
          melhor_envio_synced_at?: string | null
          metadata?: Json
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          payment_provider?: string | null
          payment_raw?: Json | null
          payment_reference?: string | null
          payment_status?: string
          shipping_address?: Json
          shipping_cost?: number
          shipping_method?: string | null
          shipping_tracking?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
          whatsapp_notified?: Json
        }
        Relationships: []
      }
      store_product_images: {
        Row: {
          alt: string | null
          created_at: string
          id: string
          is_primary: boolean
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_product_variants: {
        Row: {
          active: boolean
          color: string | null
          compare_at_price: number | null
          created_at: string
          id: string
          option_label: string | null
          price: number | null
          product_id: string
          size: string | null
          sku: string | null
          sort_order: number
          stock: number
          updated_at: string
          weight_grams: number | null
        }
        Insert: {
          active?: boolean
          color?: string | null
          compare_at_price?: number | null
          created_at?: string
          id?: string
          option_label?: string | null
          price?: number | null
          product_id: string
          size?: string | null
          sku?: string | null
          sort_order?: number
          stock?: number
          updated_at?: string
          weight_grams?: number | null
        }
        Update: {
          active?: boolean
          color?: string | null
          compare_at_price?: number | null
          created_at?: string
          id?: string
          option_label?: string | null
          price?: number | null
          product_id?: string
          size?: string | null
          sku?: string | null
          sort_order?: number
          stock?: number
          updated_at?: string
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "store_product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_shipping_settings: {
        Row: {
          created_at: string
          default_height_cm: number
          default_insurance_value: number
          default_length_cm: number
          default_weight_kg: number
          default_width_cm: number
          env: string
          id: string
          origin_zip: string
          singleton: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_height_cm?: number
          default_insurance_value?: number
          default_length_cm?: number
          default_weight_kg?: number
          default_width_cm?: number
          env?: string
          id?: string
          origin_zip?: string
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_height_cm?: number
          default_insurance_value?: number
          default_length_cm?: number
          default_weight_kg?: number
          default_width_cm?: number
          env?: string
          id?: string
          origin_zip?: string
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      store_size_presets: {
        Row: {
          category_key: string
          category_label: string
          created_at: string
          id: string
          sizes: Json
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_key: string
          category_label: string
          created_at?: string
          id?: string
          sizes?: Json
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_key?: string
          category_label?: string
          created_at?: string
          id?: string
          sizes?: Json
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      store_visits: {
        Row: {
          created_at: string
          id: string
          path: string | null
          referrer: string | null
          session_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          path?: string | null
          referrer?: string | null
          session_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          path?: string | null
          referrer?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string | null
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
          role: Database["public"]["Enums"]["app_role"]
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
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_my_student_id: { Args: never; Returns: string }
      get_my_student_owner_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
      app_role: "admin" | "moderator" | "user"
      competition_athlete_status:
        | "pre_registered"
        | "registered"
        | "payment_pending"
        | "confirmed"
        | "cancelled"
      competition_provider:
        | "manual"
        | "smoothcomp"
        | "sou_competidor"
        | "bjj_tour"
        | "ibjjf"
        | "uaejjf"
        | "cbjj"
        | "cbjje"
        | "fjjrio"
        | "fpjjb"
        | "fjjsp"
        | "other"
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
      app_role: ["admin", "moderator", "user"],
      competition_athlete_status: [
        "pre_registered",
        "registered",
        "payment_pending",
        "confirmed",
        "cancelled",
      ],
      competition_provider: [
        "manual",
        "smoothcomp",
        "sou_competidor",
        "bjj_tour",
        "ibjjf",
        "uaejjf",
        "cbjj",
        "cbjje",
        "fjjrio",
        "fpjjb",
        "fjjsp",
        "other",
      ],
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
