import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be a 64-char hex string (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

/** Encrypt plaintext → "iv:authTag:ciphertext" (all hex) */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/** Decrypt "iv:authTag:ciphertext" → plaintext */
export function decrypt(token: string): string {
  const key = getKey();
  const [ivHex, authTagHex, dataHex] = token.split(":");
  if (!ivHex || !authTagHex || !dataHex) {
    throw new Error("Invalid encrypted token format");
  }
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  return decipher.update(dataHex, "hex", "utf8") + decipher.final("utf8");
}

/** Check if a value looks like it was encrypted by us (hex:hex:hex) */
export function isEncrypted(value: string): boolean {
  return /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/.test(value);
}

/** Decrypt a stripe key, handling both legacy plaintext and encrypted values */
export function decryptStripeKey(value: string): string {
  if (!value) return value;
  // Legacy plaintext keys start with sk_ or pk_
  if (value.startsWith("sk_") || value.startsWith("pk_")) return value;
  return decrypt(value);
}
