import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/login/actions";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link href="/" className="font-semibold tracking-tight">
            K.I.V.
          </Link>
          <Link href="/company" className="text-muted-foreground hover:text-foreground">
            Company Dashboard
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
