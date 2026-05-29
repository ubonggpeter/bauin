import { randomBytes } from "crypto";

export function generateReferralCode(): string {
  return "BAUIN-" + randomBytes(4).toString("hex").toUpperCase();
}
