"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Home, 
  Users, 
  Globe, 
  ArrowLeft, 
  FileText, 
  Menu, 
  X 
} from "lucide-react";
import { AdminNavLink } from "./admin-nav-link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden text-gray-100">
      {/* Botón Flotante para Móvil (Estilo Hero/Search) */}
      <div className="lg:hidden fixed top-4 right-4 z-50">
        <button
          onClick={toggleSidebar}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-800 bg-gray-900 text-gray-200 transition hover:border-green-500/60 hover:bg-green-500/5 hover:text-green-400"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Backdrop (Capa oscura al abrir menú en móvil) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-black border-r border-gray-800 shadow-2xl flex flex-col shrink-0 transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
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
            className="flex items-center gap-3 px-4 py-3 text-gray-500 rounded-xl hover:bg-green-500/5 hover:text-gray-200 transition-all font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver al sitio
          </Link>
        </div>
      </aside>

      {/* Contenido Principal con Margen Responsive */}
      <main className="flex-1 overflow-y-auto p-4 md:p-10 bg-gray-950/50">
        {children}
      </main>
    </div>
  );
}
