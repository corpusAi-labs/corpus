import Groq from 'groq-sdk'

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

// try these in order — if the primary model is deprecated/renamed by Groq,
// fall back automatically instead of failing outright
const MODELS = [
  'groq/compound-mini',
  'groq/compound',
  'qwen/qwen3.6-27b',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
]

export function detectContentType(url) {
  if (!url) return 'webpage'
  try {
    const parsedUrl = new URL(url)
    const hostname = parsedUrl.hostname.toLowerCase()
    const pathname = parsedUrl.pathname.toLowerCase()

    // Hostname subdomain-safe matcher helper
    const isDomain = (domain) => hostname === domain || hostname.endsWith('.' + domain)

    if (isDomain('youtube.com') || isDomain('youtu.be')) return 'youtube'
    if (isDomain('github.com')) return 'github'
    if (isDomain('twitter.com') || isDomain('x.com')) return 'tweet'
    if (isDomain('reddit.com')) return 'reddit'
    if (isDomain('instagram.com')) return 'instagram'
    if (isDomain('linkedin.com')) return 'linkedin'
    if (isDomain('medium.com') || isDomain('substack.com') || isDomain('dev.to')) return 'article'
    if (pathname.endsWith('.pdf')) return 'pdf'
  } catch (err) {
    console.error('[ai classification] failed to parse URL for type detection:', url, err.message)
  }
  return 'webpage'
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function callGroq(messages) {
  let lastError
  const maxAttempts = 2
  for (const model of MODELS) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[ai] calling Groq with model=${model} attempt=${attempt}`)
        const result = await client.chat.completions.create({
          model,
          max_tokens: 300,
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages,
        })
        return result
      } catch (err) {
        lastError = err
        const status = err.status
        const msg = err.message
        
        console.error(`[ai] model=${model} attempt=${attempt} failed | status=${status || 'network/timeout'} | error=${msg}`)
        
        // Determine if we should retry this attempt on the CURRENT model
        const isTemporary = !status || status === 429 || status >= 500
        
        if (isTemporary && attempt < maxAttempts) {
          console.log(`[ai] temporary error detected, retrying model=${model} after backoff...`)
          await sleep(700 * attempt)
          continue
        }
        
        // If it's a permanent authentication or permissions issue (401, 403), stop completely.
        if (status === 401 || status === 403) {
          console.error(`[ai] permanent auth/credentials failure (status=${status}). Aborting execution.`)
          throw err
        }
        
        // Otherwise (400, 404, or exhausted attempts for temporary error), switch to the next model
        console.log(`[ai] switching model from ${model} due to final attempt failure or non-temporary error (status=${status || 'unknown'})`)
        break
      }
    }
  }
  throw lastError
}

export async function generateSummaryAndTags({ title, content, url, type }) {
  if (!process.env.GROQ_API_KEY) {
    console.error('[ai] GROQ_API_KEY is not set — AI tagging will not work. Check environment variables.')
    return { summary: '', tags: [], contentType: detectContentType(url), failed: true }
  }

  const contentType = detectContentType(url)
  const domain = url ? (() => { try { return new URL(url).hostname.replace('www.', '') } catch { return '' } })() : ''
  
  // Format the input text clearly for the AI
  let inputText = `Title: ${title || 'Untitled'}\n`
  if (url) inputText += `URL: ${url}\nDomain: ${domain}\n`
  if (contentType) inputText += `Category: ${contentType}\n`
  if (type) inputText += `Type: ${type}\n`
  
  const truncatedContent = content ? content.slice(0, 4000) : ''
  inputText += `Content:\n${truncatedContent || '(No page body content could be extracted. Please generate summary and tags based on the URL and title alone. Do not hallucinate content.)'}`

  console.log(`[ai] preparing summary and tags for item. Title: "${title || 'Untitled'}", Type: ${type}, Category: ${contentType}, input length: ${inputText.length}`)

  try {
    const result = await callGroq([
      {
        role: 'system',
        content: `You are a personal knowledge assistant helping someone tag and summarize items they saved.
Your job is to analyze the provided metadata and content, then generate a summary and 4 to 7 highly specific, memorable tags.

CRITICAL RULES:
1. SUMMARY:
   - Provide a single, concise, useful summary sentence explaining exactly what this is and why someone would save it.
   - Strictly maximum 35 words.
   - Do NOT invent facts or hallucinate details not directly present or clearly implied by the supplied content.
   - If the content is empty, summarize based strictly on the title and URL without inventing details.

2. TAGGING RULES:
   - Generate between 4 and 7 tags.
   - Tags must be lowercase, with spaces converted to hyphens (e.g., "react-hooks", "system-design").
   - Do NOT generate generic tags like "code", "website", "technology", "article", "link", "programming", "video".
   - Make tags highly specific and searchable (e.g., "react-hooks" instead of "code", "javascript-async" instead of "programming").
   - Do not include duplicate tags.

3. CATEGORY/PLATFORM-SPECIFIC TAGS:
   - YouTube: Include "youtube", the channel/author name (if known), and the specific topic/subject.
   - GitHub: Include "github", the primary programming language, the framework/library name, and what the project does.
   - Articles: Include the site name (if notable/known, e.g., "medium", "devto", "substack"), and the core concepts/subject.
   - Notes/Quotes: Focus purely on the concepts, themes, and ideas. Do NOT invent a platform or site tag.
   - Images: Use only the supplied title/metadata. Do NOT hallucinate visual details since no vision model is active.

OUTPUT FORMAT:
Return ONLY a valid JSON object matching this schema:
{
  "summary": "Concise summary sentence.",
  "tags": ["tag-one", "tag-two", "tag-three", "tag-four"]
}`,
      },
      {
        role: 'user',
        content: inputText,
      },
    ])

    const raw = result.choices[0].message.content.trim()
    
    // Parse, Clean, and Validate response
    let parsedObj
    try {
      let cleaned = raw
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/, '').trim()
      }
      const firstBrace = cleaned.indexOf('{')
      const lastBrace = cleaned.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1)
      }
      parsedObj = JSON.parse(cleaned)
    } catch (e) {
      console.error('[ai] JSON parsing of AI output failed:', e.message, '| Raw content:', raw)
      return { summary: '', tags: [], contentType, failed: true }
    }

    if (!parsedObj || typeof parsedObj !== 'object') {
      console.error('[ai] Parsed output is not a valid JSON object')
      return { summary: '', tags: [], contentType, failed: true }
    }

    let summary = parsedObj.summary
    if (typeof summary !== 'string') {
      console.error('[ai] Validation failed: summary is not a string')
      return { summary: '', tags: [], contentType, failed: true }
    }
    summary = summary.trim()
    if (!summary) {
      console.error('[ai] Validation failed: summary is empty')
      return { summary: '', tags: [], contentType, failed: true }
    }

    let tags = parsedObj.tags
    if (!Array.isArray(tags)) {
      console.error('[ai] Validation failed: tags is not an array')
      return { summary: '', tags: [], contentType, failed: true }
    }

    const normalizedTags = []
    const seenTags = new Set()

    for (let tag of tags) {
      if (typeof tag !== 'string' && typeof tag !== 'number') {
        continue
      }
      const normalized = String(tag)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-') // convert spaces to hyphens
        
      if (normalized && !seenTags.has(normalized)) {
        seenTags.add(normalized)
        normalizedTags.push(normalized)
      }
    }

    if (normalizedTags.length < 4) {
      console.error('[ai] Validation failed: less than 4 valid normalized tags:', normalizedTags)
      return { summary: '', tags: [], contentType, failed: true }
    }

    const finalTags = normalizedTags.slice(0, 7) // maximum 7 tags
    
    console.log(`[ai] AI generation succeeded. Summary: "${summary.slice(0, 50)}...", Tags: [${finalTags.join(', ')}]`)
    
    return {
      summary,
      tags: finalTags,
      contentType,
      failed: false,
    }
  } catch (err) {
    console.error('[ai] all models/attempts exhausted during generation:', err.status || 'network/timeout', err.message)
    return { summary: '', tags: [], contentType, failed: true }
  }
}

