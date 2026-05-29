"use server";

import { setAdminSessionCookie, clearAdminSessionCookie } from "@/lib/adminSession";
import { redirect } from "next/navigation";

export async function adminSignIn(token: string): Promise<void> {
  await setAdminSessionCookie(token);
  redirect("/admin");
}

export async function adminSignOut(): Promise<void> {
  await clearAdminSessionCookie();
  redirect("/login");
}
