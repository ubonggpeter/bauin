import { randomBytes } from "crypto";

// 8-char uppercase alphanumeric, avoiding visually ambiguous chars (0/O, 1/I)
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateReferralCode(): string {
  const bytes = randomBytes(8);
  return Array.from(bytes, (b) => CHARS[b % CHARS.length]).join("");
}
