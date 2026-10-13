import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Dashboard from "@/components/dashboard";
import { isAuthConfigured, isValidSession, SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (isAuthConfigured()) {
    const cookieStore = await cookies();
    if (!isValidSession(cookieStore.get(SESSION_COOKIE)?.value)) redirect("/login");
  }
  return <Dashboard />;
}
