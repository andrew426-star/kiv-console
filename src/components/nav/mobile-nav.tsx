"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOutIcon, MenuIcon, XIcon } from "lucide-react";

import { signOut } from "@/app/login/actions";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isActive } from "./nav-items";

const TABS = NAV_ITEMS.filter((item) => item.tab);
const MORE = NAV_ITEMS.filter((item) => !item.tab);

/** The phone's top bar: the brand and which page this is. */
export function MobileTopBar() {
  const pathname = usePathname();
  const current = NAV_ITEMS.find((item) => item.href !== "/" && isActive(pathname, item.href));
  return (
    <header
      className="scan-line sticky top-0 z-30 flex items-center gap-3 border-b border-border/50 bg-kv-surface/80 px-4 backdrop-blur-sm md:hidden"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <Link href="/" className="flex h-12 items-center font-heading text-lg font-bold tracking-tight text-gradient-green">
        K.I.V.
      </Link>
      {current && <span className="truncate text-sm text-muted-foreground">{current.label}</span>}
    </header>
  );
}

/** The phone's bottom tab bar, with everything else under More. */
export function MobileTabBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE.some((item) => isActive(pathname, item.href));

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" aria-hidden />
          <nav
            aria-label="More pages"
            className="absolute inset-x-0 bottom-0 rounded-t-xl border-t border-border/60 bg-kv-surface-elevated p-3"
            style={{ paddingBottom: "calc(4.25rem + env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-3 gap-2">
              {MORE.map(({ href, short, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 rounded-lg border py-3 text-xs font-medium",
                    isActive(pathname, href)
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" />
                  {short}
                </Link>
              ))}
            </div>
            <form action={signOut} className="mt-3">
              <button
                type="submit"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border/60 text-sm text-muted-foreground"
              >
                <LogOutIcon className="size-4" /> Sign out
              </button>
            </form>
          </nav>
        </div>
      )}

      <nav
        aria-label="Pages"
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-border/60 bg-kv-surface/95 backdrop-blur-sm md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {TABS.map(({ href, short, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMoreOpen(false)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
              {short}
            </Link>
          );
        })}
        <button
          type="button"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((open) => !open)}
          className={cn(
            "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
            moreActive || moreOpen ? "text-primary" : "text-muted-foreground",
          )}
        >
          {moreOpen ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
          More
        </button>
      </nav>
    </>
  );
}
