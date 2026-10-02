import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/login/actions";
import { MarketTicker, MarketTickerSkeleton } from "@/components/market-ticker";
import { MobileTabBar, MobileTopBar } from "@/components/nav/mobile-nav";
import { NAV_ITEMS } from "@/components/nav/nav-items";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      {/* Phones: a slim top bar and a bottom tab bar instead of the header. */}
      <MobileTopBar />
      <Suspense fallback={<MarketTickerSkeleton />}>
        <MarketTicker />
      </Suspense>
      <header className="scan-line hidden items-center justify-between border-b border-border/50 bg-kv-surface/40 px-6 py-3 backdrop-blur-sm md:flex">
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium">
          <Link
            href="/"
            className="font-heading text-lg font-bold tracking-tight text-gradient-green"
          >
            K.I.V.
          </Link>
          {NAV_ITEMS.filter((item) => item.href !== "/").map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={signOut}>
          <Button variant="ghost" size="sm" type="submit">
            Sign out
          </Button>
        </form>
      </header>
      {/* Room at the bottom on phones so the tab bar never covers content. */}
      <main className="flex flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </main>
      <MobileTabBar />
    </div>
  );
}
