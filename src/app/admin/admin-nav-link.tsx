"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface AdminNavLinkProps {
  href: string;
  icon: ReactNode;
  children: ReactNode;
  exact?: boolean;
}

export function AdminNavLink({ href, icon, children, exact = false }: AdminNavLinkProps) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium group ${
        isActive
          ? "bg-green-500/10 text-green-400 border border-green-500/20"
          : "text-gray-400 hover:bg-green-500/5 hover:text-green-400 border border-transparent"
      }`}
    >
      <span className="group-hover:scale-110 transition-transform">{icon}</span>
      {children}
    </Link>
  );
}
