"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  History,
  LayoutDashboard,
  PackageOpen,
  Scissors,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/nesting", label: "Nesting", Icon: Scissors },
  { href: "/history", label: "Historico", Icon: History },
  { href: "/remnants", label: "Retalhos", Icon: PackageOpen },
  { href: "/settings", label: "Ajustes", Icon: Settings },
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="col-span-2 row-start-2 flex min-w-0 items-center gap-1.5 overflow-x-auto pb-1 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:justify-center lg:pb-0">
      {navItems.map(({ href, label, Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-xs font-semibold transition-all duration-200 active:scale-[0.97] ${
              isActive
                ? "bg-[#171713] text-[#f2c767] shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
                : "border border-black/8 bg-white/70 text-[#625f55] shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:border-[#c9952f]/40 hover:bg-[#fffaf0] hover:text-[#171713]"
            }`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={isActive ? 2.2 : 1.8} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
