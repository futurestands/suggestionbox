import { useEffect, useState } from 'react'
import { supabase } from './supabase'
export type PS = { org_name: string; logo_url: string | null; primary_color: string; secondary_color: string; form_title: string; intro_text: string; privacy_notice: string; categories: string[]; max_message_length: number; default_status: string | null; default_category: string | null }
export function useSettings() { const [s, setS] = useState<PS | null>(null); useEffect(() => { supabase.rpc('public_settings').then(({ data }) => { if (data) setS(data as PS) }) }, []); return s }
