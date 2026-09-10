import puppeteer from 'puppeteer'
import { uploadBuffer } from './cloudinary.js'

let browserInstance = null

async function getBrowser() {
  if (browserInstance && browserInstance.connected) {
    return browserInstance
  }

  try {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-accelerated-2d-canvas',
        '--no-zygote',
        '--single-process',
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    })
    return browserInstance
  } catch (err) {
    console.error('[screenshot] Failed to launch Puppeteer browser:', err.message)
    browserInstance = null
    return null
  }
}

/**
 * Capture an ultra-lightweight (30-60KB) desktop viewport screenshot.
 * In production, uploads to Cloudinary (if configured) for global HTTPS access,
 * or falls back to a hosted screenshot URL if the container lacks Chromium.
 *
 * @param {string} url - Target website URL
 * @returns {Promise<string|null>} - URL to access the screenshot
 */
export async function captureWebpageScreenshot(url) {
  let page = null
  try {
    const browser = await getBrowser()
    if (!browser) {
      // Reliable fallback if Puppeteer cannot run on host container (e.g. Render free tier)
      return `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&embed=screenshot.url`
    }

    page = await browser.newPage()

    // 1. Set fixed desktop viewport (1200x750) at 1x scale
    await page.setViewport({
      width: 1200,
      height: 750,
      deviceScaleFactor: 1,
    })

    // Set standard browser user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )

    // Block unnecessary media streams to speed up rendering
    await page.setRequestInterception(true)
    page.on('request', (req) => {
      const type = req.resourceType()
      if (type === 'media' || type === 'websocket') {
        req.abort()
      } else {
        req.continue()
      }
    })

    // 2. Navigate with safe 9s timeout
    await page.goto(url, {
      waitUntil: 'load',
      timeout: 9000,
    }).catch(() => {})

    // Small delay to let JS/fonts settle
    await new Promise((resolve) => setTimeout(resolve, 800))

    // 3. Take compressed WebP screenshot (NOT fullPage to keep under 60KB)
    const buffer = await page.screenshot({
      type: 'webp',
      quality: 70,
      fullPage: false,
    })

    // 4. Storage strategy:
    // Upload the in-memory buffer directly to Cloudinary (never save to backend disk)
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        const cloudinaryUrl = await uploadBuffer(buffer, 'corpus/screenshots')
        return cloudinaryUrl
      } catch (cloudErr) {
        console.warn('[screenshot] Cloudinary upload failed, falling back to hosted snapshot:', cloudErr.message)
      }
    }

    // Fallback if Cloudinary is not configured: use hosted URL directly (zero backend disk storage)
    return `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&embed=screenshot.url`
  } catch (err) {
    console.error('[screenshot] Failed to capture screenshot for', url, ':', err.message)
    return `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&embed=screenshot.url`
  } finally {
    if (page) {
      try {
        await page.close()
      } catch {}
    }
  }
}
