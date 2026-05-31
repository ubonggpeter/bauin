import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAffiliateReferral } from "@/lib/server/affiliate";

const RegisterSchema = z.object({
  name:          z.string().min(2),
  email:         z.string().email(),
  password:      z.string().min(8),
  referralCode:  z.string().optional(),
  affiliateCode: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.errors }, { status: 400 });
    }

    // Delegate to Express backend (strip affiliateCode — backend doesn't know about it)
    const { affiliateCode, ...backendPayload } = parsed.data;

    const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";
    const res = await fetch(`${backendUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(backendPayload),
    });

    const data = await res.json();

    // After successful registration, record affiliate referral if promo code was provided
    if (res.ok && data.user?.id && affiliateCode?.trim()) {
      recordAffiliateReferral(data.user.id, affiliateCode).catch(() => {});
    }

    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
