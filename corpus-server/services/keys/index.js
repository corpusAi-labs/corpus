import { getEnv } from '../../config/env.js'
import { createLocalProvider } from './localProvider.js'
import { createGcpKmsProvider } from './gcpKmsProvider.js'

/**
 * KEK provider registry. Every provider implements:
 *   name, currentKekId, wrap(dek) -> { kekId, wrapped }, unwrap({ kekId, wrapped }) -> dek
 */
let providerPromise = null

export function getKeyProvider() {
  if (!providerPromise) {
    const { KEY_PROVIDER } = getEnv()
    providerPromise = KEY_PROVIDER === 'gcp-kms'
      ? createGcpKmsProvider()
      : Promise.resolve(createLocalProvider())
    providerPromise.catch(() => { providerPromise = null })
  }
  return providerPromise
}

export function resetKeyProvider() {
  providerPromise = null
}
