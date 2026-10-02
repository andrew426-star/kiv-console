import {
  BotIcon,
  CalendarIcon,
  BuildingIcon,
  FlaskConicalIcon,
  HomeIcon,
  type LucideIcon,
  NewspaperIcon,
  RadarIcon,
  RocketIcon,
  SparklesIcon,
  WalletIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  /** The desktop header's label. */
  label: string;
  /** Shorter, for the phone's tab bar and title. */
  short: string;
  icon: LucideIcon;
  /** On the phone's tab bar itself; the rest sit under More. */
  tab?: boolean;
}

// One list for both navs, so a page added here shows up on desktop and
// phone alike.
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", short: "Home", icon: HomeIcon, tab: true },
  { href: "/launch", label: "Launch", short: "Launch", icon: RocketIcon, tab: true },
  { href: "/company", label: "Company Dashboard", short: "Company", icon: BuildingIcon, tab: true },
  { href: "/calendar", label: "Calendar", short: "Calendar", icon: CalendarIcon, tab: true },
  { href: "/intel", label: "Intel Hub", short: "Intel", icon: NewspaperIcon },
  { href: "/portfolio", label: "Portfolio", short: "Portfolio", icon: WalletIcon },
  { href: "/research", label: "Research", short: "Research", icon: FlaskConicalIcon },
  { href: "/agents", label: "Agents", short: "Agents", icon: BotIcon },
  { href: "/autonomy", label: "Autonomy", short: "Autonomy", icon: RadarIcon },
  { href: "/jarvis", label: "Jarvis", short: "Jarvis", icon: SparklesIcon },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
