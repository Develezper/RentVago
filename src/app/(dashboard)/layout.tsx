import { headers } from "next/headers";
import { DashboardHeader } from "./dashboard-header";

export const dynamic = "force-dynamic";

const roleLabelByValue: Record<string, string> = {
  EMPLOYEE: "Empleado",
  ADMIN: "Admin",
};

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const roleValue = requestHeaders.get("x-user-role") ?? "EMPLOYEE";
  const roleLabel = roleLabelByValue[roleValue] ?? roleValue;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <DashboardHeader roleLabel={roleLabel} roleValue={roleValue} />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
