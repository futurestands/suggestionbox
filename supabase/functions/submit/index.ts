import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const CATS = ['General suggestion','Work environment','Staff welfare','Management','Service delivery','Customer complaint','Ethics or misconduct','Health and safety','Other']
const cors = { 'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*', 'Access-Control-Allow-Headers': 'content-type, apikey, authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
// Ephemeral in-memory rate limit (hash only, never written to the database or logs).
const hits = new Map<string, number[]>()
async function key(ip: string) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + Deno.env.get('RL_SALT'))); return btoa(String.fromCharCode(...new Uint8Array(d))) }
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const k = await key(req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for') ?? 'x')
  const now = Date.now(); const recent = (hits.get(k) ?? []).filter(t => now - t < 600_000)
  if (recent.length >= 5) return json({ error: 'Too many submissions. Please try again later.' }, 429)
  const raw = await req.text()
  if (raw.length > 12_000) return json({ error: 'Submission too large.' }, 413)
  let b: Record<string, unknown>
  try { b = JSON.parse(raw) } catch { return json({ error: 'Invalid request.' }, 400) }
  if (b.website) return json({ ok: true }) // honeypot: pretend success to bots
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: cfg } = await db.from('settings').select('categories,max_message_length').eq('id', 1).single()
  const cats: string[] = cfg?.categories ?? CATS; const max: number = cfg?.max_message_length ?? 5000
  const str = (v: unknown, max: number) => typeof v === 'string' ? v.trim().slice(0, max + 1) : ''
  const category = str(b.category, 50), subject = str(b.subject, 200), message = str(b.message, 5000), sol = str(b.suggested_solution, 3000)
  if (!cats.includes(category)) return json({ error: 'Please choose a valid category.' }, 400)
  if (!message || message.length > max || subject.length > 200 || sol.length > 3000) return json({ error: 'Please check the message and field lengths.' }, 400)
  const { error } = await db.from('suggestions').insert({ category, subject: subject || null, message, suggested_solution: sol || null })
  if (error) return json({ error: 'Could not save your submission. Please try again.' }, 500)
  hits.set(k, [...recent, now])
  return json({ ok: true })
})
