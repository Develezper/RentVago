import Link from "next/link";
import { headers } from "next/headers";

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
      <header className="sticky top-0 z-40 border-b border-gray-800 bg-black/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500 text-sm font-extrabold text-black">
              RV
            </div>
            <div>
              <p className="text-base font-semibold tracking-tight text-white">RentVago</p>
              <p className="text-xs text-gray-500">Gestión residencial</p>
            </div>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/search"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition hover:bg-gray-800 hover:text-white"
            >
              Buscar
            </Link>
            <Link
              href="/my-properties/new"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition hover:bg-gray-800 hover:text-white"
            >
              Publicar
            </Link>
            <Link
              href="/favorites"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition hover:bg-gray-800 hover:text-white"
            >
              Favoritos
            </Link>
            <Link
              href="/alerts"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition hover:bg-gray-800 hover:text-white"
            >
              Alertas
            </Link>
            {roleValue === "ADMIN" ? (
              <Link
                href="/admin"
                className="rounded-lg px-3 py-2 text-sm font-medium text-green-400 transition hover:bg-gray-800 hover:text-green-300"
              >
                Admin
              </Link>
            ) : null}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-green-400 sm:inline-flex">
              {roleLabel}
            </span>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-medium text-gray-400 transition hover:border-gray-600 hover:text-white"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
