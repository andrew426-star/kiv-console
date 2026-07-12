import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/login/actions";
import { MarketTicker, MarketTickerSkeleton } from "@/components/market-ticker";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <Suspense fallback={<MarketTickerSkeleton />}>
        <MarketTicker />
      </Suspense>
      <header className="scan-line flex items-center justify-between border-b border-border/50 bg-kv-surface/40 px-6 py-3 backdrop-blur-sm">
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link
            href="/"
            className="font-heading text-lg font-bold tracking-tight text-gradient-green"
          >
            K.I.V.
          </Link>
          <Link href="/company" className="text-muted-foreground transition-colors hover:text-foreground">
            Company Dashboard
          </Link>
          <Link href="/calendar" className="text-muted-foreground transition-colors hover:text-foreground">
            Calendar
          </Link>
          <Link href="/intel" className="text-muted-foreground transition-colors hover:text-foreground">
            Intel Hub
          </Link>
          <Link href="/research" className="text-muted-foreground transition-colors hover:text-foreground">
            Research
          </Link>
          <Link href="/agents" className="text-muted-foreground transition-colors hover:text-foreground">
            Agents
          </Link>
          <Link href="/security" className="text-muted-foreground transition-colors hover:text-foreground">
            Security
          </Link>
          <Link href="/autonomy" className="text-muted-foreground transition-colors hover:text-foreground">
            Autonomy
          </Link>
        </nav>
        <form action={signOut}>
          <Button variant="ghost" size="sm" type="submit">
            Sign out
          </Button>
        </form>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
