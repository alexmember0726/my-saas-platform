import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const SALT_ROUNDS = 10;
const SHORT_KEY_EXP = "15m"; // short-lived token expiry
const JWT_SECRET = process.env.NEXTAUTH_SECRET || "dev-secret";

// Generate long-lived key
export function generateLongLivedKey() {
  return crypto.randomBytes(32).toString("hex"); // 64-char hex string
}

// Hash key for storage
export async function hashApiKey(key: string) {
  return await bcrypt.hash(key, SALT_ROUNDS);
}

// Verify long-lived key
export async function verifyApiKey(key: string, hash: string) {
  return await bcrypt.compare(key, hash);
}

// Generate short-lived token from long-lived key
export function generateShortLivedToken(longKey: string) {
  return jwt.sign({ key: longKey }, JWT_SECRET, { expiresIn: SHORT_KEY_EXP });
}

// Verify short-lived token
export function verifyShortLivedToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as { key: string };
}
