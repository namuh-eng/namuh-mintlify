import { getServerSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  const firstName = session.user.name?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-normal text-white">
          {greeting}, {firstName}
        </h1>
      </div>

      {/* Placeholder for home page content — will be built in feature-001 */}
      <div className="rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-8 text-center text-gray-500">
        <p>Project overview and activity will appear here.</p>
      </div>
    </div>
  );
}
