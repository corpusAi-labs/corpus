import { getEnv } from '../../config/env.js'

/**
 * Google Cloud KMS KEK provider. The KEK never leaves Google's HSM-backed
 * service; we only send it 32-byte DEKs to wrap/unwrap. Every unwrap is
 * recorded in Cloud Audit Logs, and IAM controls which service account may
 * call Decrypt. KMS ciphertext embeds the key version, so rotating the key in
 * the GCP console needs no code change.
 *
 * Setup:
 *   npm i @google-cloud/kms
 *   KEY_PROVIDER=gcp-kms
 *   GCP_KMS_KEY_NAME=projects/<p>/locations/<l>/keyRings/<r>/cryptoKeys/<k>
 *   + Application Default Credentials with roles/cloudkms.cryptoKeyEncrypterDecrypter
 */
export async function createGcpKmsProvider() {
  const { GCP_KMS_KEY_NAME: keyName } = getEnv()
  let KeyManagementServiceClient
  try {
    ;({ KeyManagementServiceClient } = await import('@google-cloud/kms'))
  } catch {
    throw new Error('[keys] KEY_PROVIDER=gcp-kms requires the @google-cloud/kms package (npm i @google-cloud/kms)')
  }
  const client = new KeyManagementServiceClient()

  return {
    name: 'gcp-kms',
    currentKekId: keyName,

    async wrap(dek) {
      const [res] = await client.encrypt({ name: keyName, plaintext: dek, additionalAuthenticatedData: Buffer.from(keyName) })
      return { kekId: keyName, wrapped: Buffer.from(res.ciphertext).toString('base64') }
    },

    async unwrap({ kekId, wrapped }) {
      const [res] = await client.decrypt({
        name: kekId,
        ciphertext: Buffer.from(wrapped, 'base64'),
        additionalAuthenticatedData: Buffer.from(kekId),
      })
      return Buffer.from(res.plaintext)
    },
  }
}
