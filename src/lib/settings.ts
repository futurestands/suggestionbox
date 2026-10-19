import { useEffect, useState } from 'react'
import { supabase } from './supabase'
export type PS = { org_name: string; logo_url: string | null; primary_color: string; secondary_color: string; form_title: string; intro_text: string; privacy_notice: string; categories: string[]; max_message_length: number; default_status: string | null; default_category: string | null }

const DEFAULT_SETTINGS: PS = {
  org_name: 'SOUTHWESTERN UMBRELLA OF WATER AND SANITATION',
  logo_url: null,
  primary_color: '#2563eb',
  secondary_color: '#eff6ff',
  form_title: 'SWUWS Anonymous Suggestion Box',
  intro_text: 'Your voice matters. Share your concerns, ideas and recommendations confidentially.',
  privacy_notice: 'We do not store your name, email, IP address or device details with your submission.',
  categories: ['General suggestion','Work environment','Staff welfare','Management','Service delivery','Customer complaint','Ethics or misconduct','Health and safety','Other'],
  max_message_length: 5000,
  default_status: null,
  default_category: null
}

const CACHE_KEY = 'swuws_public_settings_cache'

export function useSettings() {
  const [s, setS] = useState<PS>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) return JSON.parse(cached) as PS
    } catch { /* ignore */ }
    return DEFAULT_SETTINGS
  })
  useEffect(() => {
    supabase.rpc('public_settings').then(({ data }) => {
      if (data) {
        setS(data as PS)
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch { /* ignore */ }
      }
    })
  }, [])
  return s
}
