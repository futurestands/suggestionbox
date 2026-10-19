import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Download, Eye, EyeOff, LogOut, Trash2 } from 'lucide-react'
import { CATEGORIES, STATUSES, supabase } from '../lib/supabase'
import { useSettings } from '../lib/settings'
import { Reports, Settings } from './Extras'
type S = { id: string; category: string; subject: string | null; message: string; suggested_solution: string | null; status: string; action_taken: string | null; resolution_summary: string | null; created_at: string; updated_at: string }
type N = { id: string; note: string; created_at: string }
const box = 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm'
export default function Manager() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [role, setRole] = useState<string | null>(null)
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return setRole(null)
    supabase.from('manager_roles').select('role').eq('user_id', session.user.id).eq('active', true).maybeSingle().then(({ data }) => setRole(data?.role ?? 'none'))
  }, [session])

  if (session === undefined) return <p className="p-8">Loading…</p>
  if (recovery) return <ResetPassword onSuccess={() => setRecovery(false)} />
  if (!session) return <Login />
  if (role === null) return <p className="p-8">Loading…</p>
  if (role === 'none') return <div className="p-8">Your account is not authorised. <button className="underline" onClick={() => supabase.auth.signOut()}>Sign out</button></div>
  return <Dash canEdit={role !== 'reviewer'} isAdmin={role === 'admin'} />
}

function Login() {
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [email, setE] = useState(''); const [pw, setP] = useState(''); const [showPw, setShowPw] = useState(false)
  const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)

  async function go(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setMsg(''); setBusy(true)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
      if (error) setErr(error.message || 'Sign-in failed. Please check your email and password.')
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/manager'
      })
      if (error) setErr(error.message || 'Could not send reset email. Please try again.')
      else setMsg('A password reset link has been sent to your email.')
    }
    setBusy(false)
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <form onSubmit={go} className="bg-white border border-slate-200 rounded-2xl p-8 w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">{mode === 'login' ? 'Manager sign-in' : 'Reset password'}</h1>

        <div>
          <label className="block text-xs text-slate-500 mb-1">Email address</label>
          <input required type="email" className={box + ' w-full'} placeholder="Email" value={email} onChange={e => setE(e.target.value)}/>
        </div>

        {mode === 'login' && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-slate-500">Password</label>
              <button type="button" onClick={() => { setMode('forgot'); setErr(''); setMsg('') }} className="text-xs text-blue-600 hover:underline">Forgot password?</button>
            </div>
            <div className="relative">
              <input required type={showPw ? 'text' : 'password'} className={box + ' w-full pr-10'} placeholder="Password" value={pw} onChange={e => setP(e.target.value)}/>
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none" aria-label={showPw ? 'Hide password' : 'Show password'}>
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        )}

        {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
        {msg && <p role="status" className="text-sm text-green-700">{msg}</p>}

        <button disabled={busy} className="w-full rounded-lg bg-blue-600 text-white py-2 font-medium disabled:opacity-60">
          {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Send reset link'}
        </button>

        {mode === 'forgot' && (
          <button type="button" onClick={() => { setMode('login'); setErr(''); setMsg('') }} className="w-full text-center text-sm text-slate-600 hover:underline">
            Back to sign in
          </button>
        )}
      </form>
    </div>
  )
}

function ResetPassword({ onSuccess }: { onSuccess: () => void }) {
  const [pw, setP] = useState(''); const [showPw, setShowPw] = useState(false)
  const [err, setErr] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)

  async function go(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setMsg(''); setBusy(true)
    if (pw.length < 6) { setErr('Password must be at least 6 characters.'); setBusy(false); return }
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) setErr(error.message || 'Could not update password. Please try again.')
    else {
      setMsg('Password updated successfully! Redirecting…')
      setTimeout(() => {
        onSuccess()
      }, 1500)
    }
    setBusy(false)
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <form onSubmit={go} className="bg-white border border-slate-200 rounded-2xl p-8 w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">Set new password</h1>
        <p className="text-xs text-slate-500">Enter a new password for your manager account.</p>
        <div className="relative">
          <input required type={showPw ? 'text' : 'password'} className={box + ' w-full pr-10'} placeholder="New password" value={pw} onChange={e => setP(e.target.value)}/>
          <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none">
            {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
        {msg && <p role="status" className="text-sm text-green-700">{msg}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-blue-600 text-white py-2 font-medium disabled:opacity-60">
          {busy ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
function Dash({ canEdit, isAdmin }: { canEdit: boolean; isAdmin: boolean }) {
  const ps = useSettings(); const cats = ps?.categories ?? CATEGORIES
  const [view, setView] = useState('list'); const [picked, setPicked] = useState<Set<string>>(new Set())
  const [rows, setRows] = useState<S[]>([]); const [count, setCount] = useState(0); const [counts, setCounts] = useState<Record<string, number>>({})
  const [status, setStatus] = useState(''); const [cat, setCat] = useState(''); const [q, setQ] = useState(''); const [from, setFrom] = useState(''); const [to, setTo] = useState('')
  const [asc, setAsc] = useState(false); const [page, setPage] = useState(0); const [size, setSize] = useState(25)
  const [sel, setSel] = useState<S | null>(null); const [loading, setLoading] = useState(true); const [err, setErr] = useState('')
  const query = useCallback((sel: string, head = false) => {
    let r = supabase.from('suggestions').select(sel, { count: 'exact', head })
    if (status && status !== '*') r = r.eq('status', status); if (cat) r = r.eq('category', cat)
    if (from) r = r.gte('created_at', from); if (to) r = r.lte('created_at', to + 'T23:59:59')
    const t = q.replace(/[%,()]/g, ' ').trim(); if (t) r = r.or(`subject.ilike.%${t}%,message.ilike.%${t}%`)
    return r.order('created_at', { ascending: asc })
  }, [status, cat, q, from, to, asc])
  const load = useCallback(async () => {
    setLoading(true); setErr('')
    const { data, count, error } = await query('*').range(page * size, page * size + size - 1)
    if (error) setErr('Could not load submissions.'); else { setRows(data as unknown as S[]); setCount(count ?? 0) }
    const c: Record<string, number> = {}
    for (const s of STATUSES) { const r = await supabase.from('suggestions').select('id', { count: 'exact', head: true }).eq('status', s); c[s] = r.count ?? 0 }
    setCounts(c); setLoading(false)
  }, [query, page, size])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (ps) { setStatus(ps.default_status ?? ''); setCat(ps.default_category ?? '') } }, [ps])
  async function exportCsv() {
    let { data } = await query('*'); if (!data) return; if (picked.size) data = (data as unknown as S[]).filter(r => picked.has(r.id)) as never
    const esc = (v: unknown) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"' }
    const csv = ['id,created_at,category,subject,message,suggested_solution,status,action_taken,resolution_summary', ...(data as unknown as S[]).map(r => [r.id, r.created_at, r.category, r.subject, r.message, r.suggested_solution, r.status, r.action_taken, r.resolution_summary].map(esc).join(','))].join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'suggestions.csv'; a.click()
  }
  async function deleteSelected() {
    if (!picked.size) return
    if (!confirm(`Permanently delete ${picked.size} selected submission(s)?`)) return
    const { error } = await supabase.from('suggestions').delete().in('id', Array.from(picked))
    if (error) setErr('Could not delete selected submissions.')
    else { setPicked(new Set()); load() }
  }
  const nav = [['Dashboard', ''], ['All Suggestions', '*'], ['New Submissions', 'New'], ['Under Review', 'Under Review'], ['Resolved', 'Resolved']]
  return (<div className="min-h-screen md:flex">
    <aside className="md:w-56 bg-white border-b md:border-r border-slate-200 p-3 flex md:flex-col gap-1 overflow-x-auto"><div className="font-semibold px-2 py-2">Suggestion Box</div>
      {nav.map(([l, s]) => <button key={l} onClick={() => { setStatus(s); setPage(0); setView('list') }} className={`text-left rounded-lg px-3 py-2 text-sm whitespace-nowrap ${status === s ? 'bg-blue-50 text-blue-800 font-medium' : 'hover:bg-slate-100'}`}>{l}</button>)}
      <button onClick={() => setView('reports')} className="text-left rounded-lg px-3 py-2 text-sm hover:bg-slate-100">Reports</button>
      {isAdmin && <><button onClick={() => setView('settings')} className="text-left rounded-lg px-3 py-2 text-sm hover:bg-slate-100">Categories</button><button onClick={() => setView('settings')} className="text-left rounded-lg px-3 py-2 text-sm hover:bg-slate-100">Settings</button></>}
      <button onClick={() => supabase.auth.signOut()} className="md:mt-auto flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-100 rounded-lg"><LogOut size={16}/>Logout</button></aside>
    <main className="flex-1 p-4 min-w-0 space-y-4">
      {view === 'reports' ? <Reports/> : view === 'settings' && isAdmin ? <Settings/> : <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[['Total', counts.New + counts['Under Review'] + counts.Resolved || 0], ['New', counts.New], ['Under review', counts['Under Review']], ['Resolved', counts.Resolved]].map(([l, v]) => <div key={l as string} className="bg-white border border-slate-200 rounded-xl p-4"><div className="text-sm text-slate-500">{l}</div><div className="text-2xl font-semibold">{v ?? 0}</div></div>)}</div>
      <div className="flex flex-wrap gap-2 items-center">
        <input className={box} placeholder="Search…" value={q} onChange={e => { setQ(e.target.value); setPage(0) }}/>
        <select className={box} value={cat} onChange={e => { setCat(e.target.value); setPage(0) }}><option value="">All categories</option>{cats.map(c => <option key={c}>{c}</option>)}</select>
        <input type="date" className={box} aria-label="From" value={from} onChange={e => setFrom(e.target.value)}/><input type="date" className={box} aria-label="To" value={to} onChange={e => setTo(e.target.value)}/>
        <select className={box} value={size} onChange={e => { setSize(+e.target.value); setPage(0) }}>{[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}</select>
        <button onClick={exportCsv} className={box + ' flex items-center gap-1 bg-white'}><Download size={14}/>{picked.size ? `CSV (${picked.size} selected)` : 'CSV'}</button>
        {isAdmin && picked.size > 0 && <button onClick={deleteSelected} className={box + ' flex items-center gap-1 bg-red-50 text-red-700 border-red-200 hover:bg-red-100'}><Trash2 size={14}/>Delete ({picked.size})</button>}
        <button onClick={() => window.print()} className={box + ' bg-white'}>Print</button></div>
      {err && <p role="alert" className="text-red-700">{err}</p>}
      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left"><tr><th className="px-3 py-2"><span className="sr-only">Select</span></th>{['Reference', 'Received', 'Category', 'Subject', 'Message', 'Status', 'Updated'].map(h => <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">{h === 'Received' ? <button onClick={() => setAsc(!asc)}>Received {asc ? '↑' : '↓'}</button> : h}</th>)}</tr></thead>
        <tbody>{loading ? <tr><td colSpan={8} className="p-6 text-center text-slate-500">Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={8} className="p-6 text-center text-slate-500">No submissions match these filters.</td></tr> : rows.map(r => <tr key={r.id} onClick={() => setSel(r)} className="border-t border-slate-100 hover:bg-blue-50 cursor-pointer">
          <td className="px-3 py-2" onClick={e => e.stopPropagation()}><input type="checkbox" aria-label="Select row" checked={picked.has(r.id)} onChange={() => { const n = new Set(picked); n.has(r.id) ? n.delete(r.id) : n.add(r.id); setPicked(n) }}/></td><td className="px-3 py-2 font-mono text-xs">{r.id.slice(0, 8)}</td><td className="px-3 py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td><td className="px-3 py-2">{r.category}</td><td className="px-3 py-2">{r.subject}</td><td className="px-3 py-2 max-w-xs truncate">{r.message}</td><td className="px-3 py-2">{r.status}</td><td className="px-3 py-2 whitespace-nowrap">{new Date(r.updated_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>
      <div className="flex items-center gap-3 text-sm"><button disabled={page === 0} onClick={() => setPage(page - 1)} className={box}>Previous</button><span>Page {page + 1} of {Math.max(1, Math.ceil(count / size))} ({count} total)</span><button disabled={(page + 1) * size >= count} onClick={() => setPage(page + 1)} className={box}>Next</button></div>
    </>}</main>
    {sel && <Detail s={sel} canEdit={canEdit} isAdmin={isAdmin} onClose={() => setSel(null)} onSaved={() => { setSel(null); load() }}/>}
  </div>)
}
function Detail({ s, canEdit, isAdmin, onClose, onSaved }: { s: S; canEdit: boolean; isAdmin: boolean; onClose: () => void; onSaved: () => void }) {
  const [st, setSt] = useState(s.status); const [act, setAct] = useState(s.action_taken ?? ''); const [res, setRes] = useState(s.resolution_summary ?? '')
  const [notes, setNotes] = useState<N[]>([]); const [note, setNote] = useState(''); const [err, setErr] = useState('')
  const loadNotes = useCallback(() => { supabase.from('suggestion_notes').select('id,note,created_at').eq('suggestion_id', s.id).order('created_at').then(({ data }) => setNotes((data as N[]) ?? [])) }, [s.id])
  useEffect(loadNotes, [loadNotes])
  async function save() { const { error } = await supabase.from('suggestions').update({ status: st, action_taken: act || null, resolution_summary: res || null }).eq('id', s.id); if (error) setErr('Save failed.'); else onSaved() }
  async function remove() { if (!confirm('Are you sure you want to permanently delete this submission?')) return; const { error } = await supabase.from('suggestions').delete().eq('id', s.id); if (error) setErr('Delete failed.'); else onSaved() }
  async function addNote() { if (!note.trim()) return; const { data: u } = await supabase.auth.getUser(); const { error } = await supabase.from('suggestion_notes').insert({ suggestion_id: s.id, note: note.trim(), manager_id: u.user!.id }); if (error) setErr('Could not add note.'); else { setNote(''); loadNotes() } }
  return (<div className="fixed inset-0 bg-black/30 flex justify-end" onClick={onClose}><div className="bg-white w-full max-w-lg h-full overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()} role="dialog" aria-label="Submission detail">
    <div className="flex justify-between"><h2 className="font-semibold text-lg">{s.subject || s.category}</h2><button onClick={onClose} aria-label="Close">✕</button></div>
    <p className="text-xs text-slate-500">{s.category} · received {new Date(s.created_at).toLocaleString()}</p>
    <section><h3 className="font-medium text-sm">Message</h3><p className="whitespace-pre-wrap">{s.message}</p></section>
    {s.suggested_solution && <section><h3 className="font-medium text-sm">Suggested solution</h3><p className="whitespace-pre-wrap">{s.suggested_solution}</p></section>}
    <label className="block text-sm font-medium">Status<select disabled={!canEdit} className={box + ' block w-full mt-1'} value={st} onChange={e => setSt(e.target.value)}>{STATUSES.map(x => <option key={x}>{x}</option>)}</select></label>
    <label className="block text-sm font-medium">Action taken<textarea disabled={!canEdit} className={box + ' block w-full mt-1'} value={act} onChange={e => setAct(e.target.value)}/></label>
    <label className="block text-sm font-medium">Resolution summary<textarea disabled={!canEdit} className={box + ' block w-full mt-1'} value={res} onChange={e => setRes(e.target.value)}/></label>
    <div className="flex gap-2 items-center">
      {canEdit && <button onClick={save} className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium">Save changes</button>}
      {isAdmin && <button onClick={remove} className="rounded-lg bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm font-medium flex items-center gap-1"><Trash2 size={14}/> Delete submission</button>}
    </div>
    <section><h3 className="font-medium text-sm">Private notes</h3>{notes.map(n => <div key={n.id} className="border-t py-2 text-sm"><div className="text-xs text-slate-500">{new Date(n.created_at).toLocaleString()}</div>{n.note}</div>)}
      {canEdit && <div className="flex gap-2 mt-2"><input className={box + ' flex-1'} value={note} onChange={e => setNote(e.target.value)} placeholder="Add a private note"/><button onClick={addNote} className={box}>Add note</button></div>}</section>
    {err && <p role="alert" className="text-red-700 text-sm">{err}</p>}</div></div>)
}
