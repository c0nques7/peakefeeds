'use client';

import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import styles from '@/app/(dashboard)/dashboard.module.css';

// The trending/channels column only belongs next to feeds. On task pages (messages, settings,
// creating a channel) it would compete with the task, so the main column takes its space.
function showsRightRail(pathname: string) {
  if (pathname === '/home' || pathname === '/discover') return true;
  if (pathname.startsWith('/profile')) return true;
  const channel = pathname.match(/^\/channels\/([^/]+)$/);
  return !!channel && channel[1] !== 'create';
}

export function AppShell({ sidebar, rightRail, mobileNav, children }: {
  sidebar: ReactNode;
  rightRail: ReactNode;
  mobileNav: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const withRail = showsRightRail(pathname);

  return (
    <div className={clsx(styles.layoutContainer, !withRail && styles.noRightRail)}>
      <aside className={styles.desktopSidebar}>{sidebar}</aside>
      <main className={styles.mainContent}>{children}</main>
      {withRail && <aside className={styles.rightSidebar}>{rightRail}</aside>}
      <div className={styles.mobileNavWrapper}>{mobileNav}</div>
    </div>
  );
}
