import Link from "next/link";
import DashboardNav from "@/components/DashboardNav";

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
    <div className="min-h-[100dvh] bg-[#f4f3ee] text-[#171713]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(201,149,47,0.12),transparent_32%),radial-gradient(circle_at_92%_10%,rgba(23,23,19,0.04),transparent_30%)]" />
      <div className="relative min-h-[100dvh]">
        <header className="sticky top-0 z-20 border-b border-black/8 bg-[#f4f3ee]/90 backdrop-blur-xl">
          <div className="mx-auto grid min-h-16 max-w-[1720px] grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:px-6">
            <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#171713] text-sm font-black text-[#f2c767] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                M
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold tracking-tight text-[#171713]">MOLDURIZE</div>
                <div className="text-[11px] text-[#817b6d]">Corte EPS, nesting e G-Code</div>
              </div>
            </Link>

            <div className="col-start-2 row-start-1 flex justify-end lg:col-start-3">
              {UserButtonEl}
            </div>

            <DashboardNav />
          </div>
        </header>
        <main className="relative mx-auto max-w-[1720px] px-4 py-4 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
