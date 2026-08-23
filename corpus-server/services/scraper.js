import ogs from 'open-graph-scraper'

export async function scrapeUrl(url) {
  const domain = (() => {
    try { return new URL(url).hostname.replace('www.', '') }
    catch { return url }
  })()

  let ogResult = {}
  try {
    const { result } = await ogs({ url, timeout: 8000 })
    ogResult = result || {}
  } catch (err) {
    console.warn('[scraper] open-graph-scraper lookup failed, falling back to manual fetch:', err.message)
  }

  let extractedText = ''
  try {
    // Perform manual fetch to get page text if HTML
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    })
    clearTimeout(timeoutId)

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('text/html')) {
      const html = await response.text()
      // Remove scripts, styles, metadata blocks, nav, headers, and footers
      let text = html.replace(/<(script|style|svg|noscript|header|footer|nav)[^>]*>[\s\S]*?<\/\1>/gi, '')
      // Strip html tags
      text = text.replace(/<[^>]+>/g, ' ')
      // Collapse whitespace
      text = text.replace(/\s+/g, ' ').trim()
      // Slice to first 3000 characters
      extractedText = text.slice(0, 3000)
    }
  } catch (err) {
    console.warn('[scraper] manual text extraction failed or timed out:', err.message)
  }

  const title = ogResult.ogTitle || ogResult.twitterTitle || domain
  const description = ogResult.ogDescription || ogResult.twitterDescription || ''
  
  // Use the extracted body text if available, fallback to metadata description
  const content = (extractedText && extractedText.length > description.length)
    ? extractedText
    : description

  return {
    title,
    description,
    content, // This will be stored in the item's content field
    thumbnailUrl: ogResult.ogImage?.[0]?.url || ogResult.twitterImage?.[0]?.url || null,
    faviconUrl: ogResult.favicon
      ? new URL(ogResult.favicon, url).href
      : `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    siteName: ogResult.ogSiteName || domain,
  }
}
