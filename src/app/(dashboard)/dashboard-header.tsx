"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Heart, Home, Menu, Moon, Plus, Search, ShieldCheck, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";

type DashboardHeaderProps = {
  roleLabel: string;
  roleValue: string;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
};

type ThemeMode = "dark" | "light";

const themeStorageKey = "rentvago-theme";

const applyThemeMode = (theme: ThemeMode) => {
  document.documentElement.dataset.theme = theme;
};

const navItems: NavItem[] = [
  { href: "/search", label: "Buscar", icon: <Search className="h-4 w-4" /> },
  { href: "/my-properties", label: "Mis propiedades", icon: <Home className="h-4 w-4" /> },
  { href: "/my-properties/new", label: "Publicar", icon: <Plus className="h-4 w-4" /> },
  { href: "/favorites", label: "Favoritos", icon: <Heart className="h-4 w-4" /> },
  { href: "/alerts", label: "Alertas", icon: <Bell className="h-4 w-4" /> },
  { href: "/admin", label: "Admin", icon: <ShieldCheck className="h-4 w-4" />, adminOnly: true },
];

const isActivePath = (pathname: string, href: string) => {
  if (href === "/search") {
    return pathname === href || pathname.startsWith("/search/");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
};

export function DashboardHeader({ roleLabel, roleValue }: DashboardHeaderProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || roleValue === "ADMIN");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(themeStorageKey);
    const nextTheme = storedTheme === "light" ? "light" : "dark";
    const frameId = window.requestAnimationFrame(() => {
      setThemeMode(nextTheme);
    });

    applyThemeMode(nextTheme);

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const toggleTheme = () => {
    const nextTheme = themeMode === "dark" ? "light" : "dark";

    setThemeMode(nextTheme);
    applyThemeMode(nextTheme);
    window.localStorage.setItem(themeStorageKey, nextTheme);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-gray-800 bg-black/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/search" className="flex min-w-0 items-center gap-3" onClick={() => setIsMenuOpen(false)}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-500 text-sm font-extrabold text-black">
            RV
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-tight text-white">RentVago</p>
            <p className="truncate text-xs text-gray-500">Gestión residencial</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {visibleNavItems.map((item) => {
            const isActive = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-green-500 text-black"
                    : item.adminOnly
                      ? "text-green-400 hover:bg-gray-800 hover:text-green-300"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span className="hidden rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-green-400 sm:inline-flex">
            {roleLabel}
          </span>
          <form action="/api/auth/logout" method="post" className="hidden sm:block">
            <button
              type="submit"
              className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-medium text-gray-400 transition hover:border-gray-600 hover:text-white"
            >
              Salir
            </button>
          </form>
          <button
            type="button"
            aria-label={themeMode === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-800 bg-gray-900 text-gray-200 transition hover:border-green-500/60 hover:text-green-400"
            onClick={toggleTheme}
          >
            {themeMode === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button
            type="button"
            aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={isMenuOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-800 bg-gray-900 text-gray-200 transition hover:border-green-500/60 hover:text-green-400 md:hidden"
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isMenuOpen ? (
        <div className="border-t border-gray-800 bg-black px-4 pb-4 md:hidden">
          <nav className="mx-auto grid w-full max-w-7xl gap-2 pt-3">
            {visibleNavItems.map((item) => {
              const isActive = isActivePath(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2 text-sm font-bold transition ${
                    isActive
                      ? "border-green-500 bg-green-500 text-black"
                      : "border-gray-800 bg-gray-950 text-gray-200 hover:border-green-500/50 hover:text-green-400"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-green-400">
                {roleLabel}
              </span>
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-medium text-gray-300 transition hover:border-gray-600 hover:text-white"
                >
                  Salir
                </button>
              </form>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
