import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Dashboard } from "@/components/dashboard";

const apiUrl = process.env.API_URL ?? "http://localhost:3001";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const response = await fetch(`${apiUrl}/v1/auth/me`, {
    cache: "no-store",
    headers: {
      cookie: cookieStore.toString(),
    },
  }).catch(() => null);

  if (!response?.ok) {
    redirect("/signin");
  }

  return <Dashboard />;
}
