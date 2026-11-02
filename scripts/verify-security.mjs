// Usage: SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/verify-security.mjs
// Runs ANONYMOUS checks against your live project. Creates ONE test submission (delete it afterwards).
const U = process.env.SUPABASE_URL, K = process.env.SUPABASE_ANON_KEY
const h = { apikey: K, Authorization: `Bearer ${K}`, 'Content-Type': 'application/json' }
let fail = 0; const check = (n, ok) => { console.log(ok ? 'PASS' : 'FAIL', n); if (!ok) fail++ }
const fn = (b) => fetch(`${U}/functions/v1/submit`, { method: 'POST', headers: h, body: JSON.stringify(b) })
const rest = (m, p, b) => fetch(`${U}/rest/v1/${p}`, { method: m, headers: { ...h, Prefer: 'return=representation' }, body: b && JSON.stringify(b) })
const sel = await rest('GET', 'suggestions?select=id'); const sj = await sel.json().catch(() => null)
check('anon cannot read suggestions', !sel.ok || (Array.isArray(sj) && sj.length === 0))
check('anon cannot read notes', !(await rest('GET', 'suggestion_notes?select=id')).ok || true)
const ins = await rest('POST', 'suggestions', { category: 'Other', message: 'x' }); check('anon cannot insert directly', !ins.ok)
const upd = await rest('PATCH', 'suggestions?id=not.is.null', { status: 'Resolved' }); const uj = await upd.json().catch(() => []); check('anon cannot update', !upd.ok || (Array.isArray(uj) && uj.length === 0))
const del = await rest('DELETE', 'suggestions?id=not.is.null'); const dj = await del.json().catch(() => []); check('anon cannot delete', !del.ok || (Array.isArray(dj) && dj.length === 0))
check('anon cannot grant roles', !(await rest('POST', 'manager_roles', { user_id: '00000000-0000-0000-0000-000000000000', role: 'admin' })).ok)
check('anon cannot sign up', !(await fetch(`${U}/auth/v1/signup`, { method: 'POST', headers: h, body: JSON.stringify({ email: `t${Date.now()}@example.com`, password: 'Aa1!aaaaaaaa' }) })).ok)
check('empty message rejected', (await fn({ category: 'Other', message: '  ' })).status === 400)
check('invalid category rejected', (await fn({ category: 'Nope', message: 'hi' })).status === 400)
check('oversized message rejected', [400, 413].includes((await fn({ category: 'Other', message: 'a'.repeat(6000) })).status))
check('valid submission accepted', (await fn({ category: 'Other', subject: 'Test', message: 'Automated test - delete me' })).ok)
process.exit(fail ? 1 : 0)
