'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Type,
  ImageIcon,
  VideoIcon,
  Megaphone,
  Building2,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { signOut } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { BrandSwitcher } from './BrandSwitcher';

const items = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/localize/text', label: 'Text localization', icon: Type },
  { href: '/localize/image', label: 'Image localization', icon: ImageIcon },
  { href: '/localize/video', label: 'Video localization', icon: VideoIcon },
  { href: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/brand-settings', label: 'Brand settings', icon: Building2 },
  { href: '/admin', label: 'Admin', icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <span className="text-sm font-bold">A</span>
        </span>
        <div>
          <p className="text-sm font-semibold leading-tight">Ad Localization</p>
          <p className="text-[11px] text-muted-foreground">
            Localize finished creatives
          </p>
        </div>
      </div>
      <BrandSwitcher />
      <nav className="flex-1 space-y-0.5 p-3">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href as never}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {active ? (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
