import Link from "next/link";
import {
  LayoutDashboard,
  Home,
  Users,
  Globe,
  ArrowLeft,
  FileText,
  BellRing,
} from "lucide-react";
import { AdminNavLink } from "./admin-nav-link";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden text-gray-100">
      <aside className="w-64 bg-black border-r border-gray-800 shadow-2xl z-10 flex flex-col shrink-0">
        <div className="p-8 border-b border-gray-800">
          <h2 className="text-xl font-black text-white tracking-widest uppercase flex items-center gap-2">
            <span className="w-2 h-6 bg-green-500 rounded-sm" />
            Admin
          </h2>
        </div>

        <nav className="mt-6 flex-1 px-4 space-y-1">
          <AdminNavLink href="/admin" icon={<LayoutDashboard className="w-5 h-5" />} exact>
            Métricas
          </AdminNavLink>
          <AdminNavLink href="/admin/properties" icon={<Home className="w-5 h-5" />}>
            Propiedades
          </AdminNavLink>
          <AdminNavLink href="/admin/leases" icon={<FileText className="w-5 h-5" />}>
            Arriendos
          </AdminNavLink>
          <AdminNavLink href="/admin/alerts" icon={<BellRing className="w-5 h-5" />}>
            Match alerts
          </AdminNavLink>
          <AdminNavLink href="/admin/users" icon={<Users className="w-5 h-5" />}>
            Usuarios
          </AdminNavLink>
          <AdminNavLink href="/admin/scraper" icon={<Globe className="w-5 h-5" />}>
            Scraper
          </AdminNavLink>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <Link
            href="/search"
            className="flex items-center gap-3 px-4 py-3 text-gray-500 rounded-xl hover:bg-gray-900 hover:text-white transition-all font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver al sitio
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-10 bg-gray-950/50">{children}</main>
    </div>
  );
}
