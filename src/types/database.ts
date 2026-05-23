export type UserRole = 'user' | 'admin'
export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type StudioBookingStatus =
  | 'for_approval'
  | 'pending_payment'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'cancelled'
export type BookingType = 'recording' | 'rehearsal'

export interface Database {
  public: {
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
    Tables: {
      users: {
        Row: {
          id: number
          username: string
          password: string | null
          first_name: string | null
          middle_initial: string | null
          last_name: string | null
          role: UserRole
          email: string | null
          google_id: string | null
          phone: string | null
          auth_id: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          username: string
          password?: string | null
          first_name?: string | null
          middle_initial?: string | null
          last_name?: string | null
          role?: UserRole
          email?: string | null
          google_id?: string | null
          phone?: string | null
          auth_id?: string | null
          avatar_url?: string | null
        }
        Update: {
          username?: string
          password?: string | null
          first_name?: string | null
          middle_initial?: string | null
          last_name?: string | null
          role?: UserRole
          email?: string | null
          google_id?: string | null
          phone?: string | null
          auth_id?: string | null
          avatar_url?: string | null
        }
        Relationships: []
      }
      cafe_schedule: {
        Row: {
          id: number
          user_id: number | null
          event_name: string
          booking_date: string
          booking_details: string | null
          rent_whole_place: boolean
          num_seats: number | null
          status: BookingStatus
          is_admin_event: boolean
          allow_concurrent_bookings: boolean
          created_at: string
        }
        Insert: {
          user_id?: number | null
          event_name: string
          booking_date: string
          booking_details?: string | null
          rent_whole_place?: boolean
          num_seats?: number | null
          status?: BookingStatus
          is_admin_event?: boolean
          allow_concurrent_bookings?: boolean
        }
        Update: {
          user_id?: number | null
          event_name?: string
          booking_date?: string
          booking_details?: string | null
          rent_whole_place?: boolean
          num_seats?: number | null
          status?: BookingStatus
          is_admin_event?: boolean
          allow_concurrent_bookings?: boolean
        }
        Relationships: []
      }
      studio_schedule: {
        Row: {
          id: number
          user_id: number | null
          band_artist_name: string
          booking_date: string
          start_time: string
          end_time: string
          booking_type: BookingType
          status: StudioBookingStatus
          admin_price: number | null
          admin_notes: string | null
          payment_proof_url: string | null
          invoice_sent: boolean
          overnight: boolean
          created_at: string
        }
        Insert: {
          user_id?: number | null
          band_artist_name: string
          booking_date: string
          start_time: string
          end_time: string
          booking_type: BookingType
          status?: StudioBookingStatus
          admin_price?: number | null
          admin_notes?: string | null
          payment_proof_url?: string | null
          invoice_sent?: boolean
          overnight?: boolean
        }
        Update: {
          user_id?: number | null
          band_artist_name?: string
          booking_date?: string
          start_time?: string
          end_time?: string
          booking_type?: BookingType
          status?: StudioBookingStatus
          admin_price?: number | null
          admin_notes?: string | null
          payment_proof_url?: string | null
          invoice_sent?: boolean
          overnight?: boolean
        }
        Relationships: []
      }
      cafe_menu: {
        Row: {
          id: number
          name: string
          description: string | null
          price: number
          category: string | null
          image_url: string | null
          is_available: boolean
          is_limited: boolean
          start_date: string | null
          end_date: string | null
          created_at: string
        }
        Insert: {
          name: string
          description?: string | null
          price: number
          category?: string | null
          image_url?: string | null
          is_available?: boolean
          is_limited?: boolean
          start_date?: string | null
          end_date?: string | null
        }
        Update: {
          name?: string
          description?: string | null
          price?: number
          category?: string | null
          image_url?: string | null
          is_available?: boolean
          is_limited?: boolean
          start_date?: string | null
          end_date?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          id: number
          key: string
          value: Record<string, unknown>
          updated_at: string
        }
        Insert: {
          key: string
          value?: Record<string, unknown>
          updated_at?: string
        }
        Update: {
          key?: string
          value?: Record<string, unknown>
          updated_at?: string
        }
        Relationships: []
      }
      cafe_gallery: {
        Row: {
          id: string
          image_url: string
          caption: string | null
          alt_text: string | null
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          image_url: string
          caption?: string | null
          alt_text?: string | null
          sort_order?: number
          is_active?: boolean
        }
        Update: {
          image_url?: string
          caption?: string | null
          alt_text?: string | null
          sort_order?: number
          is_active?: boolean
        }
        Relationships: []
      }
      studio_gallery: {
        Row: {
          id: string
          image_url: string
          caption: string | null
          alt_text: string | null
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          image_url: string
          caption?: string | null
          alt_text?: string | null
          sort_order?: number
          is_active?: boolean
        }
        Update: {
          image_url?: string
          caption?: string | null
          alt_text?: string | null
          sort_order?: number
          is_active?: boolean
        }
        Relationships: []
      }
      cafe_reviews: {
        Row: {
          id: string
          reviewer_name: string
          reviewer_role: string
          review_date: string | null
          review_text: string
          rating: number
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          reviewer_name: string
          reviewer_role?: string
          review_date?: string | null
          review_text: string
          rating?: number
          sort_order?: number
          is_active?: boolean
        }
        Update: {
          reviewer_name?: string
          reviewer_role?: string
          review_date?: string | null
          review_text?: string
          rating?: number
          sort_order?: number
          is_active?: boolean
        }
        Relationships: []
      }
      studio_reviews: {
        Row: {
          id: string
          reviewer_name: string
          reviewer_role: string
          review_date: string | null
          review_text: string
          rating: number
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          reviewer_name?: string
          reviewer_role?: string
          review_date?: string | null
          review_text: string
          rating?: number
          sort_order?: number
          is_active?: boolean
        }
        Update: {
          reviewer_name?: string
          reviewer_role?: string
          review_date?: string | null
          review_text?: string
          rating?: number
          sort_order?: number
          is_active?: boolean
        }
        Relationships: []
      }
      cafe_promos: {
        Row: {
          id: string
          image_url: string
          title: string
          description: string | null
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          image_url: string
          title: string
          description?: string | null
          sort_order?: number
          is_active?: boolean
        }
        Update: {
          image_url?: string
          title?: string
          description?: string | null
          sort_order?: number
          is_active?: boolean
        }
        Relationships: []
      }
      blocked_schedules: {
        Row: {
          id: string
          venue: 'cafe' | 'studio'
          block_date: string
          start_time: string | null
          end_time: string | null
          reason: string | null
          created_by: number | null
          created_at: string
        }
        Insert: {
          venue: 'cafe' | 'studio'
          block_date: string
          start_time?: string | null
          end_time?: string | null
          reason?: string | null
          created_by?: number | null
        }
        Update: {
          venue?: 'cafe' | 'studio'
          block_date?: string
          start_time?: string | null
          end_time?: string | null
          reason?: string | null
          created_by?: number | null
        }
        Relationships: []
      }
    }
  }
}

export type PromotionType = 'event' | 'menu_item' | 'others'

export interface PromotionRow {
  id: string
  title: string
  description: string | null
  image_url: string | null
  photo_urls: string[]
  promotion_type: PromotionType
  is_permanent: boolean
  start_date: string | null
  end_date: string | null
  event_date: string | null
  linked_schedule_id: number | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export type UserRow          = Database['public']['Tables']['users']['Row']
export type CafeScheduleRow  = Database['public']['Tables']['cafe_schedule']['Row']
export type StudioScheduleRow = Database['public']['Tables']['studio_schedule']['Row']
// Convenience: studio_schedule.status uses StudioBookingStatus, not BookingStatus
export type CafeMenuRow      = Database['public']['Tables']['cafe_menu']['Row']
export type SystemSettingsRow = Database['public']['Tables']['system_settings']['Row']
export type CafeGalleryRow   = Database['public']['Tables']['cafe_gallery']['Row']
export type StudioGalleryRow = Database['public']['Tables']['studio_gallery']['Row']
export type CafeReviewRow    = Database['public']['Tables']['cafe_reviews']['Row']
export type StudioReviewRow  = Database['public']['Tables']['studio_reviews']['Row']
export type CafePromoRow     = Database['public']['Tables']['cafe_promos']['Row']

export type BlockedVenue = 'cafe' | 'studio'

export interface BlockedScheduleRow {
  id:          string
  venue:       BlockedVenue
  block_date:  string
  start_time:  string | null
  end_time:    string | null
  reason:      string | null
  created_by:  number | null
  created_at:  string
}
