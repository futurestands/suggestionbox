import { createClient } from '@supabase/supabase-js'
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
export const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string
export const supabase = createClient(SUPABASE_URL, ANON_KEY)
export const CATEGORIES = ['General suggestion','Work environment','Staff welfare','Management','Service delivery','Customer complaint','Ethics or misconduct','Health and safety','Other']
export const STATUSES = ['New','Under Review','Resolved'] as const
