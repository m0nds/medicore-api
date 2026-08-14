import { encrypt, decrypt, encryptIfExists, decryptIfExists } from "../../src/shared/utils/encryption"

describe("Encryption utility", () => {
    it("shoult encrypt and decrypt a string correctly", () => {
        const original = "Patient has Type 2 Diabetes"
        const encrypted = encrypt(original)
        const decrypted = decrypt(encrypted)
        expect(decrypted).toBe(original)
    })
    it("should produce different ciphertext for same input", () => {
        const text = "same input"
        const encrypted1 = encrypt(text)
        const encrypted2 = encrypt(text)
        expect(encrypted1).not.toBe(encrypted2)  // different IV each time
    })
    it("should return null for encryptIfExists when value is null", () => {
        expect(encryptIfExists(null)).toBeNull()
        expect(encryptIfExists(undefined)).toBeNull()
    })

    it("should return null for decryptIfExists when value is null", () => {
        expect(decryptIfExists(null)).toBeNull()
        expect(decryptIfExists(undefined)).toBeNull()
    })

    it("should return plaintext as-is when value is not encrypted", () => {
        expect(decryptIfExists("Hypertension")).toBe("Hypertension")
    })

    it("should round-trip encrypted values via decryptIfExists", () => {
        const original = "Patient has Type 2 Diabetes"
        const encrypted = encrypt(original)
        expect(decryptIfExists(encrypted)).toBe(original)
    })

    it("should encrypt non-null values", () => {
        const result = encryptIfExists("test value")
        expect(result).not.toBeNull()
        expect(result).not.toBe("test value")
    })
})

