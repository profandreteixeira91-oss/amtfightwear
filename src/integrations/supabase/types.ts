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
          city: string | null
          complement: string | null
          created_at: string
          document: string | null
          email: string | null
          full_name: string | null
          id: string
          neighborhood: string | null
          number: string | null
          phone: string | null
          state: string | null
          street: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          complement?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          neighborhood?: string | null
          number?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          complement?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          neighborhood?: string | null
          number?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
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
