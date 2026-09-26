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
      academy_competition_athletes: {
        Row: {
          academy_competition_id: string
          age_group: string | null
          amount_paid: number | null
          belt_id: string | null
          belt_name: string | null
          category: string | null
          created_at: string
          documents: Json
          id: string
          notes: string | null
          owner_id: string
          paid: boolean
          payment_method: string | null
          registration_number: string | null
          status: string
          student_id: string
          teacher_id: string | null
          updated_at: string
          weight_class: string | null
          weight_kg: number | null
        }
        Insert: {
          academy_competition_id: string
          age_group?: string | null
          amount_paid?: number | null
          belt_id?: string | null
          belt_name?: string | null
          category?: string | null
          created_at?: string
          documents?: Json
          id?: string
          notes?: string | null
          owner_id: string
          paid?: boolean
          payment_method?: string | null
          registration_number?: string | null
          status?: string
          student_id: string
          teacher_id?: string | null
          updated_at?: string
          weight_class?: string | null
          weight_kg?: number | null
        }
        Update: {
          academy_competition_id?: string
          age_group?: string | null
          amount_paid?: number | null
          belt_id?: string | null
          belt_name?: string | null
          category?: string | null
          created_at?: string
          documents?: Json
          id?: string
          notes?: string | null
          owner_id?: string
          paid?: boolean
          payment_method?: string | null
          registration_number?: string | null
          status?: string
          student_id?: string
          teacher_id?: string | null
          updated_at?: string
          weight_class?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "academy_competition_athletes_academy_competition_id_fkey"
            columns: ["academy_competition_id"]
            isOneToOne: false
            referencedRelation: "academy_competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_competition_athletes_belt_id_fkey"
            columns: ["belt_id"]
            isOneToOne: false
            referencedRelation: "dojo_belts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_competition_athletes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_competition_athletes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "dojo_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_competition_documents: {
        Row: {
          academy_competition_id: string
          created_at: string
          file_url: string | null
          id: string
          kind: string
          notes: string | null
          owner_id: string
          student_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          academy_competition_id: string
          created_at?: string
          file_url?: string | null
          id?: string
          kind: string
          notes?: string | null
          owner_id: string
          student_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          academy_competition_id?: string
          created_at?: string
          file_url?: string | null
          id?: string
          kind?: string
          notes?: string | null
          owner_id?: string
          student_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_competition_documents_academy_competition_id_fkey"
            columns: ["academy_competition_id"]
            isOneToOne: false
            referencedRelation: "academy_competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_competition_documents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_competition_finances: {
        Row: {
          academy_competition_id: string
          amount: number
          created_at: string
          currency: string | null
          description: string | null
          id: string
          kind: string
          notes: string | null
          owner_id: string
          paid_at: string | null
          receipt_url: string | null
          student_id: string | null
          updated_at: string
        }
        Insert: {
          academy_competition_id: string
          amount?: number
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          kind: string
          notes?: string | null
          owner_id: string
          paid_at?: string | null
          receipt_url?: string | null
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          academy_competition_id?: string
          amount?: number
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          kind?: string
          notes?: string | null
          owner_id?: string
          paid_at?: string | null
          receipt_url?: string | null
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_competition_finances_academy_competition_id_fkey"
            columns: ["academy_competition_id"]
            isOneToOne: false
            referencedRelation: "academy_competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_competition_finances_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_competition_hotels: {
        Row: {
          academy_competition_id: string
          address: string | null
          check_in: string | null
          check_out: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          owner_id: string
          phone: string | null
          price: number | null
          rooms: number | null
          updated_at: string
        }
        Insert: {
          academy_competition_id: string
          address?: string | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          owner_id: string
          phone?: string | null
          price?: number | null
          rooms?: number | null
          updated_at?: string
        }
        Update: {
          academy_competition_id?: string
          address?: string | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
          price?: number | null
          rooms?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_competition_hotels_academy_competition_id_fkey"
            columns: ["academy_competition_id"]
            isOneToOne: false
            referencedRelation: "academy_competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_competition_results: {
        Row: {
          academy_competition_id: string
          athlete_id: string | null
          category: string | null
          certificates: string[]
          created_at: string
          draws: number
          id: string
          ippons: number
          knockouts: number
          losses: number
          matches: number
          medal: string | null
          notes: string | null
          owner_id: string
          penalties: number
          photos: string[] | null
          placement: number | null
          points: number
          student_id: string | null
          submissions: number
          total_time_seconds: number | null
          updated_at: string
          videos: string[] | null
          wins: number
        }
        Insert: {
          academy_competition_id: string
          athlete_id?: string | null
          category?: string | null
          certificates?: string[]
          created_at?: string
          draws?: number
          id?: string
          ippons?: number
          knockouts?: number
          losses?: number
          matches?: number
          medal?: string | null
          notes?: string | null
          owner_id: string
          penalties?: number
          photos?: string[] | null
          placement?: number | null
          points?: number
          student_id?: string | null
          submissions?: number
          total_time_seconds?: number | null
          updated_at?: string
          videos?: string[] | null
          wins?: number
        }
        Update: {
          academy_competition_id?: string
          athlete_id?: string | null
          category?: string | null
          certificates?: string[]
          created_at?: string
          draws?: number
          id?: string
          ippons?: number
          knockouts?: number
          losses?: number
          matches?: number
          medal?: string | null
          notes?: string | null
          owner_id?: string
          penalties?: number
          photos?: string[] | null
          placement?: number | null
          points?: number
          student_id?: string | null
          submissions?: number
          total_time_seconds?: number | null
          updated_at?: string
          videos?: string[] | null
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "academy_competition_results_academy_competition_id_fkey"
            columns: ["academy_competition_id"]
            isOneToOne: false
            referencedRelation: "academy_competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_competition_results_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "academy_competition_athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_competition_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_competition_staff: {
        Row: {
          academy_competition_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          owner_id: string
          phone: string | null
          role: string
          student_id: string | null
          updated_at: string
        }
        Insert: {
          academy_competition_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_id: string
          phone?: string | null
          role: string
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          academy_competition_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
          role?: string
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_competition_staff_academy_competition_id_fkey"
            columns: ["academy_competition_id"]
            isOneToOne: false
            referencedRelation: "academy_competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_competition_staff_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_competition_transport: {
        Row: {
          academy_competition_id: string
          created_at: string
          departure_at: string | null
          driver: string | null
          id: string
          kind: string
          notes: string | null
          owner_id: string
          plate: string | null
          return_at: string | null
          seats: number | null
          updated_at: string
        }
        Insert: {
          academy_competition_id: string
          created_at?: string
          departure_at?: string | null
          driver?: string | null
          id?: string
          kind: string
          notes?: string | null
          owner_id: string
          plate?: string | null
          return_at?: string | null
          seats?: number | null
          updated_at?: string
        }
        Update: {
          academy_competition_id?: string
          created_at?: string
          departure_at?: string | null
          driver?: string | null
          id?: string
          kind?: string
          notes?: string | null
          owner_id?: string
          plate?: string | null
          return_at?: string | null
          seats?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_competition_transport_academy_competition_id_fkey"
            columns: ["academy_competition_id"]
            isOneToOne: false
            referencedRelation: "academy_competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_competitions: {
        Row: {
          added_at: string
          added_by: string | null
          competition_id: string
          created_at: string
          id: string
          notes: string | null
          owner_id: string
          professor_id: string | null
          professor_name: string | null
          status: string
          target_belt_ids: string[] | null
          target_class_ids: string[] | null
          updated_at: string
          visibility: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          competition_id: string
          created_at?: string
          id?: string
          notes?: string | null
          owner_id: string
          professor_id?: string | null
          professor_name?: string | null
          status?: string
          target_belt_ids?: string[] | null
          target_class_ids?: string[] | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          competition_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          owner_id?: string
          professor_id?: string | null
          professor_name?: string | null
          status?: string
          target_belt_ids?: string[] | null
          target_class_ids?: string[] | null
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_competitions_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_competitions_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
            referencedColumns: ["id"]
          },
        ]
      }
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
      app_pricing_configs: {
        Row: {
          apportionment_method: string | null
          commission_percent: number | null
          created_at: string | null
          default_gateway_fee: number | null
          default_marketing_percent: number | null
          default_tax_rate: number | null
          desired_pro_labore: number | null
          gateway_percent: number | null
          id: string
          marketing_percent: number | null
          min_contribution_margin: number | null
          min_net_margin: number | null
          monthly_production_estimate: number | null
          profit_percent: number | null
          reserve_percent: number | null
          taxes_percent: number | null
          tenant_id: string | null
          updated_at: string | null
          wholesale_discount_percent: number | null
          wholesale_min_qty: number | null
        }
        Insert: {
          apportionment_method?: string | null
          commission_percent?: number | null
          created_at?: string | null
          default_gateway_fee?: number | null
          default_marketing_percent?: number | null
          default_tax_rate?: number | null
          desired_pro_labore?: number | null
          gateway_percent?: number | null
          id?: string
          marketing_percent?: number | null
          min_contribution_margin?: number | null
          min_net_margin?: number | null
          monthly_production_estimate?: number | null
          profit_percent?: number | null
          reserve_percent?: number | null
          taxes_percent?: number | null
          tenant_id?: string | null
          updated_at?: string | null
          wholesale_discount_percent?: number | null
          wholesale_min_qty?: number | null
        }
        Update: {
          apportionment_method?: string | null
          commission_percent?: number | null
          created_at?: string | null
          default_gateway_fee?: number | null
          default_marketing_percent?: number | null
          default_tax_rate?: number | null
          desired_pro_labore?: number | null
          gateway_percent?: number | null
          id?: string
          marketing_percent?: number | null
          min_contribution_margin?: number | null
          min_net_margin?: number | null
          monthly_production_estimate?: number | null
          profit_percent?: number | null
          reserve_percent?: number | null
          taxes_percent?: number | null
          tenant_id?: string | null
          updated_at?: string | null
          wholesale_discount_percent?: number | null
          wholesale_min_qty?: number | null
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
      competition_ingest_runs: {
        Row: {
          error: string | null
          finished_at: string | null
          found: number
          id: string
          inserted: number
          logs: Json | null
          source_code: string | null
          source_id: string | null
          started_at: string
          status: string
          updated: number
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          found?: number
          id?: string
          inserted?: number
          logs?: Json | null
          source_code?: string | null
          source_id?: string | null
          started_at?: string
          status?: string
          updated?: number
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          found?: number
          id?: string
          inserted?: number
          logs?: Json | null
          source_code?: string | null
          source_id?: string | null
          started_at?: string
          status?: string
          updated?: number
        }
        Relationships: [
          {
            foreignKeyName: "competition_ingest_runs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "competition_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_sources: {
        Row: {
          code: string
          config: Json
          connector: string
          created_at: string
          enabled: boolean
          id: string
          last_error: string | null
          last_run_at: string | null
          last_status: string | null
          name: string
          schedule: string
          updated_at: string
          url: string | null
        }
        Insert: {
          code: string
          config?: Json
          connector?: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_error?: string | null
          last_run_at?: string | null
          last_status?: string | null
          name: string
          schedule?: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          code?: string
          config?: Json
          connector?: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_error?: string | null
          last_run_at?: string | null
          last_status?: string | null
          name?: string
          schedule?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      competitions: {
        Row: {
          address: string | null
          ages: Json
          belts: Json
          categories: Json
          city: string | null
          classification: Json
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          currency: string | null
          description: string | null
          end_at: string | null
          event_type: string | null
          external_id: string | null
          id: string
          last_seen_at: string
          latitude: number | null
          longitude: number | null
          modality: string | null
          name: string
          official_url: string | null
          organization: string | null
          organization_logo: string | null
          participants_limit: number | null
          price: number | null
          raw: Json | null
          registration_deadline: string | null
          registration_url: string | null
          scope: string | null
          sex: string | null
          source_code: string | null
          source_id: string | null
          start_at: string | null
          state: string | null
          status: string
          tier: string | null
          updated_at: string
          venue: string | null
          weigh_in_at: string | null
          weights: Json
        }
        Insert: {
          address?: string | null
          ages?: Json
          belts?: Json
          categories?: Json
          city?: string | null
          classification?: Json
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          end_at?: string | null
          event_type?: string | null
          external_id?: string | null
          id?: string
          last_seen_at?: string
          latitude?: number | null
          longitude?: number | null
          modality?: string | null
          name: string
          official_url?: string | null
          organization?: string | null
          organization_logo?: string | null
          participants_limit?: number | null
          price?: number | null
          raw?: Json | null
          registration_deadline?: string | null
          registration_url?: string | null
          scope?: string | null
          sex?: string | null
          source_code?: string | null
          source_id?: string | null
          start_at?: string | null
          state?: string | null
          status?: string
          tier?: string | null
          updated_at?: string
          venue?: string | null
          weigh_in_at?: string | null
          weights?: Json
        }
        Update: {
          address?: string | null
          ages?: Json
          belts?: Json
          categories?: Json
          city?: string | null
          classification?: Json
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          end_at?: string | null
          event_type?: string | null
          external_id?: string | null
          id?: string
          last_seen_at?: string
          latitude?: number | null
          longitude?: number | null
          modality?: string | null
          name?: string
          official_url?: string | null
          organization?: string | null
          organization_logo?: string | null
          participants_limit?: number | null
          price?: number | null
          raw?: Json | null
          registration_deadline?: string | null
          registration_url?: string | null
          scope?: string | null
          sex?: string | null
          source_code?: string | null
          source_id?: string | null
          start_at?: string | null
          state?: string | null
          status?: string
          tier?: string | null
          updated_at?: string
          venue?: string | null
          weigh_in_at?: string | null
          weights?: Json
        }
        Relationships: [
          {
            foreignKeyName: "competitions_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "competition_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_change_history: {
        Row: {
          changed_by: string | null
          composition_id: string | null
          created_at: string | null
          id: string
          new_cost: number | null
          old_cost: number | null
          reason: string | null
          tenant_id: string | null
        }
        Insert: {
          changed_by?: string | null
          composition_id?: string | null
          created_at?: string | null
          id?: string
          new_cost?: number | null
          old_cost?: number | null
          reason?: string | null
          tenant_id?: string | null
        }
        Update: {
          changed_by?: string | null
          composition_id?: string | null
          created_at?: string | null
          id?: string
          new_cost?: number | null
          old_cost?: number | null
          reason?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_change_history_composition_id_fkey"
            columns: ["composition_id"]
            isOneToOne: false
            referencedRelation: "product_cost_compositions"
            referencedColumns: ["id"]
          },
        ]
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
          accepted_amtpay_terms: boolean
          accepted_amtpay_terms_at: string | null
          address: string | null
          address_complement: string | null
          address_number: string | null
          asaas_api_key_encrypted: string | null
          asaas_onboarding_status: string | null
          asaas_onboarding_url: string | null
          asaas_subaccount_id: string | null
          asaas_wallet_id: string | null
          birth_date: string | null
          brand_primary: string | null
          brand_secondary: string | null
          city: string | null
          cnpj: string | null
          company_type: string | null
          created_at: string
          email: string | null
          facebook: string | null
          instagram: string | null
          legal_name: string | null
          logo_as_default: boolean | null
          logo_placements: Json | null
          logo_url: string | null
          modalities: string[] | null
          monthly_income: number | null
          neighborhood: string | null
          onboarding_completed: boolean
          onboarding_completed_at: string | null
          owner_id: string
          phone: string | null
          pix_key: string | null
          pix_key_type: string | null
          public_url: string | null
          responsible_name: string | null
          seal_url: string | null
          security_pin_hash: string | null
          security_pin_updated_at: string | null
          signature_url: string | null
          slug: string | null
          stamp_url: string | null
          state: string | null
          trade_name: string | null
          updated_at: string
          website: string | null
          whatsapp: string | null
          zip: string | null
        }
        Insert: {
          accepted_amtpay_terms?: boolean
          accepted_amtpay_terms_at?: string | null
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          asaas_api_key_encrypted?: string | null
          asaas_onboarding_status?: string | null
          asaas_onboarding_url?: string | null
          asaas_subaccount_id?: string | null
          asaas_wallet_id?: string | null
          birth_date?: string | null
          brand_primary?: string | null
          brand_secondary?: string | null
          city?: string | null
          cnpj?: string | null
          company_type?: string | null
          created_at?: string
          email?: string | null
          facebook?: string | null
          instagram?: string | null
          legal_name?: string | null
          logo_as_default?: boolean | null
          logo_placements?: Json | null
          logo_url?: string | null
          modalities?: string[] | null
          monthly_income?: number | null
          neighborhood?: string | null
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          owner_id: string
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          public_url?: string | null
          responsible_name?: string | null
          seal_url?: string | null
          security_pin_hash?: string | null
          security_pin_updated_at?: string | null
          signature_url?: string | null
          slug?: string | null
          stamp_url?: string | null
          state?: string | null
          trade_name?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
          zip?: string | null
        }
        Update: {
          accepted_amtpay_terms?: boolean
          accepted_amtpay_terms_at?: string | null
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          asaas_api_key_encrypted?: string | null
          asaas_onboarding_status?: string | null
          asaas_onboarding_url?: string | null
          asaas_subaccount_id?: string | null
          asaas_wallet_id?: string | null
          birth_date?: string | null
          brand_primary?: string | null
          brand_secondary?: string | null
          city?: string | null
          cnpj?: string | null
          company_type?: string | null
          created_at?: string
          email?: string | null
          facebook?: string | null
          instagram?: string | null
          legal_name?: string | null
          logo_as_default?: boolean | null
          logo_placements?: Json | null
          logo_url?: string | null
          modalities?: string[] | null
          monthly_income?: number | null
          neighborhood?: string | null
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          owner_id?: string
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          public_url?: string | null
          responsible_name?: string | null
          seal_url?: string | null
          security_pin_hash?: string | null
          security_pin_updated_at?: string | null
          signature_url?: string | null
          slug?: string | null
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
      dojo_affiliate_contracts: {
        Row: {
          affiliate_id: string
          cancelled_at: string | null
          contract_number: string | null
          created_at: string
          expires_at: string | null
          footer_html: string
          header_html: string
          html_content: string
          id: string
          issued_by: string | null
          margin_mm: number
          notes: string | null
          owner_id: string
          page_orientation: string
          page_size: string
          pdf_url: string | null
          sent_at: string | null
          show_page_numbers: boolean
          signature_data: Json | null
          signature_status: string
          signed_at: string | null
          template_id: string | null
          template_version: number | null
          title: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          affiliate_id: string
          cancelled_at?: string | null
          contract_number?: string | null
          created_at?: string
          expires_at?: string | null
          footer_html?: string
          header_html?: string
          html_content: string
          id?: string
          issued_by?: string | null
          margin_mm?: number
          notes?: string | null
          owner_id: string
          page_orientation?: string
          page_size?: string
          pdf_url?: string | null
          sent_at?: string | null
          show_page_numbers?: boolean
          signature_data?: Json | null
          signature_status?: string
          signed_at?: string | null
          template_id?: string | null
          template_version?: number | null
          title?: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          affiliate_id?: string
          cancelled_at?: string | null
          contract_number?: string | null
          created_at?: string
          expires_at?: string | null
          footer_html?: string
          header_html?: string
          html_content?: string
          id?: string
          issued_by?: string | null
          margin_mm?: number
          notes?: string | null
          owner_id?: string
          page_orientation?: string
          page_size?: string
          pdf_url?: string | null
          sent_at?: string | null
          show_page_numbers?: boolean
          signature_data?: Json | null
          signature_status?: string
          signed_at?: string | null
          template_id?: string | null
          template_version?: number | null
          title?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "dojo_affiliate_contracts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "dojo_affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_affiliates: {
        Row: {
          academy_name: string
          affiliation_number: string
          banner_url: string | null
          city: string | null
          cnpj: string | null
          complement: string | null
          country: string | null
          created_at: string
          email: string | null
          expires_at: string | null
          facade_url: string | null
          gallery_urls: string[] | null
          id: string
          joined_at: string | null
          legal_name: string | null
          logo_url: string | null
          manager_cpf: string | null
          manager_email: string | null
          manager_name: string | null
          manager_phone: string | null
          manager_rg: string | null
          metadata: Json | null
          modalities: string[] | null
          neighborhood: string | null
          notes: string | null
          number: string | null
          owner_id: string
          phone: string | null
          socials: Json | null
          state: string | null
          state_registration: string | null
          status: string
          street: string | null
          teacher: Json | null
          trade_name: string | null
          updated_at: string
          website: string | null
          whatsapp: string | null
          zip: string | null
        }
        Insert: {
          academy_name: string
          affiliation_number: string
          banner_url?: string | null
          city?: string | null
          cnpj?: string | null
          complement?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string | null
          facade_url?: string | null
          gallery_urls?: string[] | null
          id?: string
          joined_at?: string | null
          legal_name?: string | null
          logo_url?: string | null
          manager_cpf?: string | null
          manager_email?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          manager_rg?: string | null
          metadata?: Json | null
          modalities?: string[] | null
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          owner_id: string
          phone?: string | null
          socials?: Json | null
          state?: string | null
          state_registration?: string | null
          status?: string
          street?: string | null
          teacher?: Json | null
          trade_name?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
          zip?: string | null
        }
        Update: {
          academy_name?: string
          affiliation_number?: string
          banner_url?: string | null
          city?: string | null
          cnpj?: string | null
          complement?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string | null
          facade_url?: string | null
          gallery_urls?: string[] | null
          id?: string
          joined_at?: string | null
          legal_name?: string | null
          logo_url?: string | null
          manager_cpf?: string | null
          manager_email?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          manager_rg?: string | null
          metadata?: Json | null
          modalities?: string[] | null
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          owner_id?: string
          phone?: string | null
          socials?: Json | null
          state?: string | null
          state_registration?: string | null
          status?: string
          street?: string | null
          teacher?: Json | null
          trade_name?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      dojo_announcement_categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          owner_id: string
          slug: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          owner_id: string
          slug?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          owner_id?: string
          slug?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      dojo_announcement_comments: {
        Row: {
          announcement_id: string
          comment: string
          created_at: string
          id: string
          owner_id: string
          student_id: string
        }
        Insert: {
          announcement_id: string
          comment: string
          created_at?: string
          id?: string
          owner_id: string
          student_id: string
        }
        Update: {
          announcement_id?: string
          comment?: string
          created_at?: string
          id?: string
          owner_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_announcement_comments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "dojo_announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_announcement_comments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_announcement_likes: {
        Row: {
          announcement_id: string
          id: string
          liked_at: string
          owner_id: string
          student_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          liked_at?: string
          owner_id: string
          student_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          liked_at?: string
          owner_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_announcement_likes_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "dojo_announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_announcement_likes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_announcement_reads: {
        Row: {
          announcement_id: string
          device: string | null
          id: string
          ip: string | null
          owner_id: string
          read_at: string
          student_id: string
        }
        Insert: {
          announcement_id: string
          device?: string | null
          id?: string
          ip?: string | null
          owner_id: string
          read_at?: string
          student_id: string
        }
        Update: {
          announcement_id?: string
          device?: string | null
          id?: string
          ip?: string | null
          owner_id?: string
          read_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "dojo_announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_announcement_reads_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_announcement_targets: {
        Row: {
          announcement_id: string
          created_at: string
          id: string
          owner_id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          id?: string
          owner_id: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          id?: string
          owner_id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_announcement_targets_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "dojo_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_announcements: {
        Row: {
          allow_comments: boolean
          allow_likes: boolean
          attachments: Json
          author_name: string | null
          category_id: string | null
          color: string | null
          content: string
          cover_image: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          featured: boolean
          gallery: Json
          icon: string | null
          id: string
          owner_id: string
          pinned: boolean
          priority: string
          publish_at: string
          require_read_confirmation: boolean
          send_notification: boolean
          status: string
          subtitle: string | null
          summary: string | null
          target_scope: string
          title: string
          updated_at: string
          video_url: string | null
          view_count: number
        }
        Insert: {
          allow_comments?: boolean
          allow_likes?: boolean
          attachments?: Json
          author_name?: string | null
          category_id?: string | null
          color?: string | null
          content?: string
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          featured?: boolean
          gallery?: Json
          icon?: string | null
          id?: string
          owner_id: string
          pinned?: boolean
          priority?: string
          publish_at?: string
          require_read_confirmation?: boolean
          send_notification?: boolean
          status?: string
          subtitle?: string | null
          summary?: string | null
          target_scope?: string
          title: string
          updated_at?: string
          video_url?: string | null
          view_count?: number
        }
        Update: {
          allow_comments?: boolean
          allow_likes?: boolean
          attachments?: Json
          author_name?: string | null
          category_id?: string | null
          color?: string | null
          content?: string
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          featured?: boolean
          gallery?: Json
          icon?: string | null
          id?: string
          owner_id?: string
          pinned?: boolean
          priority?: string
          publish_at?: string
          require_read_confirmation?: boolean
          send_notification?: boolean
          status?: string
          subtitle?: string | null
          summary?: string | null
          target_scope?: string
          title?: string
          updated_at?: string
          video_url?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "dojo_announcements_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "dojo_announcement_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_api_keys: {
        Row: {
          created_at: string
          hashed_key: string
          id: string
          last_used_at: string | null
          module: string | null
          name: string
          owner_id: string
          prefix: string
          revoked_at: string | null
          scopes: string[]
        }
        Insert: {
          created_at?: string
          hashed_key: string
          id?: string
          last_used_at?: string | null
          module?: string | null
          name: string
          owner_id: string
          prefix: string
          revoked_at?: string | null
          scopes?: string[]
        }
        Update: {
          created_at?: string
          hashed_key?: string
          id?: string
          last_used_at?: string | null
          module?: string | null
          name?: string
          owner_id?: string
          prefix?: string
          revoked_at?: string | null
          scopes?: string[]
        }
        Relationships: []
      }
      dojo_app_apk_downloads: {
        Row: {
          apk_version_id: string
          created_at: string
          id: string
          ip: string | null
          owner_id: string
          slug: string | null
          user_agent: string | null
        }
        Insert: {
          apk_version_id: string
          created_at?: string
          id?: string
          ip?: string | null
          owner_id: string
          slug?: string | null
          user_agent?: string | null
        }
        Update: {
          apk_version_id?: string
          created_at?: string
          id?: string
          ip?: string | null
          owner_id?: string
          slug?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dojo_app_apk_downloads_apk_version_id_fkey"
            columns: ["apk_version_id"]
            isOneToOne: false
            referencedRelation: "dojo_app_apk_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_app_apk_versions: {
        Row: {
          build_code: number
          created_at: string
          created_by: string | null
          downloads: number
          file_name: string
          file_path: string
          file_size: number
          id: string
          is_published: boolean
          mime_type: string
          owner_id: string
          release_notes: string | null
          updated_at: string
          version_name: string
        }
        Insert: {
          build_code?: number
          created_at?: string
          created_by?: string | null
          downloads?: number
          file_name: string
          file_path: string
          file_size: number
          id?: string
          is_published?: boolean
          mime_type?: string
          owner_id: string
          release_notes?: string | null
          updated_at?: string
          version_name: string
        }
        Update: {
          build_code?: number
          created_at?: string
          created_by?: string | null
          downloads?: number
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          is_published?: boolean
          mime_type?: string
          owner_id?: string
          release_notes?: string | null
          updated_at?: string
          version_name?: string
        }
        Relationships: []
      }
      dojo_athlete_goals: {
        Row: {
          auto_progress: boolean
          completed_at: string | null
          created_at: string
          current_value: number
          description: string | null
          due_date: string | null
          goal_type: string
          id: string
          metadata: Json
          owner_id: string
          priority: string
          start_date: string
          status: string
          student_id: string
          target_belt_id: string | null
          target_degree: number | null
          target_value: number
          title: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          auto_progress?: boolean
          completed_at?: string | null
          created_at?: string
          current_value?: number
          description?: string | null
          due_date?: string | null
          goal_type?: string
          id?: string
          metadata?: Json
          owner_id: string
          priority?: string
          start_date?: string
          status?: string
          student_id: string
          target_belt_id?: string | null
          target_degree?: number | null
          target_value?: number
          title: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          auto_progress?: boolean
          completed_at?: string | null
          created_at?: string
          current_value?: number
          description?: string | null
          due_date?: string | null
          goal_type?: string
          id?: string
          metadata?: Json
          owner_id?: string
          priority?: string
          start_date?: string
          status?: string
          student_id?: string
          target_belt_id?: string | null
          target_degree?: number | null
          target_value?: number
          title?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_athlete_goals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
            referencedColumns: ["id"]
          },
        ]
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
      dojo_audit_logs: {
        Row: {
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          gateway: string | null
          id: string
          ip: string | null
          message: string | null
          metadata: Json
          owner_id: string
          payload: Json
          status: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          gateway?: string | null
          id?: string
          ip?: string | null
          message?: string | null
          metadata?: Json
          owner_id: string
          payload?: Json
          status?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          gateway?: string | null
          id?: string
          ip?: string | null
          message?: string | null
          metadata?: Json
          owner_id?: string
          payload?: Json
          status?: string | null
        }
        Relationships: []
      }
      dojo_bank_accounts: {
        Row: {
          account_digit: string | null
          account_number: string | null
          account_type: Database["public"]["Enums"]["amtpay_bank_account_type"]
          active: boolean
          bank_code: string | null
          bank_name: string | null
          branch: string | null
          branch_digit: string | null
          created_at: string
          holder_document: string
          holder_name: string
          id: string
          is_primary: boolean
          notes: string | null
          owner_id: string
          pix_key: string | null
          pix_key_type:
            | Database["public"]["Enums"]["amtpay_pix_key_type"]
            | null
          updated_at: string
        }
        Insert: {
          account_digit?: string | null
          account_number?: string | null
          account_type?: Database["public"]["Enums"]["amtpay_bank_account_type"]
          active?: boolean
          bank_code?: string | null
          bank_name?: string | null
          branch?: string | null
          branch_digit?: string | null
          created_at?: string
          holder_document: string
          holder_name: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          owner_id: string
          pix_key?: string | null
          pix_key_type?:
            | Database["public"]["Enums"]["amtpay_pix_key_type"]
            | null
          updated_at?: string
        }
        Update: {
          account_digit?: string | null
          account_number?: string | null
          account_type?: Database["public"]["Enums"]["amtpay_bank_account_type"]
          active?: boolean
          bank_code?: string | null
          bank_name?: string | null
          branch?: string | null
          branch_digit?: string | null
          created_at?: string
          holder_document?: string
          holder_name?: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          owner_id?: string
          pix_key?: string | null
          pix_key_type?:
            | Database["public"]["Enums"]["amtpay_pix_key_type"]
            | null
          updated_at?: string
        }
        Relationships: []
      }
      dojo_belts: {
        Row: {
          category: string
          color_hex: string
          created_at: string
          criteria_mode: string
          id: string
          max_degrees: number
          min_classes: number | null
          min_months: number | null
          modality: string
          name: string
          owner_id: string | null
          sort_order: number
          stripe_hex: string | null
          variants: Json
          visual: Json
        }
        Insert: {
          category?: string
          color_hex?: string
          created_at?: string
          criteria_mode?: string
          id?: string
          max_degrees?: number
          min_classes?: number | null
          min_months?: number | null
          modality?: string
          name: string
          owner_id?: string | null
          sort_order: number
          stripe_hex?: string | null
          variants?: Json
          visual?: Json
        }
        Update: {
          category?: string
          color_hex?: string
          created_at?: string
          criteria_mode?: string
          id?: string
          max_degrees?: number
          min_classes?: number | null
          min_months?: number | null
          modality?: string
          name?: string
          owner_id?: string | null
          sort_order?: number
          stripe_hex?: string | null
          variants?: Json
          visual?: Json
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
          affiliate_id: string | null
          created_at: string
          graduation_id: string | null
          id: string
          issued_at: string
          owner_id: string
          pdf_url: string | null
          public_hash: string
          student_id: string | null
          template_id: string | null
          unit_id: string | null
          values: Json
        }
        Insert: {
          affiliate_id?: string | null
          created_at?: string
          graduation_id?: string | null
          id?: string
          issued_at?: string
          owner_id: string
          pdf_url?: string | null
          public_hash?: string
          student_id?: string | null
          template_id?: string | null
          unit_id?: string | null
          values?: Json
        }
        Update: {
          affiliate_id?: string | null
          created_at?: string
          graduation_id?: string | null
          id?: string
          issued_at?: string
          owner_id?: string
          pdf_url?: string | null
          public_hash?: string
          student_id?: string | null
          template_id?: string | null
          unit_id?: string | null
          values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "dojo_certificates_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "dojo_affiliates"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "dojo_certificates_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "dojo_units"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_checkin_settings: {
        Row: {
          allow_admin_exception: boolean
          allow_fixed_qr_checkin: boolean
          allow_gps_checkin: boolean
          allow_multiple_daily: boolean
          allow_photo_checkin: boolean
          allow_pin_checkin: boolean
          allow_qr_checkin: boolean
          allow_teacher_exception: boolean
          block_duplicate_checkin: boolean
          block_on_overdue: boolean
          checkin_window_post_mins: number
          checkin_window_pre_mins: number
          created_at: string
          extras: Json
          face_allow_manual_confirmation: boolean | null
          face_lgpd_policy: string | null
          face_max_storage_days: number | null
          face_min_confidence: number | null
          face_recognition_enabled: boolean | null
          face_register_visitors: boolean | null
          face_save_original_photo: boolean | null
          face_save_thumbnails: boolean | null
          geo_address: string | null
          geo_lat: number | null
          geo_lng: number | null
          geo_radius_m: number
          geo_required: boolean
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
          allow_admin_exception?: boolean
          allow_fixed_qr_checkin?: boolean
          allow_gps_checkin?: boolean
          allow_multiple_daily?: boolean
          allow_photo_checkin?: boolean
          allow_pin_checkin?: boolean
          allow_qr_checkin?: boolean
          allow_teacher_exception?: boolean
          block_duplicate_checkin?: boolean
          block_on_overdue?: boolean
          checkin_window_post_mins?: number
          checkin_window_pre_mins?: number
          created_at?: string
          extras?: Json
          face_allow_manual_confirmation?: boolean | null
          face_lgpd_policy?: string | null
          face_max_storage_days?: number | null
          face_min_confidence?: number | null
          face_recognition_enabled?: boolean | null
          face_register_visitors?: boolean | null
          face_save_original_photo?: boolean | null
          face_save_thumbnails?: boolean | null
          geo_address?: string | null
          geo_lat?: number | null
          geo_lng?: number | null
          geo_radius_m?: number
          geo_required?: boolean
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
          allow_admin_exception?: boolean
          allow_fixed_qr_checkin?: boolean
          allow_gps_checkin?: boolean
          allow_multiple_daily?: boolean
          allow_photo_checkin?: boolean
          allow_pin_checkin?: boolean
          allow_qr_checkin?: boolean
          allow_teacher_exception?: boolean
          block_duplicate_checkin?: boolean
          block_on_overdue?: boolean
          checkin_window_post_mins?: number
          checkin_window_pre_mins?: number
          created_at?: string
          extras?: Json
          face_allow_manual_confirmation?: boolean | null
          face_lgpd_policy?: string | null
          face_max_storage_days?: number | null
          face_min_confidence?: number | null
          face_recognition_enabled?: boolean | null
          face_register_visitors?: boolean | null
          face_save_original_photo?: boolean | null
          face_save_thumbnails?: boolean | null
          geo_address?: string | null
          geo_lat?: number | null
          geo_lng?: number | null
          geo_radius_m?: number
          geo_required?: boolean
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
          original_teacher_id: string | null
          owner_id: string
          schedule_id: string | null
          start_time: string | null
          status: string
          substitute_reason: string | null
          substitute_reason_detail: string | null
          substitute_teacher_id: string | null
          substituted_at: string | null
          substituted_by: string | null
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
          original_teacher_id?: string | null
          owner_id: string
          schedule_id?: string | null
          start_time?: string | null
          status?: string
          substitute_reason?: string | null
          substitute_reason_detail?: string | null
          substitute_teacher_id?: string | null
          substituted_at?: string | null
          substituted_by?: string | null
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
          original_teacher_id?: string | null
          owner_id?: string
          schedule_id?: string | null
          start_time?: string | null
          status?: string
          substitute_reason?: string | null
          substitute_reason_detail?: string | null
          substitute_teacher_id?: string | null
          substituted_at?: string | null
          substituted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_class_occurrences_class_id_fk"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "dojo_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_class_occurrences_original_teacher_id_fkey"
            columns: ["original_teacher_id"]
            isOneToOne: false
            referencedRelation: "dojo_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_class_occurrences_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "dojo_class_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_class_occurrences_substitute_teacher_id_fkey"
            columns: ["substitute_teacher_id"]
            isOneToOne: false
            referencedRelation: "dojo_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_class_photos: {
        Row: {
          algorithm_version: string | null
          class_id: string
          created_at: string | null
          faces_count: number | null
          id: string
          identified_count: number | null
          lesson_history_id: string | null
          manual_count: number | null
          owner_id: string
          photo_url: string
          processing_time_ms: number | null
          professor_id: string | null
          unit_id: string
          unknown_count: number | null
        }
        Insert: {
          algorithm_version?: string | null
          class_id: string
          created_at?: string | null
          faces_count?: number | null
          id?: string
          identified_count?: number | null
          lesson_history_id?: string | null
          manual_count?: number | null
          owner_id: string
          photo_url: string
          processing_time_ms?: number | null
          professor_id?: string | null
          unit_id: string
          unknown_count?: number | null
        }
        Update: {
          algorithm_version?: string | null
          class_id?: string
          created_at?: string | null
          faces_count?: number | null
          id?: string
          identified_count?: number | null
          lesson_history_id?: string | null
          manual_count?: number | null
          owner_id?: string
          photo_url?: string
          processing_time_ms?: number | null
          professor_id?: string | null
          unit_id?: string
          unknown_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dojo_class_photos_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "dojo_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_class_photos_lesson_history_id_fkey"
            columns: ["lesson_history_id"]
            isOneToOne: false
            referencedRelation: "dojo_lesson_history"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_class_reminders_sent: {
        Row: {
          class_id: string
          id: string
          occurrence_date: string
          occurrence_start_time: string
          offset_minutes: number
          owner_id: string
          sent_at: string
          student_id: string
        }
        Insert: {
          class_id: string
          id?: string
          occurrence_date: string
          occurrence_start_time: string
          offset_minutes: number
          owner_id: string
          sent_at?: string
          student_id: string
        }
        Update: {
          class_id?: string
          id?: string
          occurrence_date?: string
          occurrence_start_time?: string
          offset_minutes?: number
          owner_id?: string
          sent_at?: string
          student_id?: string
        }
        Relationships: []
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
            foreignKeyName: "dojo_class_schedules_class_id_fk"
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
            foreignKeyName: "dojo_class_students_class_id_fk"
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
            referencedRelation: "dojo_team_members"
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
          amount_paid: number | null
          belt: string | null
          category: string | null
          competition_id: string
          created_at: string
          documents: Json
          id: string
          notes: string | null
          owner_id: string
          payment_method: string | null
          registered_at: string
          registered_by: string | null
          registration_number: string | null
          status: Database["public"]["Enums"]["competition_athlete_status"]
          student_id: string
          teacher_id: string | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          age_group?: string | null
          amount_paid?: number | null
          belt?: string | null
          category?: string | null
          competition_id: string
          created_at?: string
          documents?: Json
          id?: string
          notes?: string | null
          owner_id: string
          payment_method?: string | null
          registered_at?: string
          registered_by?: string | null
          registration_number?: string | null
          status?: Database["public"]["Enums"]["competition_athlete_status"]
          student_id: string
          teacher_id?: string | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          age_group?: string | null
          amount_paid?: number | null
          belt?: string | null
          category?: string | null
          competition_id?: string
          created_at?: string
          documents?: Json
          id?: string
          notes?: string | null
          owner_id?: string
          payment_method?: string | null
          registered_at?: string
          registered_by?: string | null
          registration_number?: string | null
          status?: Database["public"]["Enums"]["competition_athlete_status"]
          student_id?: string
          teacher_id?: string | null
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
          {
            foreignKeyName: "dojo_competition_athletes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "dojo_team_members"
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
      dojo_competition_calendar: {
        Row: {
          checklist: Json
          competition_id: string
          created_at: string
          event_ends_at: string | null
          event_starts_at: string
          id: string
          notes: string | null
          notify_athletes: boolean
          notify_teachers: boolean
          owner_id: string
          updated_at: string
        }
        Insert: {
          checklist?: Json
          competition_id: string
          created_at?: string
          event_ends_at?: string | null
          event_starts_at: string
          id?: string
          notes?: string | null
          notify_athletes?: boolean
          notify_teachers?: boolean
          owner_id: string
          updated_at?: string
        }
        Update: {
          checklist?: Json
          competition_id?: string
          created_at?: string
          event_ends_at?: string | null
          event_starts_at?: string
          id?: string
          notes?: string | null
          notify_athletes?: boolean
          notify_teachers?: boolean
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_competition_calendar_competition_id_fkey"
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
      dojo_competition_media: {
        Row: {
          athlete_id: string | null
          caption: string | null
          competition_id: string
          created_at: string
          id: string
          kind: string
          owner_id: string
          uploaded_by: string | null
          url: string
        }
        Insert: {
          athlete_id?: string | null
          caption?: string | null
          competition_id: string
          created_at?: string
          id?: string
          kind: string
          owner_id: string
          uploaded_by?: string | null
          url: string
        }
        Update: {
          athlete_id?: string | null
          caption?: string | null
          competition_id?: string
          created_at?: string
          id?: string
          kind?: string
          owner_id?: string
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_competition_media_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "dojo_competition_athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_competition_media_competition_id_fkey"
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
          ippons: number | null
          knockouts: number | null
          matches_drawn: number | null
          matches_lost: number | null
          matches_total: number | null
          matches_won: number | null
          notes: string | null
          owner_id: string
          placement: number | null
          submissions: number | null
          total_points: number | null
          total_time_seconds: number | null
          updated_at: string
        }
        Insert: {
          athlete_id: string
          competition_id: string
          created_at?: string
          id?: string
          ippons?: number | null
          knockouts?: number | null
          matches_drawn?: number | null
          matches_lost?: number | null
          matches_total?: number | null
          matches_won?: number | null
          notes?: string | null
          owner_id: string
          placement?: number | null
          submissions?: number | null
          total_points?: number | null
          total_time_seconds?: number | null
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          competition_id?: string
          created_at?: string
          id?: string
          ippons?: number | null
          knockouts?: number | null
          matches_drawn?: number | null
          matches_lost?: number | null
          matches_total?: number | null
          matches_won?: number | null
          notes?: string | null
          owner_id?: string
          placement?: number | null
          submissions?: number | null
          total_points?: number | null
          total_time_seconds?: number | null
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
          archived_at: string | null
          banner_url: string | null
          belts: Json
          calendar_event_id: string | null
          cancelled_at: string | null
          categories: Json
          city: string | null
          confederation: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          currency: string | null
          description: string | null
          ends_at: string | null
          entry_fee: number | null
          estimated_athletes: number | null
          external_id: string | null
          external_url: string | null
          facebook: string | null
          federation: string | null
          id: string
          instagram: string | null
          internal: boolean
          is_free: boolean
          is_international: boolean
          modality: string | null
          name: string
          organizer: string | null
          owner_id: string
          provider: Database["public"]["Enums"]["competition_provider"]
          registration_deadline: string | null
          regulation_url: string | null
          schedule_url: string | null
          source_data: Json
          starts_at: string | null
          state: string | null
          status: string
          subtitle: string | null
          tags: Json
          updated_at: string
          venue_map_url: string | null
          venue_name: string | null
          website: string | null
          with_gi: boolean | null
        }
        Insert: {
          address?: string | null
          age_groups?: Json
          archived_at?: string | null
          banner_url?: string | null
          belts?: Json
          calendar_event_id?: string | null
          cancelled_at?: string | null
          categories?: Json
          city?: string | null
          confederation?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          ends_at?: string | null
          entry_fee?: number | null
          estimated_athletes?: number | null
          external_id?: string | null
          external_url?: string | null
          facebook?: string | null
          federation?: string | null
          id?: string
          instagram?: string | null
          internal?: boolean
          is_free?: boolean
          is_international?: boolean
          modality?: string | null
          name: string
          organizer?: string | null
          owner_id: string
          provider?: Database["public"]["Enums"]["competition_provider"]
          registration_deadline?: string | null
          regulation_url?: string | null
          schedule_url?: string | null
          source_data?: Json
          starts_at?: string | null
          state?: string | null
          status?: string
          subtitle?: string | null
          tags?: Json
          updated_at?: string
          venue_map_url?: string | null
          venue_name?: string | null
          website?: string | null
          with_gi?: boolean | null
        }
        Update: {
          address?: string | null
          age_groups?: Json
          archived_at?: string | null
          banner_url?: string | null
          belts?: Json
          calendar_event_id?: string | null
          cancelled_at?: string | null
          categories?: Json
          city?: string | null
          confederation?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          ends_at?: string | null
          entry_fee?: number | null
          estimated_athletes?: number | null
          external_id?: string | null
          external_url?: string | null
          facebook?: string | null
          federation?: string | null
          id?: string
          instagram?: string | null
          internal?: boolean
          is_free?: boolean
          is_international?: boolean
          modality?: string | null
          name?: string
          organizer?: string | null
          owner_id?: string
          provider?: Database["public"]["Enums"]["competition_provider"]
          registration_deadline?: string | null
          regulation_url?: string | null
          schedule_url?: string | null
          source_data?: Json
          starts_at?: string | null
          state?: string | null
          status?: string
          subtitle?: string | null
          tags?: Json
          updated_at?: string
          venue_map_url?: string | null
          venue_name?: string | null
          website?: string | null
          with_gi?: boolean | null
        }
        Relationships: []
      }
      dojo_contract_events: {
        Row: {
          actor_id: string | null
          contract_id: string
          contract_kind: string
          created_at: string
          event_type: string
          id: string
          note: string | null
          owner_id: string
          payload: Json
        }
        Insert: {
          actor_id?: string | null
          contract_id: string
          contract_kind: string
          created_at?: string
          event_type: string
          id?: string
          note?: string | null
          owner_id: string
          payload?: Json
        }
        Update: {
          actor_id?: string | null
          contract_id?: string
          contract_kind?: string
          created_at?: string
          event_type?: string
          id?: string
          note?: string | null
          owner_id?: string
          payload?: Json
        }
        Relationships: []
      }
      dojo_contract_templates: {
        Row: {
          category: string
          content: string
          created_at: string
          current_version: number
          description: string | null
          footer_html: string
          header_html: string
          id: string
          is_default: boolean
          margin_mm: number
          name: string
          owner_id: string | null
          page_orientation: string
          page_size: string
          show_page_numbers: boolean
          status: string
          tags: string[]
          updated_at: string
          variables_schema: Json
        }
        Insert: {
          category?: string
          content?: string
          created_at?: string
          current_version?: number
          description?: string | null
          footer_html?: string
          header_html?: string
          id?: string
          is_default?: boolean
          margin_mm?: number
          name: string
          owner_id?: string | null
          page_orientation?: string
          page_size?: string
          show_page_numbers?: boolean
          status?: string
          tags?: string[]
          updated_at?: string
          variables_schema?: Json
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          current_version?: number
          description?: string | null
          footer_html?: string
          header_html?: string
          id?: string
          is_default?: boolean
          margin_mm?: number
          name?: string
          owner_id?: string | null
          page_orientation?: string
          page_size?: string
          show_page_numbers?: boolean
          status?: string
          tags?: string[]
          updated_at?: string
          variables_schema?: Json
        }
        Relationships: []
      }
      dojo_corporate_beneficiaries: {
        Row: {
          beneficiary_code: string | null
          created_at: string
          eligible: boolean
          id: string
          last_check_at: string | null
          last_check_result: string | null
          last_sync_at: string | null
          owner_id: string
          plan_info: Json
          plan_name: string | null
          provider: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          beneficiary_code?: string | null
          created_at?: string
          eligible?: boolean
          id?: string
          last_check_at?: string | null
          last_check_result?: string | null
          last_sync_at?: string | null
          owner_id: string
          plan_info?: Json
          plan_name?: string | null
          provider: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          beneficiary_code?: string | null
          created_at?: string
          eligible?: boolean
          id?: string
          last_check_at?: string | null
          last_check_result?: string | null
          last_sync_at?: string | null
          owner_id?: string
          plan_info?: Json
          plan_name?: string | null
          provider?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_corporate_beneficiaries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_corporate_history: {
        Row: {
          actor: string | null
          actor_email: string | null
          created_at: string
          details: Json
          event: string
          id: string
          owner_id: string
          provider: string
        }
        Insert: {
          actor?: string | null
          actor_email?: string | null
          created_at?: string
          details?: Json
          event: string
          id?: string
          owner_id: string
          provider: string
        }
        Update: {
          actor?: string | null
          actor_email?: string | null
          created_at?: string
          details?: Json
          event?: string
          id?: string
          owner_id?: string
          provider?: string
        }
        Relationships: []
      }
      dojo_corporate_integrations: {
        Row: {
          academy_snapshot: Json
          auth_state: Json
          config: Json
          connected_at: string | null
          created_at: string
          disconnected_at: string | null
          gym_code: string | null
          id: string
          last_sync_at: string | null
          last_sync_message: string | null
          last_sync_status: string | null
          owner_id: string
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          academy_snapshot?: Json
          auth_state?: Json
          config?: Json
          connected_at?: string | null
          created_at?: string
          disconnected_at?: string | null
          gym_code?: string | null
          id?: string
          last_sync_at?: string | null
          last_sync_message?: string | null
          last_sync_status?: string | null
          owner_id: string
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          academy_snapshot?: Json
          auth_state?: Json
          config?: Json
          connected_at?: string | null
          created_at?: string
          disconnected_at?: string | null
          gym_code?: string | null
          id?: string
          last_sync_at?: string | null
          last_sync_message?: string | null
          last_sync_status?: string | null
          owner_id?: string
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      dojo_corporate_sync_logs: {
        Row: {
          created_at: string
          finished_at: string | null
          id: string
          items_failed: number
          items_processed: number
          items_updated: number
          kind: string
          message: string | null
          owner_id: string
          payload: Json
          provider: string
          started_at: string
          status: string
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          id?: string
          items_failed?: number
          items_processed?: number
          items_updated?: number
          kind: string
          message?: string | null
          owner_id: string
          payload?: Json
          provider: string
          started_at?: string
          status: string
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          id?: string
          items_failed?: number
          items_processed?: number
          items_updated?: number
          kind?: string
          message?: string | null
          owner_id?: string
          payload?: Json
          provider?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      dojo_detected_faces: {
        Row: {
          box_json: Json | null
          class_photo_id: string
          confidence: number | null
          created_at: string | null
          face_thumbnail_url: string | null
          id: string
          owner_id: string
          status: Database["public"]["Enums"]["face_detection_status"] | null
          student_id: string | null
        }
        Insert: {
          box_json?: Json | null
          class_photo_id: string
          confidence?: number | null
          created_at?: string | null
          face_thumbnail_url?: string | null
          id?: string
          owner_id: string
          status?: Database["public"]["Enums"]["face_detection_status"] | null
          student_id?: string | null
        }
        Update: {
          box_json?: Json | null
          class_photo_id?: string
          confidence?: number | null
          created_at?: string | null
          face_thumbnail_url?: string | null
          id?: string
          owner_id?: string
          status?: Database["public"]["Enums"]["face_detection_status"] | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dojo_detected_faces_class_photo_id_fkey"
            columns: ["class_photo_id"]
            isOneToOne: false
            referencedRelation: "dojo_class_photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_detected_faces_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_enrollments: {
        Row: {
          asaas_subscription_id: string | null
          billing_type: string | null
          cancelled_at: string | null
          created_at: string
          custom_amount: number | null
          custom_days: number | null
          due_day: number
          end_date: string | null
          frequency: string
          id: string
          installments_generated: number
          installments_total: number | null
          last_run_at: string | null
          next_run_at: string | null
          notes: string | null
          owner_id: string
          paused_from: string | null
          paused_until: string | null
          payment_method_code: string | null
          plan_id: string
          start_date: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          asaas_subscription_id?: string | null
          billing_type?: string | null
          cancelled_at?: string | null
          created_at?: string
          custom_amount?: number | null
          custom_days?: number | null
          due_day?: number
          end_date?: string | null
          frequency?: string
          id?: string
          installments_generated?: number
          installments_total?: number | null
          last_run_at?: string | null
          next_run_at?: string | null
          notes?: string | null
          owner_id: string
          paused_from?: string | null
          paused_until?: string | null
          payment_method_code?: string | null
          plan_id: string
          start_date?: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          asaas_subscription_id?: string | null
          billing_type?: string | null
          cancelled_at?: string | null
          created_at?: string
          custom_amount?: number | null
          custom_days?: number | null
          due_day?: number
          end_date?: string | null
          frequency?: string
          id?: string
          installments_generated?: number
          installments_total?: number | null
          last_run_at?: string | null
          next_run_at?: string | null
          notes?: string | null
          owner_id?: string
          paused_from?: string | null
          paused_until?: string | null
          payment_method_code?: string | null
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
          team_payment_id: string | null
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
          team_payment_id?: string | null
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
          team_payment_id?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_expenses_team_payment_id_fkey"
            columns: ["team_payment_id"]
            isOneToOne: false
            referencedRelation: "dojo_team_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_expenses_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "dojo_units"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_fight_video_notes: {
        Row: {
          category: string | null
          created_at: string
          id: string
          note: string
          owner_id: string
          timestamp_seconds: number
          title: string | null
          updated_at: string
          video_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          note: string
          owner_id: string
          timestamp_seconds?: number
          title?: string | null
          updated_at?: string
          video_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          note?: string
          owner_id?: string
          timestamp_seconds?: number
          title?: string | null
          updated_at?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_fight_video_notes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "dojo_fight_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_fight_videos: {
        Row: {
          content_type: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          event_name: string | null
          id: string
          opponent: string | null
          owner_id: string
          size_bytes: number | null
          storage_path: string
          student_id: string
          title: string
          updated_at: string
          video_date: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          event_name?: string | null
          id?: string
          opponent?: string | null
          owner_id: string
          size_bytes?: number | null
          storage_path: string
          student_id: string
          title: string
          updated_at?: string
          video_date?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          event_name?: string | null
          id?: string
          opponent?: string | null
          owner_id?: string
          size_bytes?: number | null
          storage_path?: string
          student_id?: string
          title?: string
          updated_at?: string
          video_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dojo_fight_videos_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_gateway_history: {
        Row: {
          action: string
          actor_email: string | null
          actor_user_id: string | null
          created_at: string
          details: Json
          id: string
          owner_id: string
          provider: string
          reason: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          owner_id: string
          provider: string
          reason?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          owner_id?: string
          provider?: string
          reason?: string | null
        }
        Relationships: []
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
          price_by_belt: Json
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
          price_by_belt?: Json
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
          price_by_belt?: Json
          system?: string
          updated_at?: string
        }
        Relationships: []
      }
      dojo_graduations: {
        Row: {
          applied_at: string | null
          belt_id: string
          created_at: string
          degree: number
          evaluator: string | null
          fee_amount: number | null
          graduation_date: string
          id: string
          invoice_id: string | null
          notes: string | null
          owner_id: string
          student_id: string
          unit_id: string | null
        }
        Insert: {
          applied_at?: string | null
          belt_id: string
          created_at?: string
          degree?: number
          evaluator?: string | null
          fee_amount?: number | null
          graduation_date?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          owner_id: string
          student_id: string
          unit_id?: string | null
        }
        Update: {
          applied_at?: string | null
          belt_id?: string
          created_at?: string
          degree?: number
          evaluator?: string | null
          fee_amount?: number | null
          graduation_date?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          owner_id?: string
          student_id?: string
          unit_id?: string | null
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
            foreignKeyName: "dojo_graduations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "dojo_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_graduations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_graduations_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "dojo_units"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_invoice_reminders: {
        Row: {
          channel: string
          created_at: string
          error_message: string | null
          id: string
          invoice_id: string
          message_id: string | null
          offset_days: number
          owner_id: string
          sent_at: string
          status: string
        }
        Insert: {
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          invoice_id: string
          message_id?: string | null
          offset_days: number
          owner_id: string
          sent_at?: string
          status?: string
        }
        Update: {
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          invoice_id?: string
          message_id?: string | null
          offset_days?: number
          owner_id?: string
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_invoice_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "dojo_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_invoices: {
        Row: {
          affiliate_id: string | null
          amount: number
          asaas_charge_id: string | null
          asaas_invoice_url: string | null
          asaas_pix_copypaste: string | null
          asaas_pix_qrcode: string | null
          asaas_subscription_id: string | null
          created_at: string
          description: string | null
          due_date: string
          enrollment_id: string | null
          fees_breakdown: Json | null
          gateway_fee_amount: number | null
          gross_amount: number | null
          id: string
          method: string | null
          net_amount: number | null
          owner_id: string
          paid_at: string | null
          payment_id: string | null
          payment_link: string | null
          payment_provider: string | null
          platform_fee_amount: number | null
          provider: string | null
          source: string | null
          split_config: Json | null
          status: string
          student_id: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          affiliate_id?: string | null
          amount: number
          asaas_charge_id?: string | null
          asaas_invoice_url?: string | null
          asaas_pix_copypaste?: string | null
          asaas_pix_qrcode?: string | null
          asaas_subscription_id?: string | null
          created_at?: string
          description?: string | null
          due_date: string
          enrollment_id?: string | null
          fees_breakdown?: Json | null
          gateway_fee_amount?: number | null
          gross_amount?: number | null
          id?: string
          method?: string | null
          net_amount?: number | null
          owner_id: string
          paid_at?: string | null
          payment_id?: string | null
          payment_link?: string | null
          payment_provider?: string | null
          platform_fee_amount?: number | null
          provider?: string | null
          source?: string | null
          split_config?: Json | null
          status?: string
          student_id?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          affiliate_id?: string | null
          amount?: number
          asaas_charge_id?: string | null
          asaas_invoice_url?: string | null
          asaas_pix_copypaste?: string | null
          asaas_pix_qrcode?: string | null
          asaas_subscription_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          enrollment_id?: string | null
          fees_breakdown?: Json | null
          gateway_fee_amount?: number | null
          gross_amount?: number | null
          id?: string
          method?: string | null
          net_amount?: number | null
          owner_id?: string
          paid_at?: string | null
          payment_id?: string | null
          payment_link?: string | null
          payment_provider?: string | null
          platform_fee_amount?: number | null
          provider?: string | null
          source?: string | null
          split_config?: Json | null
          status?: string
          student_id?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_invoices_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "dojo_affiliates"
            referencedColumns: ["id"]
          },
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
      dojo_lesson_content_library: {
        Row: {
          avg_time_min: number | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_favorite: boolean
          last_used_at: string | null
          modality: string | null
          name: string
          owner_id: string
          pdf_url: string | null
          recommended_age: string | null
          recommended_belt: string | null
          tags: string[] | null
          technical_level: string | null
          updated_at: string
          usage_count: number
          video_url: string | null
        }
        Insert: {
          avg_time_min?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_favorite?: boolean
          last_used_at?: string | null
          modality?: string | null
          name: string
          owner_id: string
          pdf_url?: string | null
          recommended_age?: string | null
          recommended_belt?: string | null
          tags?: string[] | null
          technical_level?: string | null
          updated_at?: string
          usage_count?: number
          video_url?: string | null
        }
        Update: {
          avg_time_min?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_favorite?: boolean
          last_used_at?: string | null
          modality?: string | null
          name?: string
          owner_id?: string
          pdf_url?: string | null
          recommended_age?: string | null
          recommended_belt?: string | null
          tags?: string[] | null
          technical_level?: string | null
          updated_at?: string
          usage_count?: number
          video_url?: string | null
        }
        Relationships: []
      }
      dojo_lesson_history: {
        Row: {
          applied_content: Json | null
          class_id: string | null
          created_at: string
          date: string
          duration_min: number | null
          id: string
          lesson_plan_id: string | null
          media_urls: string[] | null
          notes: string | null
          owner_id: string
          students_count: number | null
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          applied_content?: Json | null
          class_id?: string | null
          created_at?: string
          date: string
          duration_min?: number | null
          id?: string
          lesson_plan_id?: string | null
          media_urls?: string[] | null
          notes?: string | null
          owner_id: string
          students_count?: number | null
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          applied_content?: Json | null
          class_id?: string | null
          created_at?: string
          date?: string
          duration_min?: number | null
          id?: string
          lesson_plan_id?: string | null
          media_urls?: string[] | null
          notes?: string | null
          owner_id?: string
          students_count?: number | null
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_lesson_history_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "dojo_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_lesson_history_lesson_plan_id_fkey"
            columns: ["lesson_plan_id"]
            isOneToOne: false
            referencedRelation: "dojo_lesson_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_lesson_history_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "dojo_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_lesson_plans: {
        Row: {
          age_range: string | null
          belt_id: string | null
          blocks: Json
          category: string | null
          class_id: string | null
          color: string | null
          created_at: string
          created_by: string | null
          date: string
          duration_min: number | null
          end_time: string | null
          id: string
          location: string | null
          modality: string | null
          notes: string | null
          objectives: string | null
          owner_id: string
          start_time: string | null
          status: string
          teacher_id: string | null
          template_id: string | null
          title: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          age_range?: string | null
          belt_id?: string | null
          blocks?: Json
          category?: string | null
          class_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          duration_min?: number | null
          end_time?: string | null
          id?: string
          location?: string | null
          modality?: string | null
          notes?: string | null
          objectives?: string | null
          owner_id: string
          start_time?: string | null
          status?: string
          teacher_id?: string | null
          template_id?: string | null
          title: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          age_range?: string | null
          belt_id?: string | null
          blocks?: Json
          category?: string | null
          class_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          duration_min?: number | null
          end_time?: string | null
          id?: string
          location?: string | null
          modality?: string | null
          notes?: string | null
          objectives?: string | null
          owner_id?: string
          start_time?: string | null
          status?: string
          teacher_id?: string | null
          template_id?: string | null
          title?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_lesson_plans_belt_id_fkey"
            columns: ["belt_id"]
            isOneToOne: false
            referencedRelation: "dojo_belts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_lesson_plans_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "dojo_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_lesson_plans_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "dojo_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_lesson_plans_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "dojo_units"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_lesson_templates: {
        Row: {
          age_range: string | null
          blocks: Json
          category: string | null
          color: string | null
          created_at: string
          description: string | null
          duration_min: number | null
          id: string
          modality: string | null
          name: string
          objectives: string | null
          owner_id: string
          updated_at: string
        }
        Insert: {
          age_range?: string | null
          blocks?: Json
          category?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          duration_min?: number | null
          id?: string
          modality?: string | null
          name: string
          objectives?: string | null
          owner_id: string
          updated_at?: string
        }
        Update: {
          age_range?: string | null
          blocks?: Json
          category?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          duration_min?: number | null
          id?: string
          modality?: string | null
          name?: string
          objectives?: string | null
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      dojo_onboarding_documents: {
        Row: {
          created_at: string
          doc_type: string
          file_path: string
          id: string
          mime_type: string | null
          owner_id: string
          size_bytes: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          doc_type: string
          file_path: string
          id?: string
          mime_type?: string | null
          owner_id: string
          size_bytes?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          owner_id?: string
          size_bytes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      dojo_owner_push_subscriptions: {
        Row: {
          auth: string
          categories: Json
          created_at: string
          device_label: string | null
          endpoint: string
          id: string
          last_error: string | null
          last_success_at: string | null
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          categories?: Json
          created_at?: string
          device_label?: string | null
          endpoint: string
          id?: string
          last_error?: string | null
          last_success_at?: string | null
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          categories?: Json
          created_at?: string
          device_label?: string | null
          endpoint?: string
          id?: string
          last_error?: string | null
          last_success_at?: string | null
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
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
      dojo_payment_settings: {
        Row: {
          boleto_fee_fixed: number
          boleto_fee_percent: number
          card_extra_per_inst: number
          card_inst_fixed: number
          card_inst_percent: number
          card_upfront_fixed: number
          card_upfront_percent: number
          created_at: string
          currency: string
          default_gateway: string
          extras: Json
          invoice_address: string | null
          invoice_business_name: string | null
          invoice_document: string | null
          invoice_email: string | null
          invoice_footer_note: string | null
          invoice_logo_url: string | null
          invoice_phone: string | null
          owner_id: string
          pix_fee_fixed: number
          pix_fee_percent: number
          platform_fee_fixed: number
          platform_fee_percent: number
          updated_at: string
        }
        Insert: {
          boleto_fee_fixed?: number
          boleto_fee_percent?: number
          card_extra_per_inst?: number
          card_inst_fixed?: number
          card_inst_percent?: number
          card_upfront_fixed?: number
          card_upfront_percent?: number
          created_at?: string
          currency?: string
          default_gateway?: string
          extras?: Json
          invoice_address?: string | null
          invoice_business_name?: string | null
          invoice_document?: string | null
          invoice_email?: string | null
          invoice_footer_note?: string | null
          invoice_logo_url?: string | null
          invoice_phone?: string | null
          owner_id: string
          pix_fee_fixed?: number
          pix_fee_percent?: number
          platform_fee_fixed?: number
          platform_fee_percent?: number
          updated_at?: string
        }
        Update: {
          boleto_fee_fixed?: number
          boleto_fee_percent?: number
          card_extra_per_inst?: number
          card_inst_fixed?: number
          card_inst_percent?: number
          card_upfront_fixed?: number
          card_upfront_percent?: number
          created_at?: string
          currency?: string
          default_gateway?: string
          extras?: Json
          invoice_address?: string | null
          invoice_business_name?: string | null
          invoice_document?: string | null
          invoice_email?: string | null
          invoice_footer_note?: string | null
          invoice_logo_url?: string | null
          invoice_phone?: string | null
          owner_id?: string
          pix_fee_fixed?: number
          pix_fee_percent?: number
          platform_fee_fixed?: number
          platform_fee_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      dojo_pix_keys: {
        Row: {
          active: boolean
          created_at: string
          holder_document: string | null
          holder_name: string
          id: string
          is_default: boolean
          key_type: string
          key_value: string
          metadata: Json
          owner_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          holder_document?: string | null
          holder_name: string
          id?: string
          is_default?: boolean
          key_type: string
          key_value: string
          metadata?: Json
          owner_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          holder_document?: string | null
          holder_name?: string
          id?: string
          is_default?: boolean
          key_type?: string
          key_value?: string
          metadata?: Json
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      dojo_plans: {
        Row: {
          active: boolean
          amount: number
          created_at: string
          custom_months: number | null
          description: string | null
          duration_days: number
          enrollment_fee: number
          frequency: string
          id: string
          installments: number
          name: string
          owner_id: string
          payment_methods: Json
          rules: Json
          sort_order: number
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount: number
          created_at?: string
          custom_months?: number | null
          description?: string | null
          duration_days?: number
          enrollment_fee?: number
          frequency?: string
          id?: string
          installments?: number
          name: string
          owner_id: string
          payment_methods?: Json
          rules?: Json
          sort_order?: number
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount?: number
          created_at?: string
          custom_months?: number | null
          description?: string | null
          duration_days?: number
          enrollment_fee?: number
          frequency?: string
          id?: string
          installments?: number
          name?: string
          owner_id?: string
          payment_methods?: Json
          rules?: Json
          sort_order?: number
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
      dojo_sale_items: {
        Row: {
          created_at: string
          id: string
          kind: string
          name: string
          product_id: string | null
          quantity: number
          sale_id: string
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          name: string
          product_id?: string | null
          quantity?: number
          sale_id: string
          subtotal?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          name?: string
          product_id?: string | null
          quantity?: number
          sale_id?: string
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "dojo_sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "dojo_sales_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "dojo_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_sales: {
        Row: {
          created_at: string
          customer_document: string | null
          customer_name: string | null
          discount: number
          id: string
          invoice_id: string | null
          notes: string | null
          owner_id: string
          payment_link: string | null
          payment_method: string
          sold_at: string
          status: string
          student_id: string | null
          subtotal: number
          total: number
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_document?: string | null
          customer_name?: string | null
          discount?: number
          id?: string
          invoice_id?: string | null
          notes?: string | null
          owner_id: string
          payment_link?: string | null
          payment_method?: string
          sold_at?: string
          status?: string
          student_id?: string | null
          subtotal?: number
          total?: number
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_document?: string | null
          customer_name?: string | null
          discount?: number
          id?: string
          invoice_id?: string | null
          notes?: string | null
          owner_id?: string
          payment_link?: string | null
          payment_method?: string
          sold_at?: string
          status?: string
          student_id?: string | null
          subtotal?: number
          total?: number
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_sales_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "dojo_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_sales_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_sales_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "dojo_units"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_sales_products: {
        Row: {
          active: boolean
          cost: number | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          kind: string
          name: string
          owner_id: string
          price: number
          sku: string | null
          stock: number | null
          track_stock: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          kind?: string
          name: string
          owner_id: string
          price?: number
          sku?: string | null
          stock?: number | null
          track_stock?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          kind?: string
          name?: string
          owner_id?: string
          price?: number
          sku?: string | null
          stock?: number | null
          track_stock?: boolean
          updated_at?: string
        }
        Relationships: []
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
      dojo_split_config: {
        Row: {
          active: boolean
          amt_fixed_fee: number
          amt_percent: number
          created_at: string
          id: string
          min_withdrawal: number
          notes: string | null
          owner_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          amt_fixed_fee?: number
          amt_percent?: number
          created_at?: string
          id?: string
          min_withdrawal?: number
          notes?: string | null
          owner_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          amt_fixed_fee?: number
          amt_percent?: number
          created_at?: string
          id?: string
          min_withdrawal?: number
          notes?: string | null
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      dojo_split_transactions: {
        Row: {
          amt_fee_amount: number
          amt_fixed_applied: number | null
          amt_percent_applied: number | null
          created_at: string
          dojo_net_amount: number
          gross_amount: number
          id: string
          invoice_id: string | null
          mp_fee_amount: number
          mp_payment_id: string
          operation_type: string
          owner_id: string
          paid_at: string | null
          raw: Json | null
          status: string
          student_id: string | null
          updated_at: string
        }
        Insert: {
          amt_fee_amount?: number
          amt_fixed_applied?: number | null
          amt_percent_applied?: number | null
          created_at?: string
          dojo_net_amount: number
          gross_amount: number
          id?: string
          invoice_id?: string | null
          mp_fee_amount?: number
          mp_payment_id: string
          operation_type?: string
          owner_id: string
          paid_at?: string | null
          raw?: Json | null
          status?: string
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          amt_fee_amount?: number
          amt_fixed_applied?: number | null
          amt_percent_applied?: number | null
          created_at?: string
          dojo_net_amount?: number
          gross_amount?: number
          id?: string
          invoice_id?: string | null
          mp_fee_amount?: number
          mp_payment_id?: string
          operation_type?: string
          owner_id?: string
          paid_at?: string | null
          raw?: Json | null
          status?: string
          student_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dojo_staff_accounts: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          last_login_at: string | null
          member_id: string
          owner_id: string
          role: string | null
          status: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          member_id: string
          owner_id: string
          role?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          member_id?: string
          owner_id?: string
          role?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_staff_accounts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "dojo_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_store_cart_items: {
        Row: {
          billable_to_student: boolean
          cart_id: string
          created_at: string
          customization: Json | null
          id: string
          owner_id: string
          product_id: string
          quantity: number
          student_id: string | null
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          billable_to_student?: boolean
          cart_id: string
          created_at?: string
          customization?: Json | null
          id?: string
          owner_id: string
          product_id: string
          quantity?: number
          student_id?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          billable_to_student?: boolean
          cart_id?: string
          created_at?: string
          customization?: Json | null
          id?: string
          owner_id?: string
          product_id?: string
          quantity?: number
          student_id?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dojo_store_cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "dojo_store_carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_store_cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_store_cart_items_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_store_cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "store_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_store_carts: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      dojo_store_favorite_lists: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      dojo_store_favorites: {
        Row: {
          created_at: string
          id: string
          list_id: string | null
          owner_id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          list_id?: string | null
          owner_id: string
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          list_id?: string | null
          owner_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_store_favorites_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "dojo_store_favorite_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_store_favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_store_order_items: {
        Row: {
          billable_to_student: boolean
          created_at: string
          customization: Json | null
          id: string
          image_url: string | null
          order_id: string
          owner_id: string
          product_id: string | null
          product_name: string
          quantity: number
          student_id: string | null
          total_price: number
          unit_price: number
          unit_retail_price: number
          variant_id: string | null
          variant_label: string | null
        }
        Insert: {
          billable_to_student?: boolean
          created_at?: string
          customization?: Json | null
          id?: string
          image_url?: string | null
          order_id: string
          owner_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          student_id?: string | null
          total_price: number
          unit_price: number
          unit_retail_price: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Update: {
          billable_to_student?: boolean
          created_at?: string
          customization?: Json | null
          id?: string
          image_url?: string | null
          order_id?: string
          owner_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          student_id?: string | null
          total_price?: number
          unit_price?: number
          unit_retail_price?: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dojo_store_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "dojo_store_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_store_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_store_order_items_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_store_order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "store_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_store_order_timeline: {
        Row: {
          created_at: string
          event: string
          id: string
          message: string | null
          metadata: Json | null
          order_id: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          message?: string | null
          metadata?: Json | null
          order_id: string
          owner_id: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          order_id?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_store_order_timeline_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "dojo_store_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_store_orders: {
        Row: {
          created_at: string
          discount: number
          id: string
          invoice_url: string | null
          is_wholesale: boolean
          metadata: Json | null
          order_number: string | null
          origin: string
          owner_id: string
          payment_status: string
          retail_total: number
          savings: number
          shipping_cost: number
          status: string
          store_order_id: string | null
          subtotal: number
          total: number
          tracking_code: string | null
          updated_at: string
          wholesale_total: number
        }
        Insert: {
          created_at?: string
          discount?: number
          id?: string
          invoice_url?: string | null
          is_wholesale?: boolean
          metadata?: Json | null
          order_number?: string | null
          origin?: string
          owner_id: string
          payment_status?: string
          retail_total?: number
          savings?: number
          shipping_cost?: number
          status?: string
          store_order_id?: string | null
          subtotal?: number
          total?: number
          tracking_code?: string | null
          updated_at?: string
          wholesale_total?: number
        }
        Update: {
          created_at?: string
          discount?: number
          id?: string
          invoice_url?: string | null
          is_wholesale?: boolean
          metadata?: Json | null
          order_number?: string | null
          origin?: string
          owner_id?: string
          payment_status?: string
          retail_total?: number
          savings?: number
          shipping_cost?: number
          status?: string
          store_order_id?: string | null
          subtotal?: number
          total?: number
          tracking_code?: string | null
          updated_at?: string
          wholesale_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "dojo_store_orders_store_order_id_fkey"
            columns: ["store_order_id"]
            isOneToOne: false
            referencedRelation: "store_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_store_settings: {
        Row: {
          created_at: string
          owner_id: string
          updated_at: string
          wholesale_min_order_value: number
          wholesale_min_qty_per_product: number
        }
        Insert: {
          created_at?: string
          owner_id: string
          updated_at?: string
          wholesale_min_order_value?: number
          wholesale_min_qty_per_product?: number
        }
        Update: {
          created_at?: string
          owner_id?: string
          updated_at?: string
          wholesale_min_order_value?: number
          wholesale_min_qty_per_product?: number
        }
        Relationships: []
      }
      dojo_store_student_deliveries: {
        Row: {
          created_at: string
          delivered_at: string | null
          id: string
          notes: string | null
          order_item_id: string | null
          owner_id: string
          product_id: string | null
          product_name: string
          quantity: number
          student_id: string
          variant_label: string | null
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          id?: string
          notes?: string | null
          order_item_id?: string | null
          owner_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          student_id: string
          variant_label?: string | null
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          id?: string
          notes?: string | null
          order_item_id?: string | null
          owner_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          student_id?: string
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dojo_store_student_deliveries_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "dojo_store_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_store_student_deliveries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_store_student_deliveries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_store_sync_logs: {
        Row: {
          categories_count: number | null
          error: string | null
          finished_at: string | null
          id: string
          metadata: Json | null
          owner_id: string
          products_count: number | null
          started_at: string
          status: string
          updated_count: number | null
        }
        Insert: {
          categories_count?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json | null
          owner_id: string
          products_count?: number | null
          started_at?: string
          status?: string
          updated_count?: number | null
        }
        Update: {
          categories_count?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json | null
          owner_id?: string
          products_count?: number | null
          started_at?: string
          status?: string
          updated_count?: number | null
        }
        Relationships: []
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
      dojo_student_contracts: {
        Row: {
          cancelled_at: string | null
          content: string
          contract_number: string | null
          created_at: string
          due_day: number | null
          end_date: string | null
          expires_at: string | null
          footer_html: string
          header_html: string
          id: string
          issued_by: string | null
          margin_mm: number
          monthly_value: number | null
          notes: string | null
          owner_id: string
          page_orientation: string
          page_size: string
          payment_method: string | null
          pdf_url: string | null
          plan_name: string | null
          sent_at: string | null
          show_page_numbers: boolean
          signed_at: string | null
          start_date: string | null
          status: string
          student_id: string
          template_id: string | null
          template_version: number | null
          title: string
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          content?: string
          contract_number?: string | null
          created_at?: string
          due_day?: number | null
          end_date?: string | null
          expires_at?: string | null
          footer_html?: string
          header_html?: string
          id?: string
          issued_by?: string | null
          margin_mm?: number
          monthly_value?: number | null
          notes?: string | null
          owner_id: string
          page_orientation?: string
          page_size?: string
          payment_method?: string | null
          pdf_url?: string | null
          plan_name?: string | null
          sent_at?: string | null
          show_page_numbers?: boolean
          signed_at?: string | null
          start_date?: string | null
          status?: string
          student_id: string
          template_id?: string | null
          template_version?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          content?: string
          contract_number?: string | null
          created_at?: string
          due_day?: number | null
          end_date?: string | null
          expires_at?: string | null
          footer_html?: string
          header_html?: string
          id?: string
          issued_by?: string | null
          margin_mm?: number
          monthly_value?: number | null
          notes?: string | null
          owner_id?: string
          page_orientation?: string
          page_size?: string
          payment_method?: string | null
          pdf_url?: string | null
          plan_name?: string | null
          sent_at?: string | null
          show_page_numbers?: boolean
          signed_at?: string | null
          start_date?: string | null
          status?: string
          student_id?: string
          template_id?: string | null
          template_version?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_student_contracts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_student_contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "dojo_contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_student_notification_prefs: {
        Row: {
          categories: Json
          created_at: string
          extras: Json
          owner_id: string
          updated_at: string
        }
        Insert: {
          categories?: Json
          created_at?: string
          extras?: Json
          owner_id: string
          updated_at?: string
        }
        Update: {
          categories?: Json
          created_at?: string
          extras?: Json
          owner_id?: string
          updated_at?: string
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
      dojo_student_reference_photos: {
        Row: {
          created_at: string | null
          face_embedding: Json | null
          id: string
          owner_id: string
          photo_url: string
          student_id: string
        }
        Insert: {
          created_at?: string | null
          face_embedding?: Json | null
          id?: string
          owner_id: string
          photo_url: string
          student_id: string
        }
        Update: {
          created_at?: string | null
          face_embedding?: Json | null
          id?: string
          owner_id?: string
          photo_url?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_student_reference_photos_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_student_technical_scores: {
        Row: {
          assessed_at: string
          assessor: string | null
          created_at: string
          fundamental_id: string
          id: string
          notes: string | null
          owner_id: string
          score: number
          student_id: string
          updated_at: string
        }
        Insert: {
          assessed_at?: string
          assessor?: string | null
          created_at?: string
          fundamental_id: string
          id?: string
          notes?: string | null
          owner_id: string
          score?: number
          student_id: string
          updated_at?: string
        }
        Update: {
          assessed_at?: string
          assessor?: string | null
          created_at?: string
          fundamental_id?: string
          id?: string
          notes?: string | null
          owner_id?: string
          score?: number
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_student_technical_scores_fundamental_id_fkey"
            columns: ["fundamental_id"]
            isOneToOne: false
            referencedRelation: "dojo_technical_fundamentals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_student_technical_scores_student_id_fkey"
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
          asaas_customer_id: string | null
          birth_date: string | null
          blood_type: string | null
          cancelled_at: string | null
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
          facial_recognition_consent: boolean | null
          facial_recognition_consent_at: string | null
          frozen_since: string | null
          frozen_until: string | null
          full_name: string
          gender: string | null
          graduation_criteria_mode: string | null
          graduation_min_classes: number | null
          graduation_min_months: number | null
          guardian_cpf: string | null
          guardian_name: string | null
          guardian_phone: string | null
          guardian_rg: string | null
          has_medical_clearance: boolean
          health_insurance: string | null
          id: string
          image_rights_consent: boolean
          lgpd_consent: boolean
          lgpd_consent_at: string | null
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
          asaas_customer_id?: string | null
          birth_date?: string | null
          blood_type?: string | null
          cancelled_at?: string | null
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
          facial_recognition_consent?: boolean | null
          facial_recognition_consent_at?: string | null
          frozen_since?: string | null
          frozen_until?: string | null
          full_name: string
          gender?: string | null
          graduation_criteria_mode?: string | null
          graduation_min_classes?: number | null
          graduation_min_months?: number | null
          guardian_cpf?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_rg?: string | null
          has_medical_clearance?: boolean
          health_insurance?: string | null
          id?: string
          image_rights_consent?: boolean
          lgpd_consent?: boolean
          lgpd_consent_at?: string | null
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
          asaas_customer_id?: string | null
          birth_date?: string | null
          blood_type?: string | null
          cancelled_at?: string | null
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
          facial_recognition_consent?: boolean | null
          facial_recognition_consent_at?: string | null
          frozen_since?: string | null
          frozen_until?: string | null
          full_name?: string
          gender?: string | null
          graduation_criteria_mode?: string | null
          graduation_min_classes?: number | null
          graduation_min_months?: number | null
          guardian_cpf?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_rg?: string | null
          has_medical_clearance?: boolean
          health_insurance?: string | null
          id?: string
          image_rights_consent?: boolean
          lgpd_consent?: boolean
          lgpd_consent_at?: string | null
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
          current_payment_status: string | null
          current_period_end: string | null
          id: string
          last_copy_paste: string | null
          last_event: Json | null
          last_notification_sent_at: string | null
          last_payment_id: string | null
          last_qr_code: string | null
          mp_pix_id: string | null
          mp_pix_qr_code: string | null
          mp_pix_qr_code_base64: string | null
          mp_pix_ticket_url: string | null
          mp_preapproval_id: string | null
          next_due_date: string | null
          owner_id: string
          payment_method: string | null
          plan_amount: number
          status: string
          subscription_type: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          current_payment_status?: string | null
          current_period_end?: string | null
          id?: string
          last_copy_paste?: string | null
          last_event?: Json | null
          last_notification_sent_at?: string | null
          last_payment_id?: string | null
          last_qr_code?: string | null
          mp_pix_id?: string | null
          mp_pix_qr_code?: string | null
          mp_pix_qr_code_base64?: string | null
          mp_pix_ticket_url?: string | null
          mp_preapproval_id?: string | null
          next_due_date?: string | null
          owner_id: string
          payment_method?: string | null
          plan_amount?: number
          status?: string
          subscription_type?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          current_payment_status?: string | null
          current_period_end?: string | null
          id?: string
          last_copy_paste?: string | null
          last_event?: Json | null
          last_notification_sent_at?: string | null
          last_payment_id?: string | null
          last_qr_code?: string | null
          mp_pix_id?: string | null
          mp_pix_qr_code?: string | null
          mp_pix_qr_code_base64?: string | null
          mp_pix_ticket_url?: string | null
          mp_preapproval_id?: string | null
          next_due_date?: string | null
          owner_id?: string
          payment_method?: string | null
          plan_amount?: number
          status?: string
          subscription_type?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dojo_support_messages: {
        Row: {
          author_id: string
          author_role: string
          body: string
          created_at: string
          id: string
          ticket_id: string
        }
        Insert: {
          author_id: string
          author_role: string
          body: string
          created_at?: string
          id?: string
          ticket_id: string
        }
        Update: {
          author_id?: string
          author_role?: string
          body?: string
          created_at?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "dojo_support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_support_tickets: {
        Row: {
          category: string
          created_at: string
          id: string
          last_message_at: string
          owner_id: string
          priority: string
          status: string
          subject: string
          unread_by_admin: number
          unread_by_client: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          last_message_at?: string
          owner_id: string
          priority?: string
          status?: string
          subject: string
          unread_by_admin?: number
          unread_by_client?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          last_message_at?: string
          owner_id?: string
          priority?: string
          status?: string
          subject?: string
          unread_by_admin?: number
          unread_by_client?: number
          updated_at?: string
        }
        Relationships: []
      }
      dojo_team_attendance: {
        Row: {
          break_minutes: number
          clock_in: string | null
          clock_out: string | null
          created_at: string
          hours_worked: number | null
          id: string
          justification: string | null
          member_id: string
          owner_id: string
          status: string
          updated_at: string
          work_date: string
        }
        Insert: {
          break_minutes?: number
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          hours_worked?: number | null
          id?: string
          justification?: string | null
          member_id: string
          owner_id: string
          status?: string
          updated_at?: string
          work_date: string
        }
        Update: {
          break_minutes?: number
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          hours_worked?: number | null
          id?: string
          justification?: string | null
          member_id?: string
          owner_id?: string
          status?: string
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_team_attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "dojo_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_team_contracts: {
        Row: {
          cancelled_at: string | null
          compensation_type: string | null
          compensation_value: number | null
          content: string
          contract_number: string | null
          created_at: string
          end_date: string | null
          expires_at: string | null
          footer_html: string
          header_html: string
          id: string
          issued_by: string | null
          margin_mm: number
          notes: string | null
          owner_id: string
          page_orientation: string
          page_size: string
          pdf_url: string | null
          role: string | null
          sent_at: string | null
          show_page_numbers: boolean
          signed_at: string | null
          start_date: string | null
          status: string
          team_member_id: string
          template_id: string | null
          template_version: number | null
          title: string
          updated_at: string
          weekly_hours: number | null
        }
        Insert: {
          cancelled_at?: string | null
          compensation_type?: string | null
          compensation_value?: number | null
          content?: string
          contract_number?: string | null
          created_at?: string
          end_date?: string | null
          expires_at?: string | null
          footer_html?: string
          header_html?: string
          id?: string
          issued_by?: string | null
          margin_mm?: number
          notes?: string | null
          owner_id: string
          page_orientation?: string
          page_size?: string
          pdf_url?: string | null
          role?: string | null
          sent_at?: string | null
          show_page_numbers?: boolean
          signed_at?: string | null
          start_date?: string | null
          status?: string
          team_member_id: string
          template_id?: string | null
          template_version?: number | null
          title: string
          updated_at?: string
          weekly_hours?: number | null
        }
        Update: {
          cancelled_at?: string | null
          compensation_type?: string | null
          compensation_value?: number | null
          content?: string
          contract_number?: string | null
          created_at?: string
          end_date?: string | null
          expires_at?: string | null
          footer_html?: string
          header_html?: string
          id?: string
          issued_by?: string | null
          margin_mm?: number
          notes?: string | null
          owner_id?: string
          page_orientation?: string
          page_size?: string
          pdf_url?: string | null
          role?: string | null
          sent_at?: string | null
          show_page_numbers?: boolean
          signed_at?: string | null
          start_date?: string | null
          status?: string
          team_member_id?: string
          template_id?: string | null
          template_version?: number | null
          title?: string
          updated_at?: string
          weekly_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dojo_team_contracts_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "dojo_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_team_contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "dojo_contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_team_documents: {
        Row: {
          archived_at: string | null
          created_at: string
          file_size: number | null
          file_url: string
          id: string
          kind: string
          member_id: string
          mime_type: string | null
          notes: string | null
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          file_size?: number | null
          file_url: string
          id?: string
          kind?: string
          member_id: string
          mime_type?: string | null
          notes?: string | null
          owner_id: string
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          file_size?: number | null
          file_url?: string
          id?: string
          kind?: string
          member_id?: string
          mime_type?: string | null
          notes?: string | null
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_team_documents_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "dojo_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_team_history: {
        Row: {
          actor_user_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          description: string
          event_type: string
          id: string
          member_id: string
          owner_id: string
        }
        Insert: {
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          description: string
          event_type: string
          id?: string
          member_id: string
          owner_id: string
        }
        Update: {
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          member_id?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_team_history_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "dojo_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_team_members: {
        Row: {
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_street: string | null
          admission_date: string | null
          belt_grade: number | null
          belt_id: string | null
          biography: string | null
          birth_date: string | null
          city: string | null
          confederation_name: string | null
          confederation_number: string | null
          cpf: string | null
          created_at: string
          education_level: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          father_name: string | null
          full_name: string
          gender: string | null
          id: string
          legacy_unit_id: string | null
          marital_status: string | null
          mini_resume: string | null
          modalities: Json
          mother_name: string | null
          nationality: string | null
          notes: string | null
          owner_id: string
          permissions: Json
          phone: string | null
          photo_url: string | null
          professional_photo_url: string | null
          professional_registry: string | null
          rg: string | null
          role: string
          specialties: string | null
          state: string | null
          status: string
          termination_date: string | null
          updated_at: string
          user_id: string | null
          whatsapp: string | null
          zip_code: string | null
        }
        Insert: {
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_street?: string | null
          admission_date?: string | null
          belt_grade?: number | null
          belt_id?: string | null
          biography?: string | null
          birth_date?: string | null
          city?: string | null
          confederation_name?: string | null
          confederation_number?: string | null
          cpf?: string | null
          created_at?: string
          education_level?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          father_name?: string | null
          full_name: string
          gender?: string | null
          id?: string
          legacy_unit_id?: string | null
          marital_status?: string | null
          mini_resume?: string | null
          modalities?: Json
          mother_name?: string | null
          nationality?: string | null
          notes?: string | null
          owner_id: string
          permissions?: Json
          phone?: string | null
          photo_url?: string | null
          professional_photo_url?: string | null
          professional_registry?: string | null
          rg?: string | null
          role?: string
          specialties?: string | null
          state?: string | null
          status?: string
          termination_date?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
          zip_code?: string | null
        }
        Update: {
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_street?: string | null
          admission_date?: string | null
          belt_grade?: number | null
          belt_id?: string | null
          biography?: string | null
          birth_date?: string | null
          city?: string | null
          confederation_name?: string | null
          confederation_number?: string | null
          cpf?: string | null
          created_at?: string
          education_level?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          father_name?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          legacy_unit_id?: string | null
          marital_status?: string | null
          mini_resume?: string | null
          modalities?: Json
          mother_name?: string | null
          nationality?: string | null
          notes?: string | null
          owner_id?: string
          permissions?: Json
          phone?: string | null
          photo_url?: string | null
          professional_photo_url?: string | null
          professional_registry?: string | null
          rg?: string | null
          role?: string
          specialties?: string | null
          state?: string | null
          status?: string
          termination_date?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dojo_team_members_belt_id_fkey"
            columns: ["belt_id"]
            isOneToOne: false
            referencedRelation: "dojo_belts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_team_members_legacy_unit_id_fkey"
            columns: ["legacy_unit_id"]
            isOneToOne: false
            referencedRelation: "dojo_units"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_team_payments: {
        Row: {
          amount: number
          classes_count: number | null
          created_at: string
          description: string | null
          due_date: string | null
          hours_worked: number | null
          id: string
          kind: string
          member_id: string
          notes: string | null
          owner_id: string
          paid_at: string | null
          payment_method: string | null
          reference_month: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          classes_count?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          hours_worked?: number | null
          id?: string
          kind?: string
          member_id: string
          notes?: string | null
          owner_id: string
          paid_at?: string | null
          payment_method?: string | null
          reference_month?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          classes_count?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          hours_worked?: number | null
          id?: string
          kind?: string
          member_id?: string
          notes?: string | null
          owner_id?: string
          paid_at?: string | null
          payment_method?: string | null
          reference_month?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_team_payments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "dojo_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_team_payroll_config: {
        Row: {
          bank_account: string | null
          bank_agency: string | null
          bank_name: string | null
          base_salary: number | null
          commission_on_enrollment: number | null
          commission_on_renewal: number | null
          commission_on_sale: number | null
          commission_percent: number | null
          created_at: string
          hourly_rate: number | null
          id: string
          member_id: string
          notes: string | null
          owner_id: string
          payment_type: string
          per_class_rate: number | null
          pix_key: string | null
          pix_key_type: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          base_salary?: number | null
          commission_on_enrollment?: number | null
          commission_on_renewal?: number | null
          commission_on_sale?: number | null
          commission_percent?: number | null
          created_at?: string
          hourly_rate?: number | null
          id?: string
          member_id: string
          notes?: string | null
          owner_id: string
          payment_type?: string
          per_class_rate?: number | null
          pix_key?: string | null
          pix_key_type?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          base_salary?: number | null
          commission_on_enrollment?: number | null
          commission_on_renewal?: number | null
          commission_on_sale?: number | null
          commission_percent?: number | null
          created_at?: string
          hourly_rate?: number | null
          id?: string
          member_id?: string
          notes?: string | null
          owner_id?: string
          payment_type?: string
          per_class_rate?: number | null
          pix_key?: string | null
          pix_key_type?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_team_payroll_config_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "dojo_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_team_signatures: {
        Row: {
          belt_label: string | null
          can_sign_certificates: boolean
          created_at: string
          display_name: string
          id: string
          member_id: string
          owner_id: string
          role_label: string | null
          signature_url: string
          updated_at: string
        }
        Insert: {
          belt_label?: string | null
          can_sign_certificates?: boolean
          created_at?: string
          display_name: string
          id?: string
          member_id: string
          owner_id: string
          role_label?: string | null
          signature_url: string
          updated_at?: string
        }
        Update: {
          belt_label?: string | null
          can_sign_certificates?: boolean
          created_at?: string
          display_name?: string
          id?: string
          member_id?: string
          owner_id?: string
          role_label?: string | null
          signature_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_team_signatures_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "dojo_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_team_substitutions: {
        Row: {
          class_id: string | null
          created_at: string
          created_by: string | null
          id: string
          metadata: Json
          occurrence_id: string | null
          original_teacher_id: string | null
          owner_id: string
          period_end: string | null
          period_start: string | null
          reason: string
          reason_detail: string | null
          scope: string
          substitute_teacher_id: string | null
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          occurrence_id?: string | null
          original_teacher_id?: string | null
          owner_id: string
          period_end?: string | null
          period_start?: string | null
          reason: string
          reason_detail?: string | null
          scope?: string
          substitute_teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          occurrence_id?: string | null
          original_teacher_id?: string | null
          owner_id?: string
          period_end?: string | null
          period_start?: string | null
          reason?: string
          reason_detail?: string | null
          scope?: string
          substitute_teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_team_substitutions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "dojo_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_team_substitutions_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "dojo_class_occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_team_substitutions_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "dojo_team_schedule_view"
            referencedColumns: ["occurrence_id"]
          },
          {
            foreignKeyName: "dojo_team_substitutions_original_teacher_id_fkey"
            columns: ["original_teacher_id"]
            isOneToOne: false
            referencedRelation: "dojo_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_team_substitutions_substitute_teacher_id_fkey"
            columns: ["substitute_teacher_id"]
            isOneToOne: false
            referencedRelation: "dojo_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_technical_fundamentals: {
        Row: {
          archived: boolean
          created_at: string
          description: string | null
          id: string
          modality: string
          name: string
          order_index: number
          owner_id: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          description?: string | null
          id?: string
          modality: string
          name: string
          order_index?: number
          owner_id: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          description?: string | null
          id?: string
          modality?: string
          name?: string
          order_index?: number
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      dojo_techniques_bank: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          difficulty: string | null
          id: string
          image_url: string | null
          modality: string
          name: string
          notes: string | null
          owner_id: string
          recommended_belt: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          id?: string
          image_url?: string | null
          modality: string
          name: string
          notes?: string | null
          owner_id: string
          recommended_belt?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          id?: string
          image_url?: string | null
          modality?: string
          name?: string
          notes?: string | null
          owner_id?: string
          recommended_belt?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      dojo_tutorial_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          owner_id: string
          status: string
          step: number
          track_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          owner_id?: string
          status?: string
          step?: number
          track_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          owner_id?: string
          status?: string
          step?: number
          track_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      dojo_unit_members: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          role: string
          unit_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          role: string
          unit_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          role?: string
          unit_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_unit_members_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "dojo_units"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_unit_qr_tokens: {
        Row: {
          active: boolean
          created_at: string
          id: string
          label: string | null
          owner_id: string
          revoked_at: string | null
          token: string
          unit_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string | null
          owner_id: string
          revoked_at?: string | null
          token: string
          unit_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string | null
          owner_id?: string
          revoked_at?: string | null
          token?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_unit_qr_tokens_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "dojo_units"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_units: {
        Row: {
          active: boolean
          address: string | null
          admin_ids: string[] | null
          age_ranges: string[] | null
          banner_url: string | null
          city: string | null
          cnpj: string | null
          complement: string | null
          coordinator_ids: string[] | null
          country: string | null
          created_at: string
          email: string | null
          facade_url: string | null
          gallery_urls: string[] | null
          hours: Json | null
          id: string
          legal_name: string | null
          logo_url: string | null
          manager_cpf: string | null
          manager_name: string | null
          manager_rg: string | null
          metadata: Json | null
          modalities: string[] | null
          name: string
          neighborhood: string | null
          number: string | null
          opened_at: string | null
          owner_id: string
          phone: string | null
          phone2: string | null
          socials: Json | null
          state: string | null
          state_registration: string | null
          street: string | null
          trade_name: string | null
          updated_at: string
          website: string | null
          whatsapp: string | null
          zip: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          admin_ids?: string[] | null
          age_ranges?: string[] | null
          banner_url?: string | null
          city?: string | null
          cnpj?: string | null
          complement?: string | null
          coordinator_ids?: string[] | null
          country?: string | null
          created_at?: string
          email?: string | null
          facade_url?: string | null
          gallery_urls?: string[] | null
          hours?: Json | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          manager_cpf?: string | null
          manager_name?: string | null
          manager_rg?: string | null
          metadata?: Json | null
          modalities?: string[] | null
          name: string
          neighborhood?: string | null
          number?: string | null
          opened_at?: string | null
          owner_id: string
          phone?: string | null
          phone2?: string | null
          socials?: Json | null
          state?: string | null
          state_registration?: string | null
          street?: string | null
          trade_name?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
          zip?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          admin_ids?: string[] | null
          age_ranges?: string[] | null
          banner_url?: string | null
          city?: string | null
          cnpj?: string | null
          complement?: string | null
          coordinator_ids?: string[] | null
          country?: string | null
          created_at?: string
          email?: string | null
          facade_url?: string | null
          gallery_urls?: string[] | null
          hours?: Json | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          manager_cpf?: string | null
          manager_name?: string | null
          manager_rg?: string | null
          metadata?: Json | null
          modalities?: string[] | null
          name?: string
          neighborhood?: string | null
          number?: string | null
          opened_at?: string | null
          owner_id?: string
          phone?: string | null
          phone2?: string | null
          socials?: Json | null
          state?: string | null
          state_registration?: string | null
          street?: string | null
          trade_name?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      dojo_users: {
        Row: {
          auth_user_id: string
          created_at: string
          email: string | null
          id: string
          name: string | null
          owner_id: string
          role: Database["public"]["Enums"]["dojo_user_role"]
          status: string
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          owner_id: string
          role?: Database["public"]["Enums"]["dojo_user_role"]
          status?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          owner_id?: string
          role?: Database["public"]["Enums"]["dojo_user_role"]
          status?: string
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
      dojo_wallet_settings: {
        Row: {
          auto_release_days: number
          created_at: string
          currency: string
          extras: Json
          min_withdrawal_amount: number
          owner_id: string
          payout_mode: Database["public"]["Enums"]["amtpay_payout_mode"]
          updated_at: string
          withdrawal_fee_amount: number
          withdrawal_fee_percent: number
        }
        Insert: {
          auto_release_days?: number
          created_at?: string
          currency?: string
          extras?: Json
          min_withdrawal_amount?: number
          owner_id: string
          payout_mode?: Database["public"]["Enums"]["amtpay_payout_mode"]
          updated_at?: string
          withdrawal_fee_amount?: number
          withdrawal_fee_percent?: number
        }
        Update: {
          auto_release_days?: number
          created_at?: string
          currency?: string
          extras?: Json
          min_withdrawal_amount?: number
          owner_id?: string
          payout_mode?: Database["public"]["Enums"]["amtpay_payout_mode"]
          updated_at?: string
          withdrawal_fee_amount?: number
          withdrawal_fee_percent?: number
        }
        Relationships: []
      }
      dojo_wallet_transactions: {
        Row: {
          amount: number
          available_at: string | null
          created_at: string
          currency: string
          description: string | null
          direction: number
          fee_amount: number
          id: string
          kind: Database["public"]["Enums"]["amtpay_tx_kind"]
          metadata: Json
          method: Database["public"]["Enums"]["amtpay_tx_method"]
          net_amount: number
          occurred_at: string
          owner_id: string
          provider: string | null
          provider_tx_id: string | null
          reference_id: string | null
          reference_type: string | null
          split_transaction_id: string | null
          status: Database["public"]["Enums"]["amtpay_tx_status"]
          student_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          available_at?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          direction?: number
          fee_amount?: number
          id?: string
          kind: Database["public"]["Enums"]["amtpay_tx_kind"]
          metadata?: Json
          method?: Database["public"]["Enums"]["amtpay_tx_method"]
          net_amount: number
          occurred_at?: string
          owner_id: string
          provider?: string | null
          provider_tx_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          split_transaction_id?: string | null
          status?: Database["public"]["Enums"]["amtpay_tx_status"]
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          available_at?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          direction?: number
          fee_amount?: number
          id?: string
          kind?: Database["public"]["Enums"]["amtpay_tx_kind"]
          metadata?: Json
          method?: Database["public"]["Enums"]["amtpay_tx_method"]
          net_amount?: number
          occurred_at?: string
          owner_id?: string
          provider?: string | null
          provider_tx_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          split_transaction_id?: string | null
          status?: Database["public"]["Enums"]["amtpay_tx_status"]
          student_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dojo_webhook_deliveries: {
        Row: {
          attempt: number
          created_at: string
          endpoint_id: string
          event: string
          id: string
          owner_id: string
          payload: Json
          response: string | null
          status: number | null
        }
        Insert: {
          attempt?: number
          created_at?: string
          endpoint_id: string
          event: string
          id?: string
          owner_id: string
          payload?: Json
          response?: string | null
          status?: number | null
        }
        Update: {
          attempt?: number
          created_at?: string
          endpoint_id?: string
          event?: string
          id?: string
          owner_id?: string
          payload?: Json
          response?: string | null
          status?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dojo_webhook_deliveries_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "dojo_webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_webhook_endpoints: {
        Row: {
          active: boolean
          created_at: string
          events: string[]
          id: string
          last_delivery_at: string | null
          last_status: number | null
          module: string | null
          owner_id: string
          secret: string | null
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          events?: string[]
          id?: string
          last_delivery_at?: string | null
          last_status?: number | null
          module?: string | null
          owner_id: string
          secret?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          events?: string[]
          id?: string
          last_delivery_at?: string | null
          last_status?: number | null
          module?: string | null
          owner_id?: string
          secret?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      dojo_withdrawals: {
        Row: {
          amount: number
          asaas_transfer_id: string | null
          asaas_transfer_status: string | null
          bank_account_id: string | null
          cancelled_at: string | null
          created_at: string
          currency: string
          destination: Json
          fee_amount: number
          id: string
          metadata: Json
          net_amount: number
          notes: string | null
          owner_id: string
          paid_at: string | null
          pix_key: string | null
          pix_key_type:
            | Database["public"]["Enums"]["amtpay_pix_key_type"]
            | null
          processed_at: string | null
          provider: string | null
          provider_tx_id: string | null
          rejected_at: string | null
          rejection_reason: string | null
          requested_at: string
          reviewed_at: string | null
          status: Database["public"]["Enums"]["amtpay_withdrawal_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          asaas_transfer_id?: string | null
          asaas_transfer_status?: string | null
          bank_account_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          destination?: Json
          fee_amount?: number
          id?: string
          metadata?: Json
          net_amount: number
          notes?: string | null
          owner_id: string
          paid_at?: string | null
          pix_key?: string | null
          pix_key_type?:
            | Database["public"]["Enums"]["amtpay_pix_key_type"]
            | null
          processed_at?: string | null
          provider?: string | null
          provider_tx_id?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["amtpay_withdrawal_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          asaas_transfer_id?: string | null
          asaas_transfer_status?: string | null
          bank_account_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          destination?: Json
          fee_amount?: number
          id?: string
          metadata?: Json
          net_amount?: number
          notes?: string | null
          owner_id?: string
          paid_at?: string | null
          pix_key?: string | null
          pix_key_type?:
            | Database["public"]["Enums"]["amtpay_pix_key_type"]
            | null
          processed_at?: string | null
          provider?: string | null
          provider_tx_id?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["amtpay_withdrawal_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_withdrawals_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "dojo_bank_accounts"
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
      fiscal_certificates: {
        Row: {
          cnpj: string
          created_at: string | null
          id: string
          issuer_name: string
          owner_id: string
          serial_number: string
          status: string | null
          subject_name: string
          valid_from: string
          valid_to: string
        }
        Insert: {
          cnpj: string
          created_at?: string | null
          id?: string
          issuer_name: string
          owner_id: string
          serial_number: string
          status?: string | null
          subject_name: string
          valid_from: string
          valid_to: string
        }
        Update: {
          cnpj?: string
          created_at?: string | null
          id?: string
          issuer_name?: string
          owner_id?: string
          serial_number?: string
          status?: string | null
          subject_name?: string
          valid_from?: string
          valid_to?: string
        }
        Relationships: []
      }
      fiscal_invoices: {
        Row: {
          access_key: string | null
          created_at: string | null
          error_message: string | null
          id: string
          invoice_number: number
          issue_date: string | null
          order_id: string | null
          owner_id: string
          protocol: string | null
          quote_id: string | null
          recipient_document: string
          recipient_name: string
          series: number
          status: Database["public"]["Enums"]["invoice_status"] | null
          total_amount: number
          updated_at: string | null
          xml_content: string | null
        }
        Insert: {
          access_key?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          invoice_number: number
          issue_date?: string | null
          order_id?: string | null
          owner_id: string
          protocol?: string | null
          quote_id?: string | null
          recipient_document: string
          recipient_name: string
          series: number
          status?: Database["public"]["Enums"]["invoice_status"] | null
          total_amount: number
          updated_at?: string | null
          xml_content?: string | null
        }
        Update: {
          access_key?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          invoice_number?: number
          issue_date?: string | null
          order_id?: string | null
          owner_id?: string
          protocol?: string | null
          quote_id?: string | null
          recipient_document?: string
          recipient_name?: string
          series?: number
          status?: Database["public"]["Enums"]["invoice_status"] | null
          total_amount?: number
          updated_at?: string | null
          xml_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "store_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_issuer_config: {
        Row: {
          address_city_code: string
          address_city_name: string
          address_complement: string | null
          address_neighborhood: string
          address_number: string
          address_state: string
          address_street: string
          address_zip: string
          cnpj: string
          created_at: string | null
          environment: string | null
          id: string
          inscricao_estadual: string
          inscricao_municipal: string | null
          last_nfe_number: number | null
          last_nfe_series: number | null
          nome_fantasia: string | null
          owner_id: string
          razao_social: string
          regime_tributario: number
          updated_at: string | null
        }
        Insert: {
          address_city_code: string
          address_city_name: string
          address_complement?: string | null
          address_neighborhood: string
          address_number: string
          address_state: string
          address_street: string
          address_zip: string
          cnpj: string
          created_at?: string | null
          environment?: string | null
          id?: string
          inscricao_estadual: string
          inscricao_municipal?: string | null
          last_nfe_number?: number | null
          last_nfe_series?: number | null
          nome_fantasia?: string | null
          owner_id: string
          razao_social: string
          regime_tributario: number
          updated_at?: string | null
        }
        Update: {
          address_city_code?: string
          address_city_name?: string
          address_complement?: string | null
          address_neighborhood?: string
          address_number?: string
          address_state?: string
          address_street?: string
          address_zip?: string
          cnpj?: string
          created_at?: string | null
          environment?: string | null
          id?: string
          inscricao_estadual?: string
          inscricao_municipal?: string | null
          last_nfe_number?: number | null
          last_nfe_series?: number | null
          nome_fantasia?: string | null
          owner_id?: string
          razao_social?: string
          regime_tributario?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      fixed_expenses: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          name: string
          tenant_id: string | null
          updated_at: string | null
          value: number
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          name: string
          tenant_id?: string | null
          updated_at?: string | null
          value?: number
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          name?: string
          tenant_id?: string | null
          updated_at?: string | null
          value?: number
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
      macro_dm_campaigns: {
        Row: {
          cooldown_max_sec: number
          cooldown_min_sec: number
          created_at: string | null
          id: string
          is_active: boolean
          max_per_day: number
          max_per_hour: number
          message_templates: string[]
          name: string
          owner_id: string
          simulated_human_behavior: boolean
          updated_at: string | null
        }
        Insert: {
          cooldown_max_sec?: number
          cooldown_min_sec?: number
          created_at?: string | null
          id?: string
          is_active?: boolean
          max_per_day?: number
          max_per_hour?: number
          message_templates?: string[]
          name: string
          owner_id: string
          simulated_human_behavior?: boolean
          updated_at?: string | null
        }
        Update: {
          cooldown_max_sec?: number
          cooldown_min_sec?: number
          created_at?: string | null
          id?: string
          is_active?: boolean
          max_per_day?: number
          max_per_hour?: number
          message_templates?: string[]
          name?: string
          owner_id?: string
          simulated_human_behavior?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      macro_dm_logs: {
        Row: {
          created_at: string | null
          id: string
          lead_id: string | null
          level: string
          message: string
          metadata: Json
          owner_id: string
          queue_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          lead_id?: string | null
          level?: string
          message: string
          metadata?: Json
          owner_id: string
          queue_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          lead_id?: string | null
          level?: string
          message?: string
          metadata?: Json
          owner_id?: string
          queue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "macro_dm_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "prospect_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "macro_dm_logs_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "macro_dm_queues"
            referencedColumns: ["id"]
          },
        ]
      }
      macro_dm_queue_items: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          last_attempt_at: string | null
          lead_id: string
          owner_id: string
          queue_id: string
          retry_count: number
          status: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          lead_id: string
          owner_id: string
          queue_id: string
          retry_count?: number
          status?: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          lead_id?: string
          owner_id?: string
          queue_id?: string
          retry_count?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "macro_dm_queue_items_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "prospect_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "macro_dm_queue_items_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "macro_dm_queues"
            referencedColumns: ["id"]
          },
        ]
      }
      macro_dm_queues: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          current_lead_id: string | null
          error_leads: number
          filters: Json
          id: string
          last_run_at: string | null
          name: string
          owner_id: string
          processed_leads: number
          status: Database["public"]["Enums"]["macro_dm_queue_status"]
          total_leads: number
          updated_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          current_lead_id?: string | null
          error_leads?: number
          filters?: Json
          id?: string
          last_run_at?: string | null
          name: string
          owner_id: string
          processed_leads?: number
          status?: Database["public"]["Enums"]["macro_dm_queue_status"]
          total_leads?: number
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          current_lead_id?: string | null
          error_leads?: number
          filters?: Json
          id?: string
          last_run_at?: string | null
          name?: string
          owner_id?: string
          processed_leads?: number
          status?: Database["public"]["Enums"]["macro_dm_queue_status"]
          total_leads?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "macro_dm_queues_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "macro_dm_campaigns"
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
      marketing_investments: {
        Row: {
          channel: string
          created_at: string | null
          id: string
          monthly_investment: number
          new_customers_goal: number | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          channel: string
          created_at?: string | null
          id?: string
          monthly_investment?: number
          new_customers_goal?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          id?: string
          monthly_investment?: number
          new_customers_goal?: number | null
          tenant_id?: string | null
          updated_at?: string | null
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
      pricing_scenarios: {
        Row: {
          config_snapshot: Json
          created_at: string | null
          description: string | null
          id: string
          name: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          config_snapshot: Json
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          config_snapshot?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      product_cost_compositions: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          product_id: string | null
          provider: string | null
          quantity: number | null
          tenant_id: string | null
          type: string
          unit_cost: number | null
          unit_of_measure: string | null
          updated_at: string | null
          waste_percent: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          product_id?: string | null
          provider?: string | null
          quantity?: number | null
          tenant_id?: string | null
          type: string
          unit_cost?: number | null
          unit_of_measure?: string | null
          updated_at?: string | null
          waste_percent?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          product_id?: string | null
          provider?: string | null
          quantity?: number | null
          tenant_id?: string | null
          type?: string
          unit_cost?: number | null
          unit_of_measure?: string | null
          updated_at?: string | null
          waste_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_cost_compositions_product_id_fkey"
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
          cfop_internal: string | null
          cfop_interstate: string | null
          compare_at_price: number | null
          cost: number
          created_at: string
          description: string | null
          description_html: string | null
          featured: boolean
          gtin: string | null
          height_cm: number | null
          id: string
          image_url: string | null
          length_cm: number | null
          meta_description: string | null
          meta_title: string | null
          name: string
          ncm: string | null
          origem: string | null
          price: number
          pricing_commission_percent: number | null
          pricing_gateway_percent: number | null
          pricing_marketing_percent: number | null
          pricing_profit_percent: number | null
          pricing_reserve_percent: number | null
          pricing_taxes_percent: number | null
          short_description: string | null
          sku: string | null
          slug: string | null
          source_url: string | null
          status: string
          stock: number
          unidade: string | null
          unit_commercial: string | null
          unit_taxable: string | null
          updated_at: string
          wc_product_id: number | null
          weight_grams: number | null
          wholesale_discount_percent: number | null
          wholesale_enabled: boolean
          width_cm: number | null
        }
        Insert: {
          category?: string | null
          category_id?: string | null
          cest?: string | null
          cfop?: string | null
          cfop_internal?: string | null
          cfop_interstate?: string | null
          compare_at_price?: number | null
          cost?: number
          created_at?: string
          description?: string | null
          description_html?: string | null
          featured?: boolean
          gtin?: string | null
          height_cm?: number | null
          id?: string
          image_url?: string | null
          length_cm?: number | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          ncm?: string | null
          origem?: string | null
          price?: number
          pricing_commission_percent?: number | null
          pricing_gateway_percent?: number | null
          pricing_marketing_percent?: number | null
          pricing_profit_percent?: number | null
          pricing_reserve_percent?: number | null
          pricing_taxes_percent?: number | null
          short_description?: string | null
          sku?: string | null
          slug?: string | null
          source_url?: string | null
          status?: string
          stock?: number
          unidade?: string | null
          unit_commercial?: string | null
          unit_taxable?: string | null
          updated_at?: string
          wc_product_id?: number | null
          weight_grams?: number | null
          wholesale_discount_percent?: number | null
          wholesale_enabled?: boolean
          width_cm?: number | null
        }
        Update: {
          category?: string | null
          category_id?: string | null
          cest?: string | null
          cfop?: string | null
          cfop_internal?: string | null
          cfop_interstate?: string | null
          compare_at_price?: number | null
          cost?: number
          created_at?: string
          description?: string | null
          description_html?: string | null
          featured?: boolean
          gtin?: string | null
          height_cm?: number | null
          id?: string
          image_url?: string | null
          length_cm?: number | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          ncm?: string | null
          origem?: string | null
          price?: number
          pricing_commission_percent?: number | null
          pricing_gateway_percent?: number | null
          pricing_marketing_percent?: number | null
          pricing_profit_percent?: number | null
          pricing_reserve_percent?: number | null
          pricing_taxes_percent?: number | null
          short_description?: string | null
          sku?: string | null
          slug?: string | null
          source_url?: string | null
          status?: string
          stock?: number
          unidade?: string | null
          unit_commercial?: string | null
          unit_taxable?: string | null
          updated_at?: string
          wc_product_id?: number | null
          weight_grams?: number | null
          wholesale_discount_percent?: number | null
          wholesale_enabled?: boolean
          width_cm?: number | null
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
          google_maps_url: string | null
          google_place_id: string | null
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
          quality_tier: string | null
          rating: number | null
          rating_count: number | null
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
          google_maps_url?: string | null
          google_place_id?: string | null
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
          quality_tier?: string | null
          rating?: number | null
          rating_count?: number | null
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
          google_maps_url?: string | null
          google_place_id?: string | null
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
          quality_tier?: string | null
          rating?: number | null
          rating_count?: number | null
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
      store_admin_notification_prefs: {
        Row: {
          created_at: string
          enabled: boolean
          event: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          event: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          event?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      store_admin_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_error: string | null
          last_success_at: string | null
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_error?: string | null
          last_success_at?: string | null
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_error?: string | null
          last_success_at?: string | null
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
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
      store_finance_entries: {
        Row: {
          amount: number
          created_at: string
          customer_name: string | null
          description: string
          id: string
          job_id: string | null
          occurred_at: string
          quantity: number
          reference: string | null
          source: string
          source_id: string | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_name?: string | null
          description: string
          id?: string
          job_id?: string | null
          occurred_at?: string
          quantity?: number
          reference?: string | null
          source?: string
          source_id?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_name?: string | null
          description?: string
          id?: string
          job_id?: string | null
          occurred_at?: string
          quantity?: number
          reference?: string | null
          source?: string
          source_id?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_finance_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "store_production_jobs"
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
      store_order_events: {
        Row: {
          actor_email: string | null
          actor_user_id: string | null
          created_at: string
          event: string
          id: string
          message: string | null
          metadata: Json | null
          order_id: string
        }
        Insert: {
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          event: string
          id?: string
          message?: string | null
          metadata?: Json | null
          order_id: string
        }
        Update: {
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          event?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "store_orders"
            referencedColumns: ["id"]
          },
        ]
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
      store_production_comments: {
        Row: {
          author: string | null
          body: string
          created_at: string
          id: string
          job_id: string
        }
        Insert: {
          author?: string | null
          body: string
          created_at?: string
          id?: string
          job_id: string
        }
        Update: {
          author?: string | null
          body?: string
          created_at?: string
          id?: string
          job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_production_comments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "store_production_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      store_production_jobs: {
        Row: {
          assignee: string | null
          blocked_reason: string | null
          completed_at: string | null
          created_at: string
          custom_config: Json | null
          customer_name: string | null
          deadline: string | null
          id: string
          image_url: string | null
          material_alert: string | null
          notes: string | null
          order_type: string
          payment_status: string | null
          priority: number
          product_name: string
          quantity: number
          queued_at: string
          reference: string | null
          rework_count: number
          sku: string | null
          source: string
          source_id: string | null
          source_item_key: string | null
          stage: string
          stage_assignees: Json
          stage_started_at: string
          started_at: string | null
          status: string
          total_value: number | null
          unit_price: number | null
          updated_at: string
          urgency: string
          variant_label: string | null
        }
        Insert: {
          assignee?: string | null
          blocked_reason?: string | null
          completed_at?: string | null
          created_at?: string
          custom_config?: Json | null
          customer_name?: string | null
          deadline?: string | null
          id?: string
          image_url?: string | null
          material_alert?: string | null
          notes?: string | null
          order_type?: string
          payment_status?: string | null
          priority?: number
          product_name: string
          quantity?: number
          queued_at?: string
          reference?: string | null
          rework_count?: number
          sku?: string | null
          source: string
          source_id?: string | null
          source_item_key?: string | null
          stage?: string
          stage_assignees?: Json
          stage_started_at?: string
          started_at?: string | null
          status?: string
          total_value?: number | null
          unit_price?: number | null
          updated_at?: string
          urgency?: string
          variant_label?: string | null
        }
        Update: {
          assignee?: string | null
          blocked_reason?: string | null
          completed_at?: string | null
          created_at?: string
          custom_config?: Json | null
          customer_name?: string | null
          deadline?: string | null
          id?: string
          image_url?: string | null
          material_alert?: string | null
          notes?: string | null
          order_type?: string
          payment_status?: string | null
          priority?: number
          product_name?: string
          quantity?: number
          queued_at?: string
          reference?: string | null
          rework_count?: number
          sku?: string | null
          source?: string
          source_id?: string | null
          source_item_key?: string | null
          stage?: string
          stage_assignees?: Json
          stage_started_at?: string
          started_at?: string | null
          status?: string
          total_value?: number | null
          unit_price?: number | null
          updated_at?: string
          urgency?: string
          variant_label?: string | null
        }
        Relationships: []
      }
      store_production_stage_events: {
        Row: {
          assignee: string | null
          created_at: string
          duration_seconds: number | null
          entered_at: string
          exited_at: string | null
          from_stage: string | null
          id: string
          job_id: string
          note: string | null
          to_stage: string
        }
        Insert: {
          assignee?: string | null
          created_at?: string
          duration_seconds?: number | null
          entered_at?: string
          exited_at?: string | null
          from_stage?: string | null
          id?: string
          job_id: string
          note?: string | null
          to_stage: string
        }
        Update: {
          assignee?: string | null
          created_at?: string
          duration_seconds?: number | null
          entered_at?: string
          exited_at?: string | null
          from_stage?: string | null
          id?: string
          job_id?: string
          note?: string | null
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_production_stage_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "store_production_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      store_quotes: {
        Row: {
          created_at: string
          customer_address: Json
          customer_company: string | null
          customer_document: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          delivery_terms: string | null
          discount: number
          id: string
          items: Json
          notes: string | null
          owner_id: string
          payment_terms: string | null
          quote_number: string
          shipping_cost: number
          signature_image: string | null
          signer_name: string | null
          signer_role: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          customer_address?: Json
          customer_company?: string | null
          customer_document?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          delivery_terms?: string | null
          discount?: number
          id?: string
          items?: Json
          notes?: string | null
          owner_id?: string
          payment_terms?: string | null
          quote_number: string
          shipping_cost?: number
          signature_image?: string | null
          signer_name?: string | null
          signer_role?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          customer_address?: Json
          customer_company?: string | null
          customer_document?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          delivery_terms?: string | null
          discount?: number
          id?: string
          items?: Json
          notes?: string | null
          owner_id?: string
          payment_terms?: string | null
          quote_number?: string
          shipping_cost?: number
          signature_image?: string | null
          signer_name?: string | null
          signer_role?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: []
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
      student_accounts: {
        Row: {
          auth_user_id: string
          created_at: string
          email: string | null
          first_access_at: string | null
          id: string
          last_login_at: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          email?: string | null
          first_access_at?: string | null
          id?: string
          last_login_at?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          email?: string | null
          first_access_at?: string | null
          id?: string
          last_login_at?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_accounts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "dojo_students"
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
      dojo_team_schedule_view: {
        Row: {
          cancel_reason: string | null
          class_id: string | null
          class_name: string | null
          class_teacher_id: string | null
          color: string | null
          effective_teacher_id: string | null
          end_time: string | null
          level: string | null
          max_students: number | null
          modality: string | null
          occurrence_date: string | null
          occurrence_id: string | null
          original_teacher_id: string | null
          owner_id: string | null
          schedule_id: string | null
          space_id: string | null
          start_time: string | null
          status: string | null
          substitute_reason: string | null
          substitute_teacher_id: string | null
          substituted_at: string | null
          unit_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dojo_class_occurrences_class_id_fk"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "dojo_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_class_occurrences_original_teacher_id_fkey"
            columns: ["original_teacher_id"]
            isOneToOne: false
            referencedRelation: "dojo_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_class_occurrences_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "dojo_class_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_class_occurrences_substitute_teacher_id_fkey"
            columns: ["substitute_teacher_id"]
            isOneToOne: false
            referencedRelation: "dojo_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_classes_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "dojo_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_classes_teacher_id_fkey"
            columns: ["class_teacher_id"]
            isOneToOne: false
            referencedRelation: "dojo_team_members"
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
      dojo_wallet_balance: {
        Row: {
          available_balance: number | null
          blocked_balance: number | null
          last_movement_at: string | null
          owner_id: string | null
          pending_balance: number | null
          total_balance: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      active_student_from_header: { Args: never; Returns: string }
      admin_delete_dojo_owner: {
        Args: { owner_id_to_delete: string }
        Returns: undefined
      }
      dojo_announcement_visible_to_student: {
        Args: { _ann: string; _student: string }
        Returns: boolean
      }
      dojo_link_team_member_by_email: {
        Args: { _email: string; _member_id: string }
        Returns: string
      }
      dojo_my_staff_owner_id: { Args: never; Returns: string }
      dojo_my_team_permissions: {
        Args: never
        Returns: {
          full_name: string
          member_id: string
          owner_id: string
          permissions: Json
          role: string
        }[]
      }
      dojo_next_contract_number: { Args: { _owner: string }; Returns: string }
      dojo_recompute_current_belt: {
        Args: { _student_id: string }
        Returns: undefined
      }
      dojo_slugify: { Args: { input: string }; Returns: string }
      dojo_staff_session: {
        Args: never
        Returns: {
          account_id: string
          email: string
          full_name: string
          member_id: string
          owner_id: string
          permissions: Json
          role: string
          status: string
        }[]
      }
      ensure_my_student_credentials: {
        Args: never
        Returns: {
          checkin_pin: string
          qr_token: string
        }[]
      }
      get_academy_athlete_ranking: {
        Args: { _belt?: string; _owner: string }
        Returns: {
          belt_id: string
          bronze: number
          competitions: number
          full_name: string
          gold: number
          losses: number
          photo_url: string
          points: number
          silver: number
          student_id: string
          wins: number
        }[]
      }
      get_academy_by_slug: {
        Args: { _slug: string }
        Returns: {
          brand_primary: string
          brand_secondary: string
          city: string
          legal_name: string
          logo_url: string
          slug: string
          state: string
          trade_name: string
        }[]
      }
      get_academy_medal_stats: {
        Args: { _owner: string }
        Returns: {
          bronze: number
          gold: number
          participation: number
          silver: number
          total: number
        }[]
      }
      get_academy_medal_summary: {
        Args: { _owner: string }
        Returns: {
          bronze: number
          gold: number
          participation: number
          silver: number
          total: number
        }[]
      }
      get_class_ranking: {
        Args: { _class_id: string; _since?: string }
        Returns: {
          checkins: number
          current_belt_id: string
          current_degree: number
          full_name: string
          photo_url: string
          status: string
          student_id: string
        }[]
      }
      get_dojo_staff_portal: {
        Args: { _dojo: string }
        Returns: {
          brand_primary: string
          brand_secondary: string
          city: string
          legal_name: string
          logo_url: string
          owner_id: string
          slug: string
          state: string
          trade_name: string
        }[]
      }
      get_latest_apk_by_slug: {
        Args: { _slug: string }
        Returns: {
          build_code: number
          created_at: string
          file_name: string
          file_size: number
          id: string
          owner_id: string
          release_notes: string
          version_name: string
        }[]
      }
      get_my_student_id: { Args: never; Returns: string }
      get_my_student_owner_id: { Args: never; Returns: string }
      get_student_competition_history: {
        Args: { _student: string }
        Returns: {
          academy_competition_id: string
          age_group: string
          athlete_id: string
          belt_name: string
          category: string
          certificates: string[]
          competition_id: string
          competition_name: string
          competition_start_at: string
          draws: number
          ippons: number
          knockouts: number
          losses: number
          matches: number
          medal: string
          notes: string
          photos: string[]
          placement: number
          points: number
          scope: string
          submissions: number
          videos: string[]
          weight_class: string
          weight_kg: number
          wins: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_unit_access: {
        Args: { _unit_id: string; _user_id: string }
        Returns: boolean
      }
      is_my_student: { Args: { _id: string }; Returns: boolean }
      list_my_students: {
        Args: never
        Returns: {
          current_belt_id: string
          current_degree: number
          full_name: string
          id: string
          owner_id: string
          photo_url: string
          unit_id: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      amtpay_bank_account_type: "checking" | "savings" | "payment"
      amtpay_payout_mode: "manual" | "daily" | "weekly" | "monthly"
      amtpay_pix_key_type: "cpf" | "cnpj" | "email" | "phone" | "random"
      amtpay_tx_kind:
        | "receipt"
        | "fee"
        | "refund"
        | "withdrawal"
        | "withdrawal_reversal"
        | "adjustment"
        | "transfer_in"
        | "transfer_out"
      amtpay_tx_method:
        | "pix"
        | "card"
        | "boleto"
        | "link"
        | "cash"
        | "transfer"
        | "internal"
        | "other"
      amtpay_tx_status: "pending" | "available" | "blocked" | "reversed"
      amtpay_withdrawal_status:
        | "requested"
        | "in_review"
        | "processing"
        | "paid"
        | "cancelled"
        | "rejected"
      app_role: "admin" | "moderator" | "user" | "amt_admin"
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
      dojo_user_role: "owner" | "admin" | "teacher"
      face_detection_status:
        | "pending"
        | "confirmed"
        | "rejected"
        | "visitor"
        | "new_student"
      invoice_status:
        | "draft"
        | "pending"
        | "authorized"
        | "rejected"
        | "cancelled"
        | "denied"
        | "error"
      macro_dm_queue_status:
        | "waiting"
        | "preparing"
        | "executing"
        | "paused"
        | "completed"
        | "failed"
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
      amtpay_bank_account_type: ["checking", "savings", "payment"],
      amtpay_payout_mode: ["manual", "daily", "weekly", "monthly"],
      amtpay_pix_key_type: ["cpf", "cnpj", "email", "phone", "random"],
      amtpay_tx_kind: [
        "receipt",
        "fee",
        "refund",
        "withdrawal",
        "withdrawal_reversal",
        "adjustment",
        "transfer_in",
        "transfer_out",
      ],
      amtpay_tx_method: [
        "pix",
        "card",
        "boleto",
        "link",
        "cash",
        "transfer",
        "internal",
        "other",
      ],
      amtpay_tx_status: ["pending", "available", "blocked", "reversed"],
      amtpay_withdrawal_status: [
        "requested",
        "in_review",
        "processing",
        "paid",
        "cancelled",
        "rejected",
      ],
      app_role: ["admin", "moderator", "user", "amt_admin"],
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
      dojo_user_role: ["owner", "admin", "teacher"],
      face_detection_status: [
        "pending",
        "confirmed",
        "rejected",
        "visitor",
        "new_student",
      ],
      invoice_status: [
        "draft",
        "pending",
        "authorized",
        "rejected",
        "cancelled",
        "denied",
        "error",
      ],
      macro_dm_queue_status: [
        "waiting",
        "preparing",
        "executing",
        "paused",
        "completed",
        "failed",
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
