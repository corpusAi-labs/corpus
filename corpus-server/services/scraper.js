import ogs from 'open-graph-scraper'
import { captureWebpageScreenshot } from './screenshot.js'

function cleanHtmlText(raw) {
  if (!raw) return ''
  return raw
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\b([A-Za-z])(?:\s+[A-Za-z]){2,}\b/g, (match) => match.replace(/\s+/g, ''))
    .replace(/\s+/g, ' ')
    .trim()
}

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

  const title = cleanHtmlText(ogResult.ogTitle || ogResult.twitterTitle || domain)
  const metaDescription = cleanHtmlText(ogResult.ogDescription || ogResult.twitterDescription || '')
  const cleanExtracted = cleanHtmlText(extractedText)

  // Prioritize the site's official clean description if available (at least 15 chars).
  // Otherwise, fallback to the cleaned body text.
  const content = (metaDescription && metaDescription.length >= 15)
    ? metaDescription
    : (cleanExtracted || metaDescription)

async function checkImageAlive(imgUrl) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2500)
    const res = await fetch(imgUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Range': 'bytes=0-50'
      },
      signal: controller.signal
    })
    clearTimeout(timeout)
    const ct = res.headers.get('content-type') || ''
    return res.ok && ct.startsWith('image/')
  } catch {
    return false
  }
}

  // 1. First priority: Capture a real webpage screenshot
  let thumbnailUrl = null
  try {
    thumbnailUrl = await captureWebpageScreenshot(url)
  } catch (err) {
    console.warn('[scraper] Screenshot capture failed, falling back to HTML image:', err.message)
  }

  // 2. If and only if the screenshot failed, look for image / thumbnail in HTML metadata
  if (!thumbnailUrl) {
    const imgObj = ogResult.ogImage?.[0] || ogResult.twitterImage?.[0]
    const rawImage = imgObj?.url

    if (rawImage) {
      const isSvg = imgObj?.type === 'svg' || /\.svg(\?.*)?$/i.test(rawImage)
      const isIco = /\.ico(\?.*)?$/i.test(rawImage)
      const isTiny = (imgObj?.width && imgObj.width < 100) || (imgObj?.height && imgObj.height < 60)
      const isSpacer = /trans_1x1|spacer|1x1|pixel/i.test(rawImage)

      if (!isSvg && !isIco && !isTiny && !isSpacer) {
        let candidate = null
        try {
          candidate = new URL(rawImage, url).href
        } catch {
          candidate = rawImage
        }

        const isAlive = await checkImageAlive(candidate)
        if (isAlive) {
          thumbnailUrl = candidate
        }
      }
    }

    // 3. Fallback to hosted snapshot if neither screenshot nor HTML image was found
    if (!thumbnailUrl) {
      thumbnailUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&embed=screenshot.url`
    }
  }

  return {
    title,
    description: metaDescription,
    content, // This will be stored in the item's content field
    thumbnailUrl,
    faviconUrl: ogResult.favicon
      ? new URL(ogResult.favicon, url).href
      : `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    siteName: ogResult.ogSiteName || domain,
  }
}
