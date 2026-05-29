import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/adminSession";
import { AdminLoginForm } from "./AdminLoginForm";

export const metadata = { title: "Admin Login — BAUIN" };

export default async function AdminLoginPage() {
  // If already authenticated, skip the login page
  const session = await getAdminSession();
  if (session) redirect("/admin");

  return <AdminLoginForm />;
}
