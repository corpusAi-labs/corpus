/**
 * Plan limits — single source of truth for anything a plan unlocks.
 * Keep in sync with the pricing page.
 */
const MB = 1024 * 1024

export const PLANS = {
  free: { pdfMaxBytes: 10 * MB, pdfMaxPages: 50, storageBytes: 200 * MB, summarySections: 4 },
  beginner: { pdfMaxBytes: 25 * MB, pdfMaxPages: 200, storageBytes: 1024 * MB, summarySections: 8 },
  pro: { pdfMaxBytes: 50 * MB, pdfMaxPages: 500, storageBytes: 5 * 1024 * MB, summarySections: 12 },
  max: { pdfMaxBytes: 50 * MB, pdfMaxPages: 1000, storageBytes: 20 * 1024 * MB, summarySections: 16 },
}

export const ABSOLUTE_MAX_PDF_BYTES = Math.max(...Object.values(PLANS).map(p => p.pdfMaxBytes))

/** PDFs cost more than a link: 1 credit per 25 indexed pages (minimum 1). */
export const PAGES_PER_CREDIT = 25
export const creditsForPages = pages => Math.max(1, Math.ceil(pages / PAGES_PER_CREDIT))

export const planFor = user => PLANS[user?.plan] || PLANS.free
