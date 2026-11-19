import { Link } from 'react-router-dom'

const PILLARS = [
  {
    tag: 'Isolated',
    color: 'bg-[#0d5ddf]',
    title: 'A key for every account',
    body: 'Each account has its own data-encryption key. That key is stored only in wrapped (encrypted) form, sealed by a master key that lives outside our database. Every encrypted value is also bound to its owner, so it cannot be copied into anyone else’s account.',
  },
  {
    tag: 'Encrypted',
    color: 'bg-[#259d27]',
    title: 'Encrypted before it’s stored',
    body: 'Titles, notes, page content, links, AI summaries, tags and space names are encrypted with AES-256-GCM on our servers before they are written to the database. A database leak or a stolen backup reveals ciphertext, not your library.',
  },
  {
    tag: 'Logged',
    color: 'bg-[#9439f9]',
    title: 'Every read is on the record',
    body: 'Each time your content is decrypted — when you browse or search, or when our servers run AI tagging — we record what was accessed and why. You can review and download the last 30 days in Settings.',
  },
]

const FACTS = [
  ['Encryption', 'AES-256-GCM, field-level, per-account keys (envelope encryption)'],
  ['Key storage', 'Wrapped keys in our database; master key held in the server environment or a cloud KMS, never in the database'],
  ['Search', 'Tag filters and duplicate checks use keyed hashes (blind indexes), not plaintext'],
  ['Sessions', 'Short-lived access tokens; refresh tokens stored hashed, rotated on every use, with theft detection'],
  ['Codes', 'One-time codes stored as keyed hashes and locked after 5 wrong attempts'],
  ['Images', 'Private storage, served through links that expire'],
  ['Deletion', 'Deleting your account destroys your key first, so your data is unreadable even in backups'],
  ['Trash', 'Deleted items are permanently purged after 30 days'],
]

const HONEST = [
  ['Is Corpus end-to-end encrypted?', 'No. To tag, summarise and search your saves, our servers have to read them, so they decrypt content only while doing that work. We chose this so features like Deep Recall work, and every one of those reads appears in your access log.'],
  ['Who else sees my content?', 'To generate tags, summaries and search embeddings, text is sent to our AI processing partners (Groq and Google Gemini) over encrypted connections. Images you upload are stored with Cloudinary in private storage.'],
  ['What isn’t encrypted?', 'Your email address and name (needed to sign in), and item metadata such as type, dates and which space an item is in. Search embeddings are numeric vectors used for semantic search and are not encrypted.'],
  ['Can I take my data with me?', 'Yes. Settings → Export gives you everything you’ve saved as a JSON file, at any time.'],
]

export default function Security() {
  return (
    <div className="min-h-screen bg-[#fff8f4] text-black">
      <header className="max-w-[1120px] mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
        <Link to="/"><img src="/Frame 4.svg" alt="Corpus" className="h-8 w-auto" /></Link>
        <Link to="/dashboard" className="px-5 py-2 rounded-full border-2 border-black text-[12px] font-bold font-circular uppercase tracking-wider bg-white hover:bg-black hover:text-white transition-colors">
          Open Corpus
        </Link>
      </header>

      <main className="max-w-[1120px] mx-auto px-4 sm:px-6 pb-24">
        <section className="pt-10 pb-14 border-b border-black">
          <p className="text-[12px] font-bold font-circular uppercase tracking-wider text-black/50 mb-4">Security</p>
          <h1 className="text-[44px] sm:text-[72px] font-bold font-roc leading-[0.95] tracking-tight max-w-[900px]">
            Private by architecture.
          </h1>
          <p className="mt-6 text-[17px] font-circular text-black/70 leading-relaxed max-w-[640px]">
            Your second brain holds things you don’t share with anyone. Here is exactly how Corpus protects them —
            and, just as plainly, where the limits are.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 py-14">
          {PILLARS.map(p => (
            <article key={p.tag} className="border-2 border-black rounded-[14px] bg-white p-6 shadow-[4px_4px_0px_black]">
              <span className={`inline-block ${p.color} text-white text-[11px] font-bold font-circular uppercase tracking-wider px-3 py-1 rounded-full border border-black mb-4`}>
                {p.tag}
              </span>
              <h2 className="text-[22px] font-bold font-roc leading-tight mb-3">{p.title}</h2>
              <p className="text-[14px] font-circular text-black/70 leading-relaxed">{p.body}</p>
            </article>
          ))}
        </section>

        <section className="py-14 border-t border-black grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          <h2 className="text-[30px] font-bold font-roc leading-tight">The specifics</h2>
          <dl className="border-2 border-black rounded-[14px] bg-white divide-y divide-black/10 overflow-hidden">
            {FACTS.map(([k, v]) => (
              <div key={k} className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-1 sm:gap-6 px-5 py-4">
                <dt className="text-[13px] font-bold font-circular uppercase tracking-wider text-black/60">{k}</dt>
                <dd className="text-[15px] font-circular">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="py-14 border-t border-black grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          <h2 className="text-[30px] font-bold font-roc leading-tight">Straight answers</h2>
          <div className="flex flex-col gap-6">
            {HONEST.map(([q, a]) => (
              <div key={q}>
                <h3 className="text-[18px] font-bold font-circular mb-2">{q}</h3>
                <p className="text-[15px] font-circular text-black/70 leading-relaxed max-w-[680px]">{a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-14 border-t border-black flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <p className="text-[22px] font-bold font-roc max-w-[560px]">
            See your own access log, export your data, or delete your account at any time.
          </p>
          <Link to="/settings" className="self-start px-6 py-3 rounded-full border-2 border-black text-[13px] font-bold font-circular uppercase tracking-wider bg-black text-white hover:bg-[#f74700] transition-colors">
            Privacy settings
          </Link>
        </section>
      </main>
    </div>
  )
}
