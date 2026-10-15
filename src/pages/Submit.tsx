import { useState } from 'react'
import { CheckCircle2, ShieldCheck } from 'lucide-react'
import { ANON_KEY, CATEGORIES, SUPABASE_URL } from '../lib/supabase'
import { useSettings } from '../lib/settings'
const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600'
export default function Submit() {
  const st = useSettings()
  const brand = st?.primary_color ?? '#2563eb', org = st?.org_name ?? '', max = st?.max_message_length ?? 5000
  const [f, setF] = useState({ category: '', subject: '', message: '', suggested_solution: '', website: '' })
  const [step, setStep] = useState(0); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false)
  const set = (k: string) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  function next() { if (!f.category) return setErr('Choose a category.'); if (!f.message.trim()) return setErr('Enter your message.'); setErr(''); setStep(1) }
  async function send(e: React.FormEvent) {
    e.preventDefault(); if (step === 0) return next(); setBusy(true); setErr('')
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/submit`, { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json', apikey: ANON_KEY }, body: JSON.stringify(f) })
      const j = await r.json().catch(() => ({})); if (!r.ok) setErr(j.error || 'Something went wrong. Please try again.'); else setDone(true)
    } catch { setErr('Network error. Please try again.') }
    setBusy(false)
  }
  return (<div className="min-h-screen flex flex-col"><main className="flex-1 mx-auto w-full max-w-2xl p-4 sm:p-8">
    <div className="flex items-center gap-3 mb-6">{st?.logo_url ? <img src={st.logo_url} alt={org + ' logo'} className="h-12 max-w-[10rem] object-contain" referrerPolicy="no-referrer"/> : <div className="h-12 w-12 rounded-lg grid place-items-center font-bold text-white" style={{ background: brand }} aria-label="Logo placeholder">{org[0] ?? ''}</div>}<span className="font-semibold">{org}</span></div>
    {done ? <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center"><CheckCircle2 className="mx-auto" style={{ color: brand }} size={48}/><h1 className="text-2xl font-semibold mt-4">Thank you</h1><p className="mt-2 text-slate-600">Your feedback has been received.</p></div> :
    <form onSubmit={send} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5 border-t-4" style={{ borderTopColor: brand }}>
      <div><h1 className="text-2xl font-semibold">{st?.form_title ?? 'SWUWS Anonymous Suggestion Box'}</h1><p className="text-slate-600 mt-1">{st?.intro_text ?? 'Your voice matters. Share your concerns, ideas and recommendations confidentially.'}</p></div>
      <div aria-label={`Step ${step + 1} of 2`} className="flex gap-2">{[0, 1].map(i => <div key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i <= step ? brand : '#e2e8f0' }}/>)}</div>
      <p className="text-sm rounded-lg p-3 flex gap-2" style={{ background: st?.secondary_color }}><ShieldCheck size={18} className="shrink-0 mt-0.5"/>Please do not include names or other identifying details unless your concern requires it.</p>
      {step === 0 ? <>
        <div><label htmlFor="c" className="block font-medium mb-1">Category *</label><select id="c" className={input} value={f.category} onChange={set('category')}><option value="">Select a category</option>{(st?.categories ?? CATEGORIES).map(c => <option key={c}>{c}</option>)}</select></div>
        <div><label htmlFor="s" className="block font-medium mb-1">Subject</label><input id="s" maxLength={200} className={input} value={f.subject} onChange={set('subject')}/></div>
        <div><label htmlFor="m" className="block font-medium mb-1">Message *</label><textarea id="m" rows={6} maxLength={max} className={input} value={f.message} onChange={set('message')}/><div className="text-xs text-slate-500 text-right">{f.message.length}/{max}</div></div></> :
        <div><label htmlFor="r" className="block font-medium mb-1">Suggested solution (optional)</label><textarea id="r" rows={5} maxLength={3000} className={input} value={f.suggested_solution} onChange={set('suggested_solution')}/></div>}
      <input tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={f.website} onChange={set('website')} name="website"/>
      {err && <p role="alert" className="text-red-700 text-sm">{err}</p>}
      <div className="flex gap-3">{step === 1 && <button type="button" onClick={() => setStep(0)} className="rounded-lg border border-slate-300 px-5 py-2.5">Back</button>}
        <button disabled={busy} className="rounded-lg text-white px-5 py-2.5 font-medium disabled:opacity-60" style={{ background: brand }}>{step === 0 ? 'Continue' : busy ? 'Sending…' : 'Send feedback'}</button></div>
    </form>}</main>
    <footer className="text-center text-xs text-slate-500 p-4 max-w-2xl mx-auto">{st?.privacy_notice}</footer></div>)
}
