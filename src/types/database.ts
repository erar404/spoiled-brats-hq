export type UserRole = 'user' | 'admin'
export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
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
        }
        Update: {
          user_id?: number | null
          event_name?: string
          booking_date?: string
          booking_details?: string | null
          rent_whole_place?: boolean
          num_seats?: number | null
          status?: BookingStatus
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
          status: BookingStatus
          created_at: string
        }
        Insert: {
          user_id?: number | null
          band_artist_name: string
          booking_date: string
          start_time: string
          end_time: string
          booking_type: BookingType
          status?: BookingStatus
        }
        Update: {
          user_id?: number | null
          band_artist_name?: string
          booking_date?: string
          start_time?: string
          end_time?: string
          booking_type?: BookingType
          status?: BookingStatus
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
          created_at: string
        }
        Insert: {
          name: string
          description?: string | null
          price: number
          category?: string | null
          image_url?: string | null
          is_available?: boolean
        }
        Update: {
          name?: string
          description?: string | null
          price?: number
          category?: string | null
          image_url?: string | null
          is_available?: boolean
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
    }
  }
}

export type UserRow = Database['public']['Tables']['users']['Row']
export type CafeScheduleRow = Database['public']['Tables']['cafe_schedule']['Row']
export type StudioScheduleRow = Database['public']['Tables']['studio_schedule']['Row']
export type CafeMenuRow = Database['public']['Tables']['cafe_menu']['Row']
export type SystemSettingsRow = Database['public']['Tables']['system_settings']['Row']
