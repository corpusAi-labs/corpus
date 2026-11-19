import os from 'os'
import Job from '../models/Job.js'
import { getEnv } from '../config/env.js'

/**
 * Minimal MongoDB-backed job queue.
 *
 *  - claim: one atomic findOneAndUpdate, so N workers on N instances never
 *    double-process a job
 *  - lease: a running job holds `lockedUntil`; if the worker dies, the lease
 *    expires and another worker picks it up (at-least-once delivery, so
 *    handlers must be idempotent)
 *  - retry: exponential backoff, then `onFailed` once attempts are exhausted
 *
 * Swap for BullMQ/SQS behind the same enqueue/register API if volume grows.
 */
const LEASE_MS = 5 * 60 * 1000
const handlers = new Map()
const workerId = `${os.hostname()}:${process.pid}`

export function registerJob(type, { run, onFailed }) {
  handlers.set(type, { run, onFailed })
}

export async function enqueue(type, payload, { userId, maxAttempts = 3, delayMs = 0 } = {}) {
  return Job.create({ type, payload, userId, maxAttempts, runAt: new Date(Date.now() + delayMs) })
}

async function claim() {
  const now = new Date()
  return Job.findOneAndUpdate(
    {
      type: { $in: [...handlers.keys()] },
      $or: [
        { status: 'queued', runAt: { $lte: now } },
        { status: 'running', lockedUntil: { $lt: now } }, // crashed worker
      ],
    },
    { $set: { status: 'running', lockedUntil: new Date(Date.now() + LEASE_MS) }, $inc: { attempts: 1 } },
    { sort: { runAt: 1 }, new: true }
  )
}

/** Extend the lease during long work so the job isn't stolen mid-flight. */
export const heartbeat = jobId =>
  Job.updateOne({ _id: jobId, status: 'running' }, { lockedUntil: new Date(Date.now() + LEASE_MS) })

async function execute(job) {
  const handler = handlers.get(job.type)
  try {
    await handler.run(job.payload, job)
    await Job.updateOne({ _id: job._id }, { status: 'done', finishedAt: new Date(), lockedUntil: null, lastError: '' })
  } catch (err) {
    const exhausted = job.attempts >= job.maxAttempts || err.permanent
    console.error(`[queue] ${job.type} ${job._id} attempt ${job.attempts} failed:`, err.message)
    if (exhausted) {
      await Job.updateOne({ _id: job._id }, { status: 'failed', finishedAt: new Date(), lockedUntil: null, lastError: err.message })
      await handler.onFailed?.(job.payload, err, job).catch(e => console.error('[queue] onFailed error:', e.message))
    } else {
      const backoff = 2 ** job.attempts * 5000
      await Job.updateOne({ _id: job._id }, { status: 'queued', runAt: new Date(Date.now() + backoff), lockedUntil: null, lastError: err.message })
    }
  }
}

/** Process every currently-due job (used by tests and the polling loop). */
export async function drain({ max = Infinity } = {}) {
  let n = 0
  while (n < max) {
    const job = await claim()
    if (!job) break
    await execute(job)
    n++
  }
  return n
}

let stopped = false
export function startWorkers() {
  const { QUEUE_CONCURRENCY, QUEUE_POLL_MS } = getEnv()
  stopped = false
  const loop = async () => {
    while (!stopped) {
      try {
        const job = await claim()
        if (job) { await execute(job); continue }
      } catch (err) {
        console.error('[queue] worker error:', err.message)
      }
      await new Promise(r => setTimeout(r, QUEUE_POLL_MS).unref())
    }
  }
  for (let i = 0; i < QUEUE_CONCURRENCY; i++) loop()
  console.log(`[queue] ${QUEUE_CONCURRENCY} worker(s) started on ${workerId}`)
}

export const stopWorkers = () => { stopped = true }

/** Error that should not be retried (bad input, not a transient failure). */
export class PermanentJobError extends Error {
  constructor(message, code) {
    super(message)
    this.permanent = true
    this.code = code
  }
}
