import crypto from 'crypto'
import { config } from '../config/index.js'

export class CryptoService {
  private algorithm = 'aes-256-gcm'
  private key: Buffer

  constructor() {
    // Ensure the key is exactly 32 bytes for AES-256
    this.key = crypto.scryptSync(config.encryption.key, 'salt', 32)
  }

  encrypt(text: string): { encrypted: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv)

    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag()

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    }
  }

  decrypt(encrypted: string, iv: string, authTag: string): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, 'hex')
    )

    decipher.setAuthTag(Buffer.from(authTag, 'hex'))

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }

  hash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex')
  }
}

export const cryptoService = new CryptoService()
