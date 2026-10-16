import { useEffect, useState } from 'react'
import { supabase, STATUSES } from '../lib/supabase'
const box = 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm'
type R = { created_at: string; category: string; status: string; resolved_at: string | null }
function Bars({ title, data }: { title: string; data: [string, number][] }) {
  const max = Math.max(1, ...data.map(d => d[1]))
  return <div className="bg-white border border-slate-200 rounded-xl p-4"><h3 className="font-medium mb-2">{title}</h3>{data.length === 0 && <p className="text-sm text-slate-500">No data for this range.</p>}
    {data.map(([k, v]) => <div key={k} className="flex items-center gap-2 text-xs mb-1"><span className="w-28 truncate" title={k}>{k}</span><div className="flex-1 bg-slate-100 rounded"><div className="h-4 rounded bg-blue-600" style={{ width: `${(v / max) * 100}%` }}/></div><span className="w-8 text-right">{v}</span></div>)}</div>
}
export function Reports() {
  const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [rows, setRows] = useState<R[]>([])
  useEffect(() => { let r = supabase.from('suggestions').select('created_at,category,status,resolved_at').limit(10000); if (from) r = r.gte('created_at', from); if (to) r = r.lte('created_at', to + 'T23:59:59'); r.then(({ data }) => setRows((data as R[]) ?? [])) }, [from, to])
  const group = (f: (r: R) => string) => { const m: Record<string, number> = {}; rows.forEach(r => { const k = f(r); m[k] = (m[k] || 0) + 1 }); return Object.entries(m).sort() }
  const week = (r: R) => { const d = new Date(r.created_at); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10) }
  const done = rows.filter(r => r.resolved_at); const avg = done.length ? done.reduce((a, r) => a + (+new Date(r.resolved_at!) - +new Date(r.created_at)), 0) / done.length / 864e5 : 0
  const daily = group(r => r.created_at.slice(0, 10)), weekly = group(week), monthly = group(r => r.created_at.slice(0, 7))
  function exportCsv() { const lines = ['section,label,count', ...[['daily', daily], ['weekly', weekly], ['monthly', monthly], ['category', group(r => r.category)], ['status', group(r => r.status)]].flatMap(([s, d]) => (d as [string, number][]).map(([k, v]) => `${s},"${k.replace(/"/g, '""')}",${v}`))]; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' })); a.download = 'report-summary.csv'; a.click() }
  return <div className="space-y-4"><h1 className="text-xl font-semibold">Reports</h1>
    <div className="flex flex-wrap gap-2"><input type="date" aria-label="From" className={box} value={from} onChange={e => setFrom(e.target.value)}/><input type="date" aria-label="To" className={box} value={to} onChange={e => setTo(e.target.value)}/><button onClick={exportCsv} className={box + ' bg-white'}>Export summary CSV</button><button onClick={() => window.print()} className={box + ' bg-white'}>Print</button></div>
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">{[['Submissions', rows.length], ['Resolution rate', rows.length ? Math.round(done.length / rows.length * 100) + '%' : '0%'], ['Avg. days to resolve', done.length ? avg.toFixed(1) : 'n/a']].map(([l, v]) => <div key={l} className="bg-white border border-slate-200 rounded-xl p-4"><div className="text-sm text-slate-500">{l}</div><div className="text-2xl font-semibold">{v}</div></div>)}</div>
    <div className="grid lg:grid-cols-2 gap-3"><Bars title="Daily (latest 14 days)" data={daily.slice(-14)}/><Bars title="Weekly (latest 12, week starting)" data={weekly.slice(-12)}/><Bars title="Monthly (latest 12)" data={monthly.slice(-12)}/><Bars title="By category" data={group(r => r.category)}/><Bars title="By status" data={STATUSES.map(s => [s, rows.filter(r => r.status === s).length] as [string, number])}/></div></div>
}
export function Settings() {
  const [v, setV] = useState<Record<string, any> | null>(null); const [msg, setMsg] = useState('')
  useEffect(() => { supabase.from('settings').select('*').eq('id', 1).single().then(({ data }) => { if (data) setV({ ...data, categories: (data.categories as string[]).join('\n') }) }) }, [])
  if (!v) return <p>Loading…</p>
  const set = (k: string) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value })
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setMsg('Logo file too large (max 2MB).'); return }
    const reader = new FileReader()
    reader.onload = (evt) => { setV({ ...v, logo_url: evt.target?.result as string }); setMsg('Logo loaded. Click Save changes.') }
    reader.readAsDataURL(file)
  }
  async function save() {
    const { id, ...rest } = v!; const num = (x: any) => x === '' || x == null ? null : +x
    const { error } = await supabase.from('settings').update({ ...rest, categories: String(v!.categories).split('\n').map(x => x.trim()).filter(Boolean), max_message_length: +v!.max_message_length, retention_months: num(v!.retention_months), logo_url: v!.logo_url || null, default_status: v!.default_status || null, default_category: v!.default_category || null }).eq('id', 1)
    setMsg(error ? 'Save failed. Check values (message length 100-5000).' : 'Saved.')
  }
  async function purge() { if (!confirm('Permanently delete resolved submissions older than the retention period?')) return; const { data, error } = await supabase.rpc('run_retention'); setMsg(error ? 'Retention run failed.' : `Deleted ${data} submissions.`) }
  const F: [string, string, string?][] = [['org_name', 'Organisation name'], ['logo_url', 'Logo image URL or upload file'], ['primary_color', 'Primary colour', 'color'], ['secondary_color', 'Secondary colour', 'color'], ['form_title', 'Public form title'], ['intro_text', 'Introductory text', 'area'], ['privacy_notice', 'Privacy notice', 'area'], ['categories', 'Categories (one per line)', 'area'], ['max_message_length', 'Maximum message length (100-5000)', 'number'], ['retention_months', 'Retention in months for resolved items (blank = keep)', 'number'], ['default_status', 'Default dashboard status filter (New, Under Review, Resolved or blank)'], ['default_category', 'Default dashboard category filter (blank for all)']]
  return <div className="space-y-3 max-w-xl"><h1 className="text-xl font-semibold">Settings</h1>
    {F.map(([k, l, t]) => <label key={k} className="block text-sm font-medium">{l}{
      k === 'logo_url' ? (
        <div className="space-y-2 mt-1">
          <input type="text" className={box + ' block w-full'} placeholder="Paste image URL or upload file below" value={v[k] ?? ''} onChange={set(k)}/>
          <div className="flex items-center gap-3">
            <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm text-slate-500 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
            {v[k] && <img src={v[k]} alt="Logo preview" className="h-10 max-w-[8rem] object-contain border rounded p-1"/>}
          </div>
        </div>
      ) : t === 'area' ? <textarea rows={k === 'categories' ? 8 : 3} className={box + ' block w-full mt-1'} value={v[k] ?? ''} onChange={set(k)}/> : <input type={t ?? 'text'} className={box + ' block w-full mt-1'} value={v[k] ?? ''} onChange={set(k)}/>
    }</label>)}
    <div className="flex gap-2 items-center"><button onClick={save} className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm">Save changes</button><button onClick={purge} className={box + ' bg-white'}>Run retention now</button><span role="status" className="text-sm">{msg}</span></div></div>
}
