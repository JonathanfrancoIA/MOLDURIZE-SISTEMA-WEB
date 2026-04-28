import Link from "next/link";
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

const hasClerkKey =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("SUBSTITUA");

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let UserButtonEl: React.ReactNode = (
    <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[#c9952f]/30 bg-[#c9952f]/10 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8b651f]">
      dev
    </div>
  );

  if (hasClerkKey) {
    const { UserButton } = await import("@clerk/nextjs");
    UserButtonEl = <UserButton afterSignOutUrl="/" />;
  }

  return (
    <div className="min-h-[100dvh] bg-[#f5f5f0] text-[#171713]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(201,149,47,0.16),transparent_32%),radial-gradient(circle_at_92%_10%,rgba(23,23,19,0.06),transparent_30%)]" />
      <div className="relative min-h-[100dvh]">
        <header className="sticky top-0 z-20 border-b border-black/10 bg-[#f5f5f0]/88 backdrop-blur-xl">
          <div className="mx-auto flex min-h-16 max-w-[1720px] flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#171713] text-sm font-black text-[#f2c767] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                M
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight text-[#171713]">MOLDURIZE</div>
                <div className="text-xs text-[#625f55]">Corte EPS, nesting e G-Code</div>
              </div>
            </Link>

            <div className="flex items-center gap-2 overflow-x-auto">
              {navItems.map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-black/10 bg-white/80 px-3 text-xs font-semibold text-[#504d43] shadow-[0_12px_28px_-24px_rgba(0,0,0,0.35)] transition-all duration-200 hover:border-[#c9952f]/50 hover:bg-[#fffaf0] hover:text-[#171713] active:scale-[0.98]"
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                  {label}
                </Link>
              ))}
              <div className="ml-1 hidden lg:block">{UserButtonEl}</div>
            </div>
          </div>
        </header>
        <main className="relative mx-auto max-w-[1720px] px-4 py-4 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
