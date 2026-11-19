import { useState } from 'react'
import { useInfiniteQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/dashboard/Sidebar.jsx'
import useAuthStore from '../../store/authStore.js'
import { clearSession } from '../../utils/authStorage.js'
import {
  fetchAccessLog, downloadAccessLog, exportAllData, signOutEverywhere, deleteAccount,
} from '../../api/account.js'

const FILTERS = [
  { id: '', label: 'Everything' },
  { id: 'data.access', label: 'Data access' },
  { id: 'auth', label: 'Sign-ins & security' },
]

const errorText = err => err?.response?.data?.error || err?.message || 'Something went wrong'

function formatWhen(iso) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function describeDevice(ua = '') {
  if (!ua) return ''
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  const os = /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : ''
  return [browser, os].filter(Boolean).join(' on ')
}

function Section({ title, kicker, children }) {
  return (
    <section className="border-t border-black pt-8 pb-10 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 lg:gap-12">
      <div>
        <p className="text-[11px] font-bold font-circular uppercase tracking-wider text-black/50 mb-2">{kicker}</p>
        <h2 className="text-[26px] font-bold font-roc leading-tight text-black">{title}</h2>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

function PillButton({ children, onClick, disabled, tone = 'default', type = 'button' }) {
  const tones = {
    default: 'bg-white text-black hover:bg-black hover:text-white',
    danger: 'bg-[#f74700] text-white border-black hover:bg-black',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-5 py-2 rounded-full border-2 border-black text-[12px] font-bold font-circular uppercase tracking-wider transition-all shadow-[2px_2px_0px_black] hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed ${tones[tone]}`}
    >
      {children}
    </button>
  )
}

function AccessLog() {
  const [filter, setFilter] = useState('')
  const [downloadError, setDownloadError] = useState('')
  const query = useInfiniteQuery({
    queryKey: ['access-log', filter],
    queryFn: ({ pageParam }) => fetchAccessLog({ cursor: pageParam, type: filter || undefined }),
    initialPageParam: undefined,
    getNextPageParam: last => last.nextCursor || undefined,
  })
  const entries = query.data?.pages.flatMap(p => p.entries) || []
  const retention = query.data?.pages[0]?.retentionDays ?? 30

  return (
    <div>
      <p className="text-[15px] font-circular text-black/70 leading-relaxed max-w-[620px] mb-5">
        Every time your saved content is decrypted — by you, or by our servers for AI tagging — it's recorded here.
        Entries contain no content, only what was accessed and why. Kept for {retention} days.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {FILTERS.map(f => (
          <button
            key={f.id || 'all'}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-1.5 rounded-full border-2 border-black text-[12px] font-bold font-circular transition-colors ${filter === f.id ? 'bg-black text-white' : 'bg-white text-black hover:bg-black/5'}`}
          >
            {f.label}
          </button>
        ))}
        <div className="flex-1" />
        <PillButton onClick={() => downloadAccessLog().catch(e => setDownloadError(errorText(e)))}>Download CSV</PillButton>
      </div>
      {downloadError && <p className="text-[13px] text-[#f74700] font-circular mb-3">{downloadError}</p>}

      <div className="border-2 border-black rounded-[12px] bg-white overflow-hidden">
        {query.isLoading && <p className="p-6 text-[14px] font-circular text-black/50">Loading…</p>}
        {query.isError && <p className="p-6 text-[14px] font-circular text-[#f74700]">{errorText(query.error)}</p>}
        {!query.isLoading && entries.length === 0 && !query.isError && (
          <p className="p-6 text-[14px] font-circular text-black/50">Nothing recorded yet.</p>
        )}
        <ul className="divide-y divide-black/10">
          {entries.map(e => {
            const count = e.resources.reduce((s, r) => s + r.count, 0)
            const isSystem = e.actor === 'system'
            const isSecurity = e.type.startsWith('auth.')
            return (
              <li key={e.id} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 px-5 py-3">
                <span className="text-[12px] font-mono text-black/50 w-[130px] shrink-0">{formatWhen(e.at)}</span>
                <span
                  className={`self-start sm:self-auto text-[10px] font-bold font-circular uppercase tracking-wider px-2 py-0.5 rounded-full border border-black shrink-0 ${isSystem ? 'bg-[#9439f9] text-white' : isSecurity ? 'bg-[#faa200]' : 'bg-[#fff8f4]'}`}
                >
                  {isSystem ? 'Corpus server' : isSecurity ? 'Security' : 'You'}
                </span>
                <span className="text-[14px] font-circular text-black flex-1 min-w-0">
                  {e.purpose}
                  {count > 0 && <span className="text-black/50"> · {count} {count === 1 ? 'record' : 'records'}</span>}
                  {e.repeat > 1 && <span className="text-black/50"> · ×{e.repeat}</span>}
                </span>
                <span className="text-[12px] font-circular text-black/40 truncate sm:max-w-[200px]">
                  {isSystem ? 'background job' : describeDevice(e.userAgent)}
                </span>
              </li>
            )
          })}
        </ul>
        {query.hasNextPage && (
          <div className="p-4 border-t border-black/10 text-center">
            <PillButton onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
              {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
            </PillButton>
          </div>
        )}
      </div>
    </div>
  )
}

function DeleteAccount({ onDeleted }) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [password, setPassword] = useState('')
  const mutation = useMutation({ mutationFn: () => deleteAccount(password), onSuccess: onDeleted })

  if (!open) {
    return <PillButton tone="danger" onClick={() => setOpen(true)}>Delete my account</PillButton>
  }
  return (
    <form
      className="border-2 border-black rounded-[12px] bg-white p-5 max-w-[520px] flex flex-col gap-4"
      onSubmit={e => { e.preventDefault(); mutation.mutate() }}
    >
      <p className="text-[14px] font-circular text-black/80 leading-relaxed">
        This destroys your encryption key first, which makes every saved item unreadable immediately — including copies
        in our database backups — and then deletes your items, spaces, images and access log. <b>This cannot be undone.</b>
      </p>
      <label className="flex flex-col gap-1.5 text-[12px] font-bold font-circular uppercase tracking-wider">
        Password
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Leave empty if you only use Google sign-in"
          className="border-2 border-black rounded-[8px] px-3 py-2 text-[14px] font-normal normal-case tracking-normal"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-[12px] font-bold font-circular uppercase tracking-wider">
        Type DELETE MY ACCOUNT to confirm
        <input
          value={typed}
          onChange={e => setTyped(e.target.value)}
          className="border-2 border-black rounded-[8px] px-3 py-2 text-[14px] font-normal normal-case tracking-normal"
        />
      </label>
      {mutation.isError && <p className="text-[13px] text-[#f74700] font-circular">{errorText(mutation.error)}</p>}
      <div className="flex gap-2">
        <PillButton type="submit" tone="danger" disabled={typed !== 'DELETE MY ACCOUNT' || mutation.isPending}>
          {mutation.isPending ? 'Deleting…' : 'Permanently delete'}
        </PillButton>
        <PillButton onClick={() => { setOpen(false); setTyped(''); setPassword('') }}>Cancel</PillButton>
      </div>
    </form>
  )
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const clearAuth = useAuthStore(s => s.clearAuth)
  const [notice, setNotice] = useState('')

  const exportMutation = useMutation({ mutationFn: exportAllData })
  const signOutMutation = useMutation({ mutationFn: signOutEverywhere, onSuccess: () => leave('/login') })

  function leave(to) {
    clearAuth()
    clearSession()
    navigate(to, { replace: true })
  }

  return (
    <div className="min-h-screen relative w-full">
      <div className="fixed inset-0 pointer-events-none bg-grid-overlay z-0" />
      <div className="relative z-10 flex min-h-screen w-full">
        <Sidebar />
        <main className="relative z-10 flex-1 pt-[26px] pr-6 pb-16 min-w-0 pl-6 lg:pl-10 max-w-[1200px]">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
            <div>
              <h1 className="text-[48px] font-bold font-roc leading-none text-black">Privacy &amp; Security</h1>
              <p className="mt-3 text-[15px] font-circular text-black/60">
                How your data is protected, and full control over it.{' '}
                <a href="/security" className="underline font-bold text-black">Read our security model →</a>
              </p>
            </div>
          </div>

          {notice && <p className="mb-6 text-[14px] font-circular bg-[#259d27] text-white px-4 py-2 rounded-full inline-block">{notice}</p>}

          <Section kicker="Protection" title="Encryption">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                ['Per-account key', 'Your content is encrypted with a key unique to your account, which is itself encrypted by a master key held outside our database.'],
                ['AES-256-GCM', 'Titles, notes, links, summaries, tags and space names are encrypted before they reach the database, and bound to your account so they cannot be moved.'],
                ['Private images', 'Uploaded images live in a private store and are served through links that expire.'],
              ].map(([h, p]) => (
                <div key={h} className="border-2 border-black rounded-[12px] bg-white p-4 shadow-[3px_3px_0px_black]">
                  <p className="text-[15px] font-bold font-circular mb-1.5">{h}</p>
                  <p className="text-[13px] font-circular text-black/65 leading-relaxed">{p}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section kicker="Transparency" title="Access log">
            <AccessLog />
          </Section>

          <Section kicker="Portability" title="Your data">
            <p className="text-[15px] font-circular text-black/70 leading-relaxed max-w-[620px] mb-4">
              Download everything you've saved — items, notes, tags and spaces — as a decrypted JSON file.
            </p>
            <PillButton onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
              {exportMutation.isPending ? 'Preparing…' : 'Export all data'}
            </PillButton>
            {exportMutation.isError && <p className="mt-3 text-[13px] text-[#f74700] font-circular">{errorText(exportMutation.error)}</p>}
          </Section>

          <Section kicker="Sessions" title="Devices">
            <p className="text-[15px] font-circular text-black/70 leading-relaxed max-w-[620px] mb-4">
              Lost a device or signed in somewhere public? Sign out of every session, including this one.
            </p>
            <PillButton onClick={() => signOutMutation.mutate()} disabled={signOutMutation.isPending}>
              Sign out everywhere
            </PillButton>
          </Section>

          <Section kicker="Danger zone" title="Delete account">
            <DeleteAccount onDeleted={() => { setNotice('Account deleted'); leave('/') }} />
          </Section>
        </main>
      </div>
    </div>
  )
}
