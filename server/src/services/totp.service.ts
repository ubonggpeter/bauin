import speakeasy from "speakeasy";
import QRCode from "qrcode";

const ISSUER = "BAUIN Platform";

export function generateTotpSecret(userEmail: string): {
  secret: string;       // base32-encoded; store this in the database
  otpAuthUrl: string;   // used to render the QR code
} {
  const generated = speakeasy.generateSecret({
    name: `${ISSUER}:${userEmail}`,
    issuer: ISSUER,
    length: 20,
  });
  return {
    secret: generated.base32 as string,
    otpAuthUrl: generated.otpauth_url as string,
  };
}

export async function generateQRCodeDataUrl(otpAuthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpAuthUrl);
}

/**
 * Verify a 6-digit TOTP token.
 * window: 1 allows one period (~30 s) of clock drift in each direction.
 */
export function verifyTotpToken(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 1,
  });
}
