import crypto from "crypto"
import { env } from "../../config/env"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16      // bytes
const TAG_LENGTH = 16     // bytes
const KEY = Buffer.from(env.ENCRYPTION_KEY, "hex")

// Encrypts a string — returns a single string containing
// iv:authTag:encryptedData (all hex encoded)
export const encrypt = (plaintext: string): string => {
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
    const authTag = cipher.getAuthTag()
    // return iv, authTag, and encrypted all joined with ":"
    // format: iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted.toString("hex")
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`
}

// Decrypts the output of encrypt()
// Parses the iv:authTag:encryptedData format
// Returns the original plaintext string
export const decrypt = (ciphertext: string): string => {
    const parts = ciphertext.split(":")
    const iv = Buffer.from(parts[0], "hex")
    const authTag = Buffer.from(parts[1], "hex")
    const encryptedData = Buffer.from(parts[2], "hex")
  
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)
    decipher.setAuthTag(authTag)
  
    const decrypted = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final()
    ])
  
    return decrypted.toString("utf8")
  }

// Helper — encrypt a field only if it has a value
// Returns null if value is null/undefined
export const encryptIfExists = (value: string | null | undefined): string | null => {
    if (!value) return null 
    return encrypt(value)
}

// Helper — decrypt a field only if it has a value
export const decryptIfExists = (value: string | null | undefined): string | null => {
    if (!value) return null
    return decrypt(value)
}

// temporary test — delete after confirming
const original = "Patient has Type 2 Diabetes"
const encrypted = encrypt(original)
const decrypted = decrypt(encrypted)

console.log("Original: ", original)
console.log("Encrypted:", encrypted)
console.log("Decrypted:", decrypted)
console.log("Match:", original === decrypted)